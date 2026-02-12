import Ticket from '../../models/Ticket.js';
import Message from '../../models/Message.js';
import User from '../../models/User.js';
import { logActivity } from '../../utils/activityLogger.js';
import { sendPushNotification } from '../../services/pushNotificationService.js';

export const getSupportInbox = async (req, res) => {
  try {
    const customerId = req.user.id;
    const {
      page = 1,
      limit = 10,
      filter = 'all',
      search = ''
    } = req.query;

    let query = { customer: customerId };

    if (filter === 'archived') {
      query.isArchived = true;
    } else if (filter === 'active') {
      query.isArchived = { $ne: true };
    }

    if (search) {
      const searchConditions = [
        { ticketNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { status: { $regex: search, $options: 'i' } }
      ];

      const matchingUsers = await User.find({
        name: { $regex: search, $options: 'i' },
        role: 'customer'
      }).select('_id');

      if (matchingUsers.length > 0) {
        const customerIds = matchingUsers.map(user => user._id);
        searchConditions.push({ customer: { $in: customerIds } });
      }

      query.$or = searchConditions;
    }

    const pageNum = Math.max(parseInt(page), 1);
    const limitNum = Math.min(Math.max(parseInt(limit), 1), 50);
    const skip = (pageNum - 1) * limitNum;

    const [tickets, totalTickets] = await Promise.all([
      Ticket.find(query)
        .select('description status ticketNumber assignedAgent isReadTicket createdAt isArchived')
        .populate({
          path: 'assignedAgent',
          select: 'name email'
        })
        .populate({
          path: 'categoryId',
          select: 'name'
        })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Ticket.countDocuments(query),
    ]);

    const getTicketTitleAndDescription = (ticket, latestMessage) => {
      const status = ticket.status;
      const ticketNumber = ticket.ticketNumber;

      let title = '';
      let description = '';

      if (latestMessage && !latestMessage.isRead) {
        title = 'New Response on Your Ticket';
        description = 'You have received a new message from our support team regarding your request.';
      } else {
        switch (status) {
          case 'in_progress':
            title = `Update on Your Support Ticket #${ticketNumber}`;
            description = 'The status of your ticket has been changed to In Progress. A specialist is now working on your request.';
            break;
          case 'resolved':
            title = `Update on Your Support Ticket #${ticketNumber}`;
            description = 'The status of your ticket has been changed to Resolved.';
            break;
          case 'closed':
            title = `Update on Your Support Ticket #${ticketNumber}`;
            description = 'The status of your ticket has been changed to Closed.';
            break;
          case 'pending':
          default:
            title = `Update on Your Support Ticket #${ticketNumber}`;
            description = 'The status of your ticket has been changed to Pending.';
            break;
        }
      }

      return { title, description };
    };

    const ticketsWithMessages = await Promise.all(
      tickets.map(async (ticket) => {
        const messageQuery = { ticketId: ticket._id };

        const latestMessage = await Message.findOne(messageQuery)
          .select('content createdAt isRead readBy')
          .sort({ createdAt: -1 })
          .limit(1);

        let timeAgo = null;

        if (latestMessage) {
          const now = new Date();
          const messageTime = new Date(latestMessage.createdAt);
          const diffInMs = now - messageTime;
          const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
          const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
          const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

          if (diffInMinutes < 1) {
            timeAgo = 'Just now';
          } else if (diffInMinutes < 60) {
            timeAgo = `${diffInMinutes} min ago`;
          } else if (diffInHours < 24) {
            timeAgo = `${diffInHours} hr ago`;
          } else if (diffInDays < 7) {
            timeAgo = `${diffInDays} day ago`;
          } else {
            timeAgo = messageTime.toLocaleDateString();
          }
        }

        const { title, description } = getTicketTitleAndDescription(ticket, latestMessage);

        let isReadByCustomer = false;
        if (latestMessage) {
          const hasReadMessage = latestMessage.readBy && 
            latestMessage.readBy.some(readEntry => 
              readEntry.userId && readEntry.userId.toString() === customerId.toString()
            );
          isReadByCustomer = latestMessage.isRead || hasReadMessage;
        } else {
          isReadByCustomer = ticket.isReadTicket || false;
        }


        const unreadCount = await Message.countDocuments({
          ticketId: ticket._id,
          'sender.userId': { $ne: customerId },
          $or: [
            { readBy: { $exists: false } },
            { readBy: { $size: 0 } },
            { 'readBy.userId': { $ne: customerId } }
          ]
        });

        return {
          ...ticket.toObject(),
          title,
          description,
          lastMessageTime: timeAgo,
          lastMessage: latestMessage ? latestMessage.content : null,
          isRead: isReadByCustomer,
          latestMessage: latestMessage,
          unreadMessageCount: unreadCount
        };
      })
    );

    // Filter out tickets that don't have messages matching the filter criteria
    let filteredTickets = ticketsWithMessages;
    if (filter === 'unread') {
      filteredTickets = ticketsWithMessages.filter(ticket => !ticket.isRead && !ticket.isArchived);
    }

    // Get counts for different filters
    const [activeCount, archivedCount] = await Promise.all([
      Ticket.countDocuments({ customer: customerId, isArchived: { $ne: true } }),
      Ticket.countDocuments({ customer: customerId, isArchived: true })
    ]);

    const totalItems = filter === 'unread' ? filteredTickets.length : totalTickets;

    res.json({
      success: true,
      data: {
        conversations: filteredTickets,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalItems / limitNum) || 1,
          totalItems,
          itemsPerPage: limitNum
        },
        counts: {
          total: activeCount + archivedCount,
          active: activeCount,
          archived: archivedCount,
        }
      }
    });

  } catch (error) {
    console.error('Get support inbox error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching support inbox'
    });
  }
};

