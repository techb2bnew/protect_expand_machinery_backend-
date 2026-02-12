import Chat from '../../models/Chat.js';
import Message from '../../models/Message.js';
import Ticket from '../../models/Ticket.js';
import User from '../../models/User.js';
import { sendPushNotification } from '../../services/pushNotificationService.js';

// Get or create chat for a ticket (App version - Customer only)
export const getOrCreateChat = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userEmail = req.user.email;

    // Find the ticket
    const ticket = await Ticket.findById(ticketId).populate({
      path: 'customer',
      model: 'User',
      match: { role: 'customer' }
    });
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check if customer has access to this ticket
    if (ticket.customer.email !== userEmail) {
      return res.status(403).json({ message: 'Access denied to this ticket' });
    }

    // Find existing chat or create new one
    let chat = await Chat.findOne({ ticketId }).populate('participants.userId');

    if (!chat) {
      // Get customer details
      const customer = await User.findOne({ email: userEmail });
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }

      // Create new chat with initial participants
      const participants = [{
        userId: customer._id,
        userType: 'customer',
        userName: customer.name,
        userEmail: customer.email
      }];

      // Add assigned agent if exists
      if (ticket.assignedAgent) {
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
      // Check if current customer is already a participant
      const isParticipant = chat.participants.some(p => p.userEmail === userEmail);

      if (!isParticipant) {
        // Add customer to participants
        const customer = await User.findOne({ email: userEmail });
        if (customer) {
          chat.participants.push({
            userId: customer._id,
            userType: 'customer',
            userName: customer.name,
            userEmail: customer.email
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

// Get chat messages (App version - Customer only)
export const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userEmail = req.user.email;

    // Verify customer has access to this chat
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

    // Mark messages as read for current customer
    const customer = await User.findOne({ email: userEmail });
    if (customer) {
      await Message.updateMany(
        {
          chatId,
          'sender.userId': { $ne: customer._id },
          'readBy.userId': { $ne: customer._id }
        },
        {
          $push: {
            readBy: {
              userId: customer._id,
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

// Send message (App version - Customer only)
export const sendMessage = async (req, res) => {
  try {
    const { chatId, content, messageType = 'text', attachments = [] } = req.body;
    const userEmail = req.user.email;

    // Get customer details first
    const customer = await User.findOne({ email: userEmail });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Verify chat exists and customer has access
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const hasAccess = chat.participants.some(p => p.userEmail === userEmail);
    if (!hasAccess) {
      // If customer is not a participant, check if they own the ticket
      const ticket = await Ticket.findById(chat.ticketId);
      if (ticket && ticket.customer && String(ticket.customer) === String(customer._id)) {
        // Customer owns the ticket, auto-add them to participants
        chat.participants.push({
          userId: customer._id,
          userType: 'customer',
          userName: customer.name,
          userEmail: customer.email
        });
        await chat.save();
      } else {
        // Customer doesn't own the ticket and is not a participant
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Create message
    const message = await Message.create({
      chatId,
      ticketId: chat.ticketId,
      sender: {
        userId: customer._id,
        userType: 'customer',
        userName: customer.name,
        userEmail: customer.email
      },
      readBy: {
        userId: customer._id,
        readAt: new Date()
      },
      content,
      messageType,
      attachments
    });

    // Update chat's last message
    chat.lastMessage = content;
    chat.lastMessageAt = new Date();
    await chat.save();

    // Send Firebase push notification to other participants (skip for system messages)
    if (messageType !== 'infoSystem') {
      try {
        const senderIdStr = String(customer._id);
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
            const notificationTitle = `"${customer.name}" replied to ${ticketNumber}`;

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
                    senderId: customer._id.toString(),
                    senderName: customer.name || '',
                    senderRole: 'customer',
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

    // Populate sender details
    await message.populate('sender.userId');

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get customer's chats (App version - Customer only)
export const getUserChats = async (req, res) => {
  try {
    const userEmail = req.user.email;
    const customerId = req.user.id;

    // Get customer
    const customer = await User.findOne({ email: userEmail });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Get chats where customer is a participant
    const chats = await Chat.find({
      'participants.userEmail': userEmail,
      isActive: true
    })
      .populate({
        path: 'ticketId',
        select: 'ticketNumber status categoryId',
        populate: {
          path: 'categoryId',
          select: 'name'
        }
      }).select('isActive ticketId lastMessage')
      .sort({ lastMessageAt: -1 });

    // Get last message and its read status for each chat
    const chatsWithLastMessage = await Promise.all(
      chats.map(async (chat) => {
        // Get last message for this chat
        const lastMessageData = await Message.findOne({ chatId: chat._id })
          .select('content createdAt isRead readBy')
          .sort({ createdAt: -1 })
          .limit(1);

        // Check if last message is read by this customer
        let isLastMessageRead = false;
        let messageId = null;
        if (lastMessageData) {
          messageId = lastMessageData._id;
          // Check if customer has read this message
          const hasReadMessage = lastMessageData.readBy &&
            lastMessageData.readBy.some(readEntry =>
              readEntry.userId && readEntry.userId.toString() === customerId.toString()
            );
          isLastMessageRead = lastMessageData.isRead || hasReadMessage;
        }

        const chatObject = chat.toObject();
        // Remove participants from response
        delete chatObject.participants;

        return {
          ...chatObject,
          lastMessageRead: isLastMessageRead,
          messageId: messageId,
          lastMessage: lastMessageData ? lastMessageData.content : null
        };
      })
    );

    // Filter out chats without messageId (no messages)
    const chatsWithMessages = chatsWithLastMessage.filter(chat => chat.messageId !== null);

    res.json({
      success: true,
      data: chatsWithMessages
    });
  } catch (error) {
    console.error('Get customer chats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark all messages as read (App version - Customer only)
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

    const customer = await User.findOne({ email: userEmail });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    await Message.updateMany(
      {
        chatId,
        'sender.userId': { $ne: customer._id },
        'readBy.userId': { $ne: customer._id }
      },
      {
        $set: { isRead: true },
        $push: {
          readBy: {
            userId: customer._id,
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