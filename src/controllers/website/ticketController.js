import Ticket from '../../models/Ticket.js';
import User from '../../models/User.js';
import Chat from '../../models/Chat.js';
import Message from '../../models/Message.js';
import Category from '../../models/Category.js';
import Equipment from '../../models/Equipment.js';
import Notification from '../../models/Notification.js';
import mongoose from 'mongoose';
import { getIO } from '../../socket/index.js';
import { logActivity } from '../../utils/activityLogger.js';
import { sendTicketCreationEmail, sendTicketAdminNotify, sendTicketSupportTypeEmail, sendTicketUpdateStatusEmail, sendTicketStatusChangeAdminEmail, sendTicketAssignmentEmail } from '../../utils/emailService.js';
import { sendPushNotification } from '../../services/pushNotificationService.js';

export const getTickets = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'manager') {
      return res.json({ success: true, tickets: [] });
    }

    // 1️⃣ Fetch all tickets
    const tickets = await Ticket.find()
      .populate('categoryId')
      .populate('equipmentId')
      .populate('assignedAgent')
      .populate({
        path: 'customer',
        model: 'User',
        match: { role: 'customer' }
      });

    // 2️⃣ Collect UNIQUE categoryIds
    const categoryIds = [
      ...new Set(
        tickets
          .map(t => t.categoryId?._id?.toString())
          .filter(Boolean)
      )
    ];

    // 3️⃣ Fetch ALL agents in ONE QUERY
    const agents = await User.find({
      role: 'agent',
      isDeleted: false,
      isActive: true,
      categoryIds: { $in: categoryIds }
    }).select('_id name email phone categoryIds');

    // 4️⃣ Group agents by categoryId
    const agentsByCategory = {};
    for (const agent of agents) {
      for (const catId of agent.categoryIds) {
        const key = catId.toString();
        if (!agentsByCategory[key]) {
          agentsByCategory[key] = [];
        }
        agentsByCategory[key].push(agent);
      }
    }

    // 5️⃣ Attach agents to tickets
    const ticketsWithCustomers = tickets.map(ticket => ({
      ...ticket.toObject(),
      customerslist: agentsByCategory[ticket.categoryId?._id?.toString()] || []
    }));

    return res.json({
      success: true,
      total: ticketsWithCustomers.length,
      tickets: ticketsWithCustomers
    });

  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ message: 'Get ticket error' });
  }
};


export const getTicket = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ message: 'Invalid ticket ID format' });
    }


    const ticket = await Ticket.findOne({ _id: id })
      .populate({
        path: 'customer',
        model: 'User',
        match: { role: 'customer' }
      })
      .populate('assignedAgent')
      .populate('categoryId')
      .populate('equipmentId');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    res.json({ ticket });
  } catch (error) {
    res.status(500).json({ message: 'Get ticket error' });
  }
};



