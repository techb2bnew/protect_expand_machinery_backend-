import Chat from '../../models/Chat.js';
import Message from '../../models/Message.js';
import Ticket from '../../models/Ticket.js';
import User from '../../models/User.js';
import { logActivity } from '../../utils/activityLogger.js';
import { sendPushNotification } from '../../services/pushNotificationService.js';

// Get or create chat for a ticket
export const getOrCreateChat = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userEmail = req.user.email;
    const userRole = req.user.role;

    // Find the ticket
    const ticket = await Ticket.findById(ticketId).populate({
      path: 'customer',
      model: 'User',
      match: { role: 'customer' }
    });
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Find existing chat or create new one
    let chat = await Chat.findOne({ ticketId }).populate('participants.userId');

    if (!chat) {
      // Get user details
      const senderUser = await User.findOne({ email: userEmail });

      if (!senderUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Create new chat with initial participants
      const participants = [{
        userId: senderUser._id,
        userType: userRole,
        userName: senderUser.name,
        userEmail: senderUser.email
      }];

      // Add customer if not already added
      if (userRole !== 'customer') {
        participants.push({
          userId: ticket.customer._id,
          userType: 'customer',
          userName: ticket.customer.name,
          userEmail: ticket.customer.email
        });
      }

      // Add assigned agent if exists
      if (ticket.assignedAgent && userRole !== 'agent') {
        const agent = await User.findById(ticket.assignedAgent);
        if (agent) {
          participants.push({
            userId: agent._id,
            userType: 'agent',
            userName: agent.name,
            userEmail: agent.email
          });
        }
      }

      chat = await Chat.create({
        ticketId,
        participants
      });
    } else {
      // Check if current user is already a participant
      const isParticipant = chat.participants.some(p => p.userEmail === userEmail);

      if (!isParticipant) {
        // Add user to participants
        let senderUser;
        if (userRole === 'customer') {
          senderUser = await User.findOne({ email: userEmail });
        } else {
          senderUser = await User.findOne({ email: userEmail });
        }

        if (senderUser) {
          chat.participants.push({
            userId: senderUser._id,
            userType: userRole,
            userName: senderUser.name,
            userEmail: senderUser.email
          });
          await chat.save();
        }
      }
    }

    res.json({
      success: true,
      data: chat
    });
  } catch (error) {
    console.error('Get or create chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get chat messages
export const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userEmail = req.user.email;

    // Verify user has access to this chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const hasAccess = chat.participants.some(p => p.userEmail === userEmail);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get messages with pagination
    const messages = await Message.find({ chatId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('sender.userId');

    // Mark messages as read for current user
    const user = await User.findOne({ email: userEmail }) || await User.findOne({ email: userEmail });
    if (user) {
      await Message.updateMany(
        {
          chatId,
          'sender.userId': { $ne: user._id },
          'readBy.userId': { $ne: user._id }
        },
        {
          $push: {
            readBy: {
              userId: user._id,
              readAt: new Date()
            }
          }
        }
      );
    }

    res.json({
      success: true,
      data: messages.reverse() // Return in chronological order
    });
  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send message f
export const sendMessage = async (req, res) => {
  try {
    const { chatId, content, messageType = 'text', attachments = [] } = req.body;
    const userEmail = req.user.email;
    const userRole = req.user.role;

    // Get sender details first
    const senderUser = await User.findOne({ email: userEmail });
    if (!senderUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify chat exists and user has access
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const hasAccess = chat.participants.some(p => p.userEmail === userEmail);
    if (!hasAccess) {
      // If agent/manager is not a participant, automatically add them
      if (userRole === 'agent' || userRole === 'manager') {
        // Add agent/manager to participants
        chat.participants.push({
          userId: senderUser._id,
          userType: userRole,
          userName: senderUser.name,
          userEmail: senderUser.email
        });
        await chat.save();
      } else {
        // For non-agent users, deny access if not a participant
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Prevent duplicate messages - check if same message was sent recently (within last 5 seconds)
    const recentMessage = await Message.findOne({
      chatId,
      'sender.userId': senderUser._id,
      content: content.trim(),
      createdAt: { $gte: new Date(Date.now() - 5000) } // Within last 5 seconds
    });

    if (recentMessage) {
      console.log('⚠️ Duplicate message detected, returning existing message');
      await recentMessage.populate('sender.userId');
      return res.json({
        success: true,
        data: recentMessage
      });
    }

    // Check if this is the first message in the chat (excluding system messages)
    const existingMessagesCount = await Message.countDocuments({
      chatId,
      messageType: { $ne: 'infoSystem' }
    });

    // Create message with sender automatically marked as read
    const message = await Message.create({
      chatId,
      ticketId: chat.ticketId,
      sender: {
        userId: senderUser._id,
        userType: userRole,
        userName: senderUser.name,
        userEmail: senderUser.email
      },
      content: content.trim(),
      messageType,
      attachments,
      // Sender automatically reads their own message
      readBy: [{
        userId: senderUser._id,
        readAt: new Date()
      }],
      // isRead will be true only when all participants have read it
      // For now, it's false since sender is the only one who read it
      isRead: false
    });

    // Update chat's last message
    chat.lastMessage = content;
    chat.lastMessageAt = new Date();
    await chat.save();

    // If this is the first message, update ticket status to 'in_progress'
    if (existingMessagesCount === 0 && messageType !== 'infoSystem') {
      const ticket = await Ticket.findById(chat.ticketId);
      if (ticket && ticket.status !== 'closed') {
        ticket.status = 'in_progress';

        // If agent sends the first message, assign the ticket to that agent
        if (userRole === 'agent' && !ticket.assignedAgent) {
          ticket.assignedAgent = senderUser._id;
        }

        await ticket.save();
      }
    }

    // If this is the agent's first message on this ticket, log activity
    if (userRole === 'agent') {
      const agentPrevCount = await Message.countDocuments({
        chatId,
        'sender.userId': senderUser._id
      });
      if (agentPrevCount === 1) { // includes the one we just created
        try {
          const ticketDoc = await Ticket.findById(chat.ticketId).select('ticketNumber');
          const ticketDisplay = ticketDoc?.ticketNumber || chat.ticketId;
          await logActivity(req, {
            message: `Ticket ${ticketDisplay} first message by ${senderUser.name} and Message: ${content}`,
            status: 'updated'
          });
        } catch (e) {
          // ignore logging errors
        }
      }
    }
    // Populate sender details
    await message.populate('sender.userId');

    // Send Firebase push notification to other participants (skip for system messages)
    if (messageType !== 'infoSystem') {
      try {
        const senderIdStr = String(senderUser._id);
        const participantIds = chat.participants
          .filter(p => String(p.userId) !== senderIdStr && (!p.status || p.status === 'active'))
          .map(p => p.userId);

        // Filter out manager role users from recipients
        if (participantIds.length > 0) {
          const participants = await User.find({ _id: { $in: participantIds } }).select('role').lean();
          const recipientIds = participants
            .filter(user => user.role !== 'manager')
            .map(user => user._id);

          if (recipientIds.length > 0) {
            const ticket = await Ticket.findById(chat.ticketId).select('ticketNumber').lean();
            const ticketNumber = ticket?.ticketNumber || 'Ticket';

            // Notification title format: "Sender name" replied to [Ticket ID]
            const notificationTitle = `"${senderUser.name}" replied to ${ticketNumber}`;

            // Send notification to each recipient with their unread message count
            await Promise.all(
              recipientIds.map(async (recipientId) => {
                // Count unread messages for this recipient in this chat
                const unreadCount = await Message.countDocuments({
                  chatId: chatId,
                  'sender.userId': { $ne: recipientId },
                  $or: [
                    { readBy: { $exists: false } },
                    { readBy: { $size: 0 } },
                    { 'readBy.userId': { $ne: recipientId } }
                  ]
                });

                await sendPushNotification({
                  title: notificationTitle,
                  body: content.length > 100 ? content.substring(0, 100) + '...' : content,
                  data: {
                    type: 'chat_message',
                    chatId: chatId.toString(),
                    ticketId: chat.ticketId?.toString() || '',
                    senderId: senderUser._id.toString(),
                    senderName: senderUser.name || '',
                    senderRole: userRole || '',
                    badge: unreadCount.toString(),
                  },
                  userIds: [recipientId],
                });
              })
            );
            console.log('📱 Push notification sent for chat message');
          }
        }
      } catch (pushError) {
        console.error('Failed to send push notification for chat message:', pushError);
        // Don't fail the request if push notification fails
      }
    }

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's chats
export const getUserChatsLists = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const userRole = req.user.role;

    // Get user
    let user;
    if (userRole === 'customer') {
      user = await User.findOne({ _id: userId });
    } else {
      user = await User.findOne({ _id: userId });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get chats where user is a participant
    const chats = await Chat.find({
      'participants.userEmail': userEmail,
      isActive: true
    })
      .populate({ path: 'ticketId', select: 'ticketNumber description status createdAt updatedAt isArchived' })
      .sort({ lastMessageAt: -1 });

    res.json({
      success: true,
      message: 'Chats fetched successfully',
      data: chats
    });
  } catch (error) {
    console.error('Get user chats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


export const getChatDetailsForAgent = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userEmail = req.user.email;
    const userRole = req.user.role;

    const ticket = await Ticket.findById(ticketId).populate({
      path: 'customer',
      model: 'User',
      match: { role: 'customer' }
    }).populate('assignedAgent');
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Find existing chat or create new one


    let chat = await Chat.findOne({ ticketId: ticketId }).populate('participants.userId');

    if (!chat) {
      // Get user details
      const senderUser = await User.findOne({ email: userEmail });

      if (!senderUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Create new chat with initial participants
      const participants = [{
        userId: senderUser._id,
        userType: userRole,
        userName: senderUser.name,
        userEmail: senderUser.email
      }];

      // Add customer if not already added
      if (userRole !== 'customer') {
        participants.push({
          userId: ticket.customer._id,
          userType: 'customer',
          userName: ticket.customer.name,
          userEmail: ticket.customer.email
        });
      }

      // Add assigned agent if exists
      if (ticket.assignedAgent && userRole !== 'agent') {
        const agent = await User.findById(ticket.assignedAgent);
        if (agent) {
          participants.push({
            userId: agent._id,
            userType: 'agent',
            userName: agent.name,
            userEmail: agent.email
          });
        }
      }

      chat = await Chat.create({
        ticketId,
        participants
      });
    } else {
      // Chat exists - ensure current agent is a participant
      const isParticipant = chat.participants.some(p => p.userEmail === userEmail);

      if (!isParticipant) {
        // Add current agent to participants if not already added
        const senderUser = await User.findOne({ email: userEmail });

        if (senderUser) {
          chat.participants.push({
            userId: senderUser._id,
            userType: userRole,
            userName: senderUser.name,
            userEmail: senderUser.email
          });
          await chat.save();
        }
      }
    }
    let messages = await Message.find({ chatId: chat._id })
      .sort({ createdAt: 1 })
      .populate('sender.userId');
    res.json({
      success: true,
      data: {
        chat,
        ticket,
        messages,
      },
    });
  } catch (error) {
    console.error('Get or create chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark all messages as read for agent
export const readAllMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userEmail = req.user.email;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const hasAccess = chat.participants.some(p => p.userEmail === userEmail);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await Message.updateMany(
      {
        chatId,
        'sender.userId': { $ne: user._id },
        'readBy.userId': { $ne: user._id }
      },
      {
        $set: { isRead: true },
        $push: {
          readBy: {
            userId: user._id,
            readAt: new Date()
          }
        }
      }
    );

    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('Read all messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
