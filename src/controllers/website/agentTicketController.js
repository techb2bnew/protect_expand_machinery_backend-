import Ticket from '../../models/Ticket.js';
import User from '../../models/User.js';
import Category from '../../models/Category.js';
import Equipment from '../../models/Equipment.js';
import Message from '../../models/Message.js';
import mongoose from 'mongoose';
import { sendPushNotification } from '../../services/pushNotificationService.js';
import { logActivity } from '../../utils/activityLogger.js';
import { sendTicketUpdateStatusEmail, sendTicketStatusChangeAdminEmail } from '../../utils/emailService.js';

export const getTicketList = async (req, res) => {
    try {
        const userEmail = req.user.email;

        // Get user details to check role and categoryIds
        const user = await User.findOne({ email: userEmail });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Query params
        const {
            status,
            category,
            search,
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Get agent's assigned categories and convert to ObjectId
        const agentCategoryIds = user.categoryIds && Array.isArray(user.categoryIds) && user.categoryIds.length > 0
            ? user.categoryIds.map(cat => {
                if (mongoose.Types.ObjectId.isValid(cat)) {
                    return new mongoose.Types.ObjectId(cat);
                }
                return cat;
            })
            : [];

        // Base visibility filter: 
        // 1. Tickets assigned to this agent (regardless of category)
        // 2. OR unassigned tickets that belong to agent's assigned categories
        const visibilityFilter = agentCategoryIds.length > 0
            ? {
                $or: [
                    // Tickets assigned to this agent (show all, even if category doesn't match)
                    { assignedAgent: user._id },
                    // OR unassigned tickets that match agent's categories
                    {
                        $and: [
                            {
                                $or: [
                                    { assignedAgent: { $exists: false } },
                                    { assignedAgent: null }
                                ]
                            },
                            { categoryId: { $in: agentCategoryIds } }
                        ]
                    }
                ]
            }
            : {
                // If agent has no categories assigned, only show tickets assigned to them
                assignedAgent: user._id
            };

        // Build match filter
        const match = { ...visibilityFilter };
        if (status) match.status = status;
        let customerIds = [];
        let categoryIdsFromSearch = [];
        let equipmentIds = [];
        if (search && typeof search === 'string' && search.trim()) {
            const regex = new RegExp(search.trim(), 'i');

            // Pre-fetch referenced IDs that match the search text
            const [customers, categoriesFromSearch, equipments] = await Promise.all([
                User.find({ role: 'customer', $or: [{ name: regex }, { email: regex }] }, { _id: 1 }),
                Category.find({ name: regex }, { _id: 1 }),
                Equipment.find({ $or: [{ name: regex }, { serialNumber: regex }, { modelNumber: regex }] }, { _id: 1 })
            ]);
            customerIds = customers.map(c => c._id);
            categoryIdsFromSearch = categoriesFromSearch.map(c => c._id);
            equipmentIds = equipments.map(e => e._id);

            match.$and = [
                {
                    $or: [
                        { ticketNumber: regex },
                        { description: regex },
                        ...(customerIds.length ? [{ customer: { $in: customerIds } }] : []),
                        ...(categoryIdsFromSearch.length ? [{ categoryId: { $in: categoryIdsFromSearch } }] : []),
                        ...(equipmentIds.length ? [{ equipmentId: { $in: equipmentIds } }] : [])
                    ]
                }
            ];
        }

        // Handle category name filter
        let categoryFilter = {};
        if (category && typeof category === 'string' && category.trim()) {
            const categoryDoc = await Category.findOne({
                name: { $regex: category.trim(), $options: 'i' }
            });
            if (categoryDoc) {
                categoryFilter.categoryId = categoryDoc._id;
            } else {
                // If category not found, return empty results
                return res.json({
                    tickets: [],
                    meta: { total: 0, page: pageNum, limit: limitNum, pages: 0 }
                });
            }
        }

        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
        const skip = (pageNum - 1) * limitNum;
        const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

        // Combine all filters
        const finalMatch = { ...match, ...categoryFilter };

        const [tickets, total] = await Promise.all([
            Ticket.find(finalMatch)
                .sort(sort)
                .skip(skip)
                .limit(limitNum)
                .populate({
                    path: 'customer',
                    model: 'User',
                    match: { role: 'customer' },
                    select: 'name email phone'
                })
                .populate({ path: 'categoryId', model: 'Category', select: 'name' })
                .populate({ path: 'equipmentId', model: 'Equipment', select: 'name serialNumber modelNumber' })
                .populate({ path: 'assignedAgent', model: 'User', select: 'name email phone' }),
            Ticket.countDocuments(finalMatch)
        ]);

        // Add isReadTicket field and unread message count based on latest message's readBy
        const ticketsWithReadStatus = await Promise.all(
            tickets.map(async (ticket) => {
                // Get latest message for this ticket
                const latestMessage = await Message.findOne({ ticketId: ticket._id })
                    .sort({ createdAt: -1 })
                    .select('readBy isRead')
                    .lean();

                let isReadTicket = false;
                
                if (latestMessage) {
                    // Check if current user ID exists in readBy array
                    const hasReadMessage = latestMessage.readBy && 
                        latestMessage.readBy.some(readEntry => 
                            readEntry.userId && readEntry.userId.toString() === user._id.toString()
                        );
                    isReadTicket = latestMessage.isRead || hasReadMessage;
                } else {
                    // If no message exists, use ticket's isReadTicket field
                    isReadTicket = ticket.isReadTicket || false;
                }

                // Count unread messages for this ticket
                // Unread messages are those that:
                // 1. Are not sent by current user
                // 2. Don't have current user in readBy array
                const unreadCount = await Message.countDocuments({
                    ticketId: ticket._id,
                    'sender.userId': { $ne: user._id },
                    $or: [
                        { readBy: { $exists: false } },
                        { readBy: { $size: 0 } },
                        { 'readBy.userId': { $ne: user._id } }
                    ]
                });

                // Convert ticket to object and add isReadTicket field and unreadCount
                const ticketObj = ticket.toObject();
                ticketObj.isReadTicket = isReadTicket;
                ticketObj.unreadMessageCount = unreadCount;

                return ticketObj;
            })
        );

        res.json({
            message: 'Tickets fetched successfully',
            success: true,
            tickets: ticketsWithReadStatus,
            meta: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum) || 1
            }
        });

    } catch (error) {
        console.error('Get tickets error:', error);
        res.status(500).json({ message: 'Get ticket error' });
    }
};