export const assignTicket = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ message: 'Invalid ticket ID format' });
    }
    const { agentId } = req.body;
    const ticket = await Ticket.findById(id).populate('customer');
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
  // Block assignment change if ticket is closed
  if (ticket.status === 'closed') {
    return res.status(400).json({
      success: false,
      message: 'Ticket is closed. Assigned agent cannot be changed.'
    });
  }
    const agent = await User.findOne({ _id: agentId, role: 'agent' });
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Get customer data for email
    const customer = ticket.customer ? await User.findById(ticket.customer) : null;

    ticket.assignedAgent = agent._id;

    await ticket.save();

    const chatfind = await Chat.findOne({ ticketId: id });

    let previousActiveAgent = null;
    if (chatfind) {
      // Find the previous active agent before making changes
      previousActiveAgent = chatfind.participants.find(p => p.userType === 'agent' && p.status === 'active');

      // First, mark ALL existing agents as 'old'
      chatfind.participants.forEach(participant => {
        if (participant.userType === 'agent') {
          participant.status = 'old';
          participant.updatedAt = new Date();
        }
      });

      const existingParticipant = chatfind.participants.find(p => p.userId.toString() === agent._id.toString());

      if (existingParticipant) {
        existingParticipant.status = 'active';
        existingParticipant.updatedAt = new Date();
        existingParticipant.userName = agent.name;
        existingParticipant.userEmail = agent.email;
      } else {
        chatfind.participants.push({
          userId: agent._id,
          userName: agent.name,
          userType: agent.role,
          userEmail: agent.email,
          status: 'active',
          joinedAt: new Date()
        });
      }

      await chatfind.save();

      // Create a system message about agent assignment change
      if (previousActiveAgent && previousActiveAgent.userId.toString() !== agent._id.toString()) {
        try {
          // Get the user who is making the assignment change (from request)
          const currentUser = await User.findOne({ email: req.user.email });

          const systemMessage = await Message.create({
            chatId: chatfind._id,
            ticketId: id,
            sender: {
              userId: currentUser._id,
              userName: currentUser.name,
              userEmail: currentUser.email,
              userType: currentUser.role
            },
            content: `Agent changed from ${previousActiveAgent.userName} to ${agent.name}`,
            messageType: 'infoSystem',
            isRead: false,
            readBy: []
          });

          // Update chat's last message
          chatfind.lastMessage = systemMessage.content;
          chatfind.lastMessageAt = new Date();
          await chatfind.save();

          // Emit system message via socket for real-time update
          try {
            const io = getIO();
            io.to(`ticket_${id}`).emit('new_message', systemMessage);
            console.log(`System message emitted to ticket_${id}:`, systemMessage.content);
          } catch (socketError) {
            console.error('Failed to emit system message via socket:', socketError);
          }
        } catch (messageError) {
          console.error('Failed to create system message for agent assignment:', messageError);
        }
      }
    }

    // Activity log for assignment/change
    try {
      const ticketDisplay = ticket.ticketNumber ? ticket.ticketNumber : ticket._id;
      if (previousActiveAgent && previousActiveAgent.userId.toString() !== agent._id.toString()) {
        await logActivity(req, {
          message: `Ticket ${ticketDisplay} agent changed from ${previousActiveAgent.userName} to ${agent.name}`,
          status: 'updated'
        });
      } else {
        await logActivity(req, {
          message: `Ticket ${ticketDisplay} assigned to ${agent.name}`,
          status: 'updated'
        });
      }
    } catch (e) {
      // ignore logging errors
    }

    // Create notification for ticket assignment
    try {
      const ticketDisplay = ticket.ticketNumber || ticket._id;
      const notificationMessage = previousActiveAgent && previousActiveAgent.userId.toString() !== agent._id.toString()
        ? `Ticket #${ticketDisplay} agent changed from ${previousActiveAgent.userName} to ${agent.name}`
        : `Ticket #${ticketDisplay} has been assigned to ${agent.name}`;

      // Notification for manager/admin who assigned the ticket
      await Notification.create({
        title: 'Ticket Assigned',
        message: notificationMessage,
        type: 'info',
        category: 'ticket',
        userId: req.user?.id || req.user?._id, // Assuming req.user is available from auth middleware
        metadata: {
          ticketId: ticket._id,
          ticketNumber: ticketDisplay,
          agentId: agent._id,
          agentName: agent.name,
          action: previousActiveAgent ? 'reassigned' : 'assigned',
          previousAgentId: previousActiveAgent ? previousActiveAgent.userId : null,
          previousAgentName: previousActiveAgent ? previousActiveAgent.userName : null
        }
      });
      console.log('📧 Notification created for ticket assignment (manager)');

      // Notification for assigned agent
      await Notification.create({
        title: 'New Ticket Assigned',
        message: `Ticket #${ticketDisplay} has been assigned to you.`,
        type: 'info',
        category: 'ticket',
        userId: agent._id,
        metadata: {
          ticketId: ticket._id,
          ticketNumber: ticketDisplay,
          agentId: agent._id,
          agentName: agent.name,
          action: 'assigned_to_me'
        }
      });
      console.log('📧 Notification created for assigned agent');
    } catch (notificationError) {
      console.error('Failed to create notification for ticket assignment:', notificationError);
    }

    // Send push notifications for ticket assignment
    try {
      const ticketDisplay = ticket.ticketNumber || ticket._id;

      // 1. Notify the assigned agent
      await sendPushNotification({
        title: 'New Ticket Assigned',
        body: `Ticket #${ticketDisplay} has been assigned to you.`,
        data: {
          type: 'ticket_assigned',
          ticketId: ticket._id.toString(),
          ticketNumber: ticketDisplay,
        },
        userIds: [agent._id],
      });
      console.log('📱 Push notification sent to agent for ticket assignment');

      // 2. Notify the customer about agent assignment
      if (ticket.customer) {
        await sendPushNotification({
          title: 'Agent Assigned to Your Ticket',
          body: `${agent.name} has been assigned to your ticket #${ticketDisplay}.`,
          data: {
            type: 'agent_assigned',
            ticketId: ticket._id.toString(),
            ticketNumber: ticketDisplay,
            agentName: agent.name,
          },
          userIds: [ticket.customer],
        });
        console.log('📱 Push notification sent to customer for agent assignment');
      }
    } catch (pushError) {
      console.error('Failed to send push notifications for ticket assignment:', pushError);
    }

    // Send email to assigned agent
    try {
      if (customer) {
        const emailResult = await sendTicketAssignmentEmail(ticket, agent, customer);
        if (emailResult && emailResult.success) {
          console.log('✅ Ticket assignment email sent successfully to agent:', agent.email);
        } else {
          console.error('❌ Failed to send ticket assignment email. Result:', emailResult);
          if (emailResult && emailResult.error) {
            console.error('Email error details:', emailResult.error);
          }
        }
      } else {
        console.warn('⚠️ Customer not found for ticket, skipping assignment email');
      }
    } catch (emailError) {
      console.error('❌ Exception while sending ticket assignment email to agent:', emailError);
      console.error('Error stack:', emailError.stack);
    }

    res.json({ message: 'Ticket assigned successfully', ticket });
  } catch (error) {
    console.error('Assign ticket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};




export const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const { status } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Handle reopen status - keep status as reopen
    let finalStatus = status;
    if (status === 'reopen' && ticket.status === 'closed') {
      ticket.status = 'reopen';
      finalStatus = 'reopen';
    } else if (ticket.status === 'closed' && status !== 'reopen') {
      // Do not allow status change if ticket is already closed (except for reopen)
      return res.status(400).json({
        success: false,
        message: 'Ticket is already closed. Status cannot be changed.'
      });
    } else if (status) {
      ticket.status = status;
    }

    await ticket.save();

    await logActivity(req, {
      message: `Ticket ${ticket.ticketNumber || ticket._id} status changed to ${finalStatus}`,
      status: 'updated'
    });

    // Send push notification to customer about status change
    try {
      const ticketDisplay = ticket.ticketNumber || ticket._id;
      const statusMessages = {
        'pending': 'Your ticket is now pending review.',
        'in_progress': 'Your ticket is now being worked on.',
        'resolved': 'Your ticket has been resolved.',
        'closed': 'Your ticket has been closed.',
        'reopen': 'Your ticket has been reopened.'
      };

      const notificationRecipients = [];
      
      // Notify customer
      if (ticket.customer) {
        notificationRecipients.push(ticket.customer);
      }

      // Notify assigned agent
      if (ticket.assignedAgent) {
        notificationRecipients.push(ticket.assignedAgent);
      }

      

      const customerdata = await User.findById(ticket.customer);
      
      // Get user who made the change
      const changedByUser = await User.findOne({ email: req.user.email }).select('name');
      
      // Send email to customer
      const emailResults = await sendTicketUpdateStatusEmail(ticket, customerdata);
      console.log('Email sending results:', emailResults);
      
      // Send email to admin about status change
      try {
        await sendTicketStatusChangeAdminEmail(ticket, customerdata, changedByUser);
      } catch (adminEmailError) {
        console.error('Failed to send admin status change email:', adminEmailError);
      }


      if (notificationRecipients.length > 0) {
        await sendPushNotification({
          title: `Ticket Status Updated - #${ticketDisplay}`,
          body: statusMessages[finalStatus] || `Ticket status changed to ${finalStatus}.`,
          data: {
            type: 'ticket_status_updated',
            ticketId: ticket._id.toString(),
            ticketNumber: ticketDisplay,
            newStatus: finalStatus,
          },
          userIds: notificationRecipients,
        });
        console.log('📱 Push notification sent for ticket status update');
      }
    } catch (pushError) {
      console.error('Failed to send push notification for status update:', pushError);
    }
    
    res.json({ message: 'Ticket updated successfully2222', ticket });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateTicketNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    if (notes === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Notes field is required'
      });
    }

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    const newNote = String(notes || '').trim();
    if (!newNote) {
      return res.status(400).json({
        success: false,
        message: 'Notes cannot be empty'
      });
    }

    // Ensure notes is always an array (backward compatibility if it was stored as string)
    if (!Array.isArray(ticket.notes)) {
      const existing = ticket.notes;
      if (typeof existing === 'string' && existing.trim().length > 0) {
        ticket.notes = [existing];
      } else {
        ticket.notes = [];
      }
    }

    // Append new note block (with timestamp header) as a separate array item
    const now = new Date();
    const header = `[${now.toISOString()}]`;
    const noteBlock = `${header}\n${newNote}`;
    ticket.notes.push(noteBlock);
    await ticket.save();

    // Activity log for notes update
    await logActivity(req, {
      message: `Ticket ${ticket.ticketNumber || ticket._id} notes updated`,
      status: 'updated'
    });

    res.json({
      success: true,
      message: 'Ticket notes updated successfully',
      ticket
    });
  } catch (error) {
    console.error('Update ticket notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const createTicket = async (req, res) => {
  try {
    // Check if user is manager
    const userEmail = req.user.email;
    const currentUser = await User.findOne({ email: userEmail });
    if (!currentUser || currentUser.role !== 'manager') {
      return res.status(403).json({ message: 'Only managers can create tickets on behalf of customers' });
    }

    let { description, categoryId, equipmentId, customerId, serialNumber, control, support_type } = req.body;

    // Validate required fields
    if (!description || !categoryId || !customerId) {
      return res.status(400).json({
        success: false,
        message: 'Description, categoryId, and customerId are required'
      });
    }

    if (equipmentId === '' || equipmentId === undefined) {
      equipmentId = null;
    }

    // Validate customer exists
    const customer = await User.findById(customerId);
    if (!customer || customer.role !== 'customer') {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Validate categoryId format and exists in database
    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid categoryId format - Must be a valid ObjectId'
        });
      }

      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Invalid categoryId - Category not found'
        });
      }
    }

    // Validate equipmentId format and exists in database
    if (equipmentId) {
      if (!mongoose.Types.ObjectId.isValid(equipmentId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid equipmentId format - Must be a valid ObjectId'
        });
      }

      const equipment = await Equipment.findById(equipmentId);
      if (!equipment) {
        return res.status(400).json({
          success: false,
          message: 'Invalid equipmentId - Equipment not found'
        });
      }
    }

    // Handle multiple image uploads
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => `/uploads/attachments/${file.filename}`);
    }

    const ticket = await Ticket.create({
      description,
      status: 'pending',
      customer: customer._id,
      categoryId,
      equipmentId,
      serialNumber: serialNumber || undefined,
      control,
      support_type,
      attachments: attachments
    });

    // Activity log: ticket created
    await logActivity(req, {
      message: `New ticket ${ticket.ticketNumber || ticket._id} created for customer ${customer.name}`,
      status: 'added'
    });

    // Create notifications for customer, admin, and agents
    const notifications = [];

    // 1. Notification for customer
    notifications.push({
      title: 'Ticket Created',
      message: `A support ticket ${ticket.ticketNumber} has been created on your behalf and is now pending.`,
      type: 'success',
      category: 'ticket',
      userId: String(customer._id),
      metadata: {
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        customerName: customer.name
      }
    });

    // 2. Notifications for all managers/admins
    const managers = await User.find({ role: 'manager', isActive: true });
    managers.forEach(manager => {
      if (String(manager._id) !== String(currentUser._id)) {
        notifications.push({
          title: 'New Ticket Created',
          message: `Ticket ${ticket.ticketNumber} has been created for customer ${customer.name} by ${currentUser.name}.`,
          type: 'info',
          category: 'ticket',
          userId: String(manager._id),
          metadata: {
            ticketId: ticket._id,
            ticketNumber: ticket.ticketNumber,
            customerName: customer.name
          }
        });
      }
    });

    // 3. Notifications for agents in the category
    let categoryAgents = [];
    if (categoryId) {
      const category = await Category.findById(categoryId);
      if (category) {
        // Find agents that have this category in their categoryIds
        categoryAgents = await User.find({
          role: 'agent',
          categoryIds: categoryId,
          isActive: true
        });
        
        categoryAgents.forEach(agent => {
          notifications.push({
            title: 'New Ticket Assigned to Your Category',
            message: `A new ticket ${ticket.ticketNumber} has been created in category ${category.name}.`,
            type: 'info',
            category: 'ticket',
            userId: String(agent._id),
            metadata: {
              ticketId: ticket._id,
              ticketNumber: ticket.ticketNumber,
              customerName: customer.name
            }
          });
        });
      }
    }

    // Create all notifications
    await Notification.insertMany(notifications);

    // Send Firebase push notifications
    try {
      // 1. Push notification to customer
      await sendPushNotification({
        title: 'Ticket Created on Your Behalf',
        body: `A support ticket #${ticket.ticketNumber} has been created for you and is now pending.`,
        data: {
          type: 'ticket_created_by_manager',
          ticketId: ticket._id.toString(),
          ticketNumber: ticket.ticketNumber,
        },
        userIds: [customer._id],
      });
      console.log('📱 Push notification sent to customer for ticket creation');

      // 2. Push notification to managers
      const managerIds = managers.filter(m => String(m._id) !== String(currentUser._id)).map(m => m._id);
      if (managerIds.length > 0) {
        await sendPushNotification({
          title: 'New Ticket Created',
          body: `Ticket #${ticket.ticketNumber} created for ${customer.name} by ${currentUser.name}`,
          data: {
            type: 'new_ticket_manager',
            ticketId: ticket._id.toString(),
            ticketNumber: ticket.ticketNumber,
            customerName: customer.name,
          },
          userIds: managerIds,
        });
        console.log('📱 Push notification sent to managers for new ticket');
      }

      // 3. Push notification to category agents
      if (categoryAgents.length > 0) {
        const agentIds = categoryAgents.map(a => a._id);
        await sendPushNotification({
          title: 'New Ticket in Your Category',
          body: `New ticket #${ticket.ticketNumber} has been created in your category.`,
          data: {
            type: 'new_ticket_category',
            ticketId: ticket._id.toString(),
            ticketNumber: ticket.ticketNumber,
            customerName: customer.name,
          },
          userIds: agentIds,
        });
        console.log('📱 Push notification sent to agents for new ticket');
      }
    } catch (pushError) {
      console.error('Failed to send push notifications for ticket creation:', pushError);
    }

    // Send emails to customer, agents and admins
    try {
      const emailResults = await sendTicketCreationEmail(ticket, customer, [], categoryAgents || []);
      await sendTicketAdminNotify(ticket, customer);
      // Send email based on support_type
      if (ticket.support_type) {
        await sendTicketSupportTypeEmail(ticket, customer);
      }
      console.log('Email sending results:', emailResults);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the ticket creation if email fails
    }

    // Populate ticket before returning
    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('customer')
      .populate('categoryId')
      .populate('equipmentId')
      .populate('assignedAgent');

    res.status(201).json({ message: 'Ticket created successfully', ticket: populatedTicket });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

