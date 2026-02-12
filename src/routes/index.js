import express from 'express';
import authRoutes from './website/authRoutes.js';
import profileRoutes from './website/profileRoutes.js';
import customerwebRoutes from './website/customerRoutes.js';
import ticketRoutes from './website/ticketRoutes.js';
import agentRoutes from './website/agentRoutes.js';
import notificationRoutes from './website/notificationRoutes.js';
import chatRoutes from './website/chatRoutes.js';
import appRoutes from './app/index.js';
import agentticketRoutes from './website/agentticketRoutes.js';
import activityLogRoutes from './website/activityLogRoutes.js';
import equipmentRoutes from './website/equipmentRoutes.js';
import termsRoutes from './website/termsRoutes.js';
// Create router instance
const router = express.Router();

// Admin/Web API Routes
router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/customers', customerwebRoutes);
router.use('/tickets', ticketRoutes);
router.use('/agents', agentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/chat', chatRoutes);
router.use('/agent/tickets', agentticketRoutes);
router.use('/activity-logs', activityLogRoutes);
router.use('/equipment', equipmentRoutes);
router.use('/terms', termsRoutes);


// Mobile App API Routes
router.use('/app', appRoutes);

export default router;