export const getTicketByID = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Get user details
        const user = await User.findOne({ _id: userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Get agent's assigned categories and convert to ObjectId
        const agentCategoryIds = user.categoryIds && Array.isArray(user.categoryIds) && user.categoryIds.length > 0
            ? user.categoryIds.map(cat => {
                if (mongoose.Types.ObjectId.isValid(cat)) {
                    return new mongoose.Types.ObjectId(cat);
                }
                return cat;
            })
            : [];

        // Find ticket that is either assigned to this agent OR unassigned with matching category
        const ticketFilter = agentCategoryIds.length > 0
            ? {
                _id: id,
                $or: [
                    // Tickets assigned to this agent (show all, even if category doesn't match)
                    { assignedAgent: user._id },
                    // OR unassigned tickets that match agent's categories
                    {
                        $and: [
                            {
                                $or: [
                                    { assignedAgent: { $exists: false } },
                                    { assignedAgent: null }
                                ]
                            },
                            { categoryId: { $in: agentCategoryIds } }
                        ]
                    }
                ]
            }
            : {
                _id: id,
                assignedAgent: user._id
            };

        const ticket = await Ticket.findOne(ticketFilter)
            .populate({
                path: 'customer',
                model: 'User',
                match: { role: 'customer' },
                select: 'name email profileImage phone'
            })
            .populate('assignedAgent')
            .populate({ path: 'categoryId', select: 'name description' })
            .populate({ path: 'equipmentId', select: 'name description serialNumber modelNumber' });

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found or access denied', statuscode: 404, status: false });
        }
        res.json({ ticket });
    } catch (error) {
        res.status(500).json({ message: 'Get ticket error' });
    }
};

export const getTicketsSummary = async (req, res) => {
    try {
        const userEmail = req.user.email;

        // Get user details to check role and categoryIds
        const user = await User.findOne({ email: userEmail });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Get agent's assigned categories and convert to ObjectId
        const agentCategoryIds = user.categoryIds && Array.isArray(user.categoryIds) && user.categoryIds.length > 0
            ? user.categoryIds.map(cat => {
                if (mongoose.Types.ObjectId.isValid(cat)) {
                    return new mongoose.Types.ObjectId(cat);
                }
                return cat;
            })
            : [];

        // Base visibility filter for summary
        let match = agentCategoryIds.length > 0
            ? {
                $or: [
                    // Tickets assigned to this agent (show all, even if category doesn't match)
                    { assignedAgent: user._id },
                    // OR unassigned tickets that match agent's categories
                    {
                        $and: [
                            {
                                $or: [
                                    { assignedAgent: { $exists: false } },
                                    { assignedAgent: null }
                                ]
                            },
                            { categoryId: { $in: agentCategoryIds } }
                        ]
                    }
                ]
            }
            : {
                // If agent has no categories assigned, only show tickets assigned to them
                assignedAgent: user._id
            };

        // Aggregate counts per status
        const grouped = await Ticket.aggregate([
            { $match: match },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // Map results
        const byStatus = { pending: 0, in_progress: 0, closed: 0, resolved: 0 };
        for (const g of grouped) {
            if (byStatus[g._id] !== undefined) byStatus[g._id] = g.count;
        }

        const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
        const pending = byStatus.pending;
        const inProgress = byStatus.in_progress;
        const closedResolved = byStatus.closed + byStatus.resolved;

        return res.json({
            message: 'Ticket summary fetched successfully',
            success: true,
            data: { total, pending, inProgress, closedResolved }
        });

    } catch (error) {
        console.error('Get tickets summary error:', error);
        res.status(500).json({ message: 'Get tickets summary error' });
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
      
      res.json({ message: 'Ticket updated successfully', ticket });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  };