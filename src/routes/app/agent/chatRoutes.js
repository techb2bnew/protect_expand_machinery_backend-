import { Router } from 'express';
import { appAgentAuthenticate } from '../../../middleware/authMiddleware.js';
import {
  getChatDetailsForAgent,
  sendMessage,
  getUserChatsLists,
  readAllMessages
} from '../../../controllers/website/chatController.js';

const router = Router();

// Agent routes (for agents)
router.use(appAgentAuthenticate);

/**
 * @swagger
 * /agent/chat/list:
 *   get:
 *     tags:
 *       - Agent Chat
 *     summary: Get user chats
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user chats
 *       401:
 *         description: Unauthorized
 */
router.get('/list', getUserChatsLists);


/**
 * @swagger
 * /agent/chat/ticket/{ticketId}:
 *   get:
 *     tags:
 *       - Agent Chat
 *     summary: Get or create chat for ticket
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
 *         description: Chat details
 *       401:
 *         description: Unauthorized
 */
router.get('/ticket/:ticketId', getChatDetailsForAgent);


/**
 * @swagger
 * /agent/chat/send:
 *   post:
 *     tags:
 *       - Agent Chat
 *     summary: Send message
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               chatId:
 *                 type: string
 *               ticketId:
 *                 type: string
 *               content:
 *                 type: string
 *               messageType:
 *                 type: string
 *                 enum: [text, image, file]
 *                 default: text
 *             required:
 *               - content
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/send', sendMessage);

/**
 * @swagger
 * /agent/chat/{chatId}/readAllMessages:
 *   put:
 *     tags:
 *       - Agent Chat
 *     summary: Mark all messages as read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat ID
 *     responses:
 *       200:
 *         description: Messages marked as read successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Chat not found
 */
router.put('/:chatId/readAllMessages', readAllMessages);

export default router;
