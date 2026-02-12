import { Router } from 'express';
import { appAuthenticate } from '../../../middleware/authMiddleware.js';
import {
  getSupportInbox,
  markAsRead,
  toggleArchiveConversation,
  getConversationDetails
} from '../../../controllers/app/appSupportInboxController.js';

const router = Router();

router.use(appAuthenticate);

/**
 * @swagger
 * /support-inbox:
 *   get:
 *     tags:
 *       - App Support Inbox
 *     summary: Get support inbox conversations with filtering and search
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of conversations per page
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [all, unread, archived]
 *           default: all
 *         description: Filter conversations by status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in conversation ticketNumber and status
 *     responses:
 *       200:
 *         description: List of support conversations with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     conversations:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *                     counts:
 *                       type: object
 */
router.get('/', getSupportInbox);

/**
 * @swagger
 * /support-inbox/{messageId}/read:
 *   put:
 *     tags:
 *       - App Support Inbox
 *     summary: Mark message as read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message marked as read
 *       404:
 *         description: Message not found
 */
router.put('/:messageId/read', markAsRead);

/**
 * @swagger
 * /support-inbox/{ticketId}/toggle-archive:
 *   put:
 *     tags:
 *       - App Support Inbox
 *     summary: Toggle archive status of conversation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Conversation archive status toggled successfully
 *       404:
 *         description: Conversation not found
 */
router.put('/:ticketId/toggle-archive', toggleArchiveConversation);

/**
 * @swagger
 * /support-inbox/{ticketId}/details:
 *   get:
 *     tags:
 *       - App Support Inbox
 *     summary: Get conversation details with messages
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for messages pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Number of messages per page
 *     responses:
 *       200:
 *         description: Conversation details with messages
 *       404:
 *         description: Conversation not found
 */
router.get('/:ticketId/details', getConversationDetails);

export default router;