// Mark conversation as read
export const markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const customerId = req.user.id;

    const message = await Message.findOneAndUpdate(
      { _id: messageId },
      {
        $addToSet: {
          readBy: {
            userId: customerId,
            readAt: new Date()
          }
        },
        $set: { isRead: true }
      },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found or you do not have permission'
      });
    }

    res.json({
      success: true,
      message: 'Message marked as read',
      data: message
    });



  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking as read'
    });
  }
};

// Archive conversation
export const toggleArchiveConversation = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const customerId = req.user.id;

    // First get the current ticket to check its archive status
    const currentTicket = await Ticket.findOne({ _id: ticketId, customer: customerId });

    if (!currentTicket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found or you do not have permission'
      });
    }

    // Toggle the archive status
    const newArchiveStatus = !currentTicket.isArchived;

    const ticket = await Ticket.findOneAndUpdate(
      { _id: ticketId, customer: customerId },
      { isArchived: newArchiveStatus },
      { new: true }
    );

    const action = newArchiveStatus ? 'archived' : 'unarchived';

    // Send Firebase push notification for archive action
    try {
      await sendPushNotification({
        title: newArchiveStatus ? 'Conversation Archived' : 'Conversation Restored',
        body: newArchiveStatus 
          ? `Ticket #${ticket.ticketNumber || ticketId} has been moved to archive.`
          : `Ticket #${ticket.ticketNumber || ticketId} has been restored from archive.`,
        data: {
          type: 'conversation_archive_toggle',
          ticketId: ticketId.toString(),
          ticketNumber: ticket.ticketNumber || '',
          isArchived: String(newArchiveStatus),
        },
        userIds: [customerId],
      });
      console.log(`📱 Push notification sent for conversation ${action}`);
    } catch (pushError) {
      console.error('Failed to send archive toggle push notification:', pushError);
    }

    res.json({
      success: true,
      message: `Conversation ${action} successfully`,
      data: ticket
    });

    // Activity log: conversation archived/unarchived
    await logActivity(req, {
      message: `Conversation ${(ticket && (ticket.ticketNumber || ticket._id)) || ticketId} ${action}`,
      status: 'updated'
    });

  } catch (error) {
    console.error('Toggle archive conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while toggling archive status'
    });
  }
};


// Get conversation details with messages
export const getConversationDetails = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const customerId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    // Verify ticket belongs to customer
    const ticket = await Ticket.findOne({ _id: ticketId, customer: customerId })
      .populate({
        path: 'customer',
        select: 'name email'
      })
      .populate({
        path: 'assignedAgent',
        select: 'name email'
      })
      .populate('categoryId')
      .populate('equipmentId');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or you do not have permission'
      });
    }

    // Get messages with pagination
    const pageNum = Math.max(parseInt(page), 1);
    const limitNum = Math.min(Math.max(parseInt(limit), 1), 50);
    const skip = (pageNum - 1) * limitNum;

    const [messages, totalMessages] = await Promise.all([
      Message.find({ ticketId })
        .populate({
          path: 'sender',
          select: 'name email role'
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Message.countDocuments({ ticketId })
    ]);

    // Mark ticket as read when viewing details
    await Ticket.findByIdAndUpdate(ticketId, { isRead: true });

    res.json({
      success: true,
      data: {
        ticket,
        messages: messages.reverse(), // Show oldest first
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalMessages / limitNum),
          totalMessages,
          itemsPerPage: limitNum
        }
      }
    });


  } catch (error) {
    console.error('Get conversation details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching conversation details'
    });
  }
};
