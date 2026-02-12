import Ticket from '../../models/Ticket.js';
import Category from '../../models/Category.js';
import Equipment from '../../models/Equipment.js';
import Notification from '../../models/Notification.js';
import User from '../../models/User.js';
import mongoose from 'mongoose';
import { sendTicketCreationEmail, sendTicketAdminNotify, sendTicketSupportTypeEmail } from '../../utils/emailService.js';
import { logActivity } from '../../utils/activityLogger.js';
import { sendPushNotification } from '../../services/pushNotificationService.js';

export const createTicket = async (req, res) => {
    try {
        let { description, categoryId, equipmentId, serialNumber, control, support_type } = req.body;

        if (equipmentId === '' || equipmentId === undefined) {
            equipmentId = null;
        }

        // Get customer ID from token
        const customerId = req.user.id;
        const customer = await User.findById(customerId);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        // Validate categoryId format and exists in database
        if (categoryId) {
            // Check if categoryId is a valid ObjectId format
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
            // Check if equipmentId is a valid ObjectId format
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
            attachments: attachments,
            serialNumber,
            control,
            support_type
        });

        // Activity log: ticket created
        await logActivity(req, {
            message: `New ticket ${ticket.ticketNumber || ticket._id} created`,
            status: 'added'
        });

        // Create notifications for customer, admin, and agents
        const notifications = [];

        // 1. Notification for customer (self)
        notifications.push({
            title: 'Ticket Created',
            message: `Your support ticket ${ticket.ticketNumber} has been created successfully and is now pending.`,
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
            notifications.push({
                title: 'New Ticket Created',
                message: `New support ticket ${ticket.ticketNumber} created by ${customer.name}`,
                type: 'info',
                category: 'ticket',
                userId: String(manager._id),
                metadata: {
                    ticketId: ticket._id,
                    ticketNumber: ticket.ticketNumber,
                    customerId: customer._id,
                    customerName: customer.name
                }
            });
        });

        // 3. If ticket has category, notify relevant agents
        let categoryAgents = [];
        if (categoryId) {
            categoryAgents = await User.find({
                role: 'agent',
                isActive: true,
                categoryIds: categoryId
            });

            categoryAgents.forEach(agent => {
                notifications.push({
                    title: 'New Ticket Available',
                    message: `New ticket ${ticket.ticketNumber} in your category created by ${customer.name}`,
                    type: 'info',
                    category: 'ticket',
                    userId: String(agent._id),
                    metadata: {
                        ticketId: ticket._id,
                        ticketNumber: ticket.ticketNumber,
                        customerId: customer._id,
                        customerName: customer.name
                    }
                });
            });
        }

        // Create all notifications
        await Notification.insertMany(notifications);

        // Send Firebase push notifications
        try {
            // 1. Push notification to customer
            await sendPushNotification({
                title: 'Ticket Created Successfully',
                body: `Your ticket #${ticket.ticketNumber} has been created and is now pending.`,
                data: {
                    type: 'ticket_created',
                    ticketId: ticket._id.toString(),
                    ticketNumber: ticket.ticketNumber,
                },
                userIds: [customer._id],
            });
            console.log('📱 Push notification sent to customer for ticket creation');

            // 2. Push notification to managers
            if (managers.length > 0) {
                const managerIds = managers.map(m => m._id);
                await sendPushNotification({
                    title: 'New Ticket Created',
                    body: `New ticket #${ticket.ticketNumber} created by ${customer.name}`,
                    data: {
                        type: 'new_ticket',
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
                    title: 'New Ticket Available',
                    body: `New ticket #${ticket.ticketNumber} in your category from ${customer.name}`,
                    data: {
                        type: 'new_ticket_agent',
                        ticketId: ticket._id.toString(),
                        ticketNumber: ticket.ticketNumber,
                        customerName: customer.name,
                    },
                    userIds: agentIds,
                });
                console.log('📱 Push notification sent to agents for new ticket');
            }
        } catch (pushError) {
            console.error('Failed to send push notifications for ticket:', pushError);
        }

        // Send emails to customer, agents and admins (env)
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

        res.status(201).json({ message: 'Ticket created successfully', ticket });
    } catch (error) {
        res.status(500).json({ message: error });
    }
};

export const getTickets = async (req, res) => {
    try {
        const customerId = req.user.id;

        const tickets = await Ticket.find({ customer: customerId })
            .populate({
                path: 'customer',
                model: 'User',
                select: 'name email',
                match: { role: 'customer' }
            })
            .populate({ path: 'categoryId', select: 'name description' })
            .populate({ path: 'equipmentId', select: 'name description' })
            .populate({
                path: 'assignedAgent',
                select: 'name email'
            });

        res.json({ count: tickets.length, tickets });

    } catch (error) {
        res.status(500).json({ message: 'Get ticket error' });
    }
};

export const getTicketdetails = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId format
        if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
            return res.status(400).json({ message: 'Invalid ticket ID format' });
        }

        const customerId = req.user.id;

        const ticket = await Ticket.findOne({ _id: id, customer: customerId })
            .populate({
                path: 'customer',
                model: 'User',
                match: { role: 'customer' },
                select: 'name email profileImage phone'
            })
            .populate('assignedAgent')
            .populate({ path: 'categoryId', select: 'name description' })
            .populate({ path: 'equipmentId', select: 'name description' });
        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }
        res.json({ ticket });
    } catch (error) {
        res.status(500).json({ message: 'Get ticket error' });
    }
};



export const markAsTicketRead = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const customerId = req.user.id;

        // Verify ticket belongs to the customer
        const ticket = await Ticket.findOneAndUpdate(
            { _id: ticketId, customer: customerId },
            { $set: { isReadTicket: true } },
            { new: true }
        );

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found or you do not have permission'
            });
        }

        res.json({
            success: true,
            message: 'Ticket marked as read',
            data: ticket
        });

    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while marking as read'
        });
    }
};