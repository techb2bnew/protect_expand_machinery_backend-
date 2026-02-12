import { Router } from 'express';
import appAuthRoutes from './customer/appAuthRoutes.js';
import appTicketRoutes from './customer/appTicketRoutes.js';
import appChatRoutes from './customer/appChatRoutes.js';
import appCategoryRoutes from './customer/appCategoryRoutes.js';
import appEquipmentRoutes from './customer/appEquipmentRoutes.js';
import appProfileRoutes from './customer/appProfileRoutes.js';
import appNotificationRoutes from './customer/appNotificationRoutes.js';
import appSupportInboxRoutes from './customer/appSupportInboxRoutes.js';
import agentRoutes from './agent/index.js';
import appReportIssueRoutes from './customer/appReportIssueRoutes.js';
import appTermsConditionRoutes from './customer/appTermsCondition.js';
import socketIORoutes from './customer/socketIORoutes.js';
const router = Router();

/**
 * @swagger
 * tags:
 *   - name: App Authentication
 *     description: Mobile app authentication endpoints
 *   - name: App Categories
 *     description: Support ticket categories
 *   - name: App Equipment
 *     description: Equipment and machinery list
 *   - name: App Tickets
 *     description: Customer support ticket management
 *   - name: App Chat
 *     description: Real-time chat 
 *   - name: App Profile
 *     description: Customer profile 
 *   - name: App Notifications
 *     description: Customer notifications
 *   - name: App Support Inbox
 *     description: Customer support inbox 
 *   - name: App Report Issues
 *     description: Customer report issues
 */

// App routes (for mobile application)
router.use('/auth', appAuthRoutes);
router.use('/categories', appCategoryRoutes);
router.use('/equipment', appEquipmentRoutes);
router.use('/tickets', appTicketRoutes);
router.use('/chat', appChatRoutes);
router.use('/profile', appProfileRoutes);
router.use('/notifications', appNotificationRoutes);
router.use('/support-inbox', appSupportInboxRoutes);
router.use('/report-issue', appReportIssueRoutes);
router.use('/terms', appTermsConditionRoutes);
router.use('/', socketIORoutes);

// Agent routes (for agent mobile app)
router.use('/agent', agentRoutes);
export default router;

