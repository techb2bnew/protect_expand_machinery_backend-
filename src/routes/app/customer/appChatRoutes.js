import { Router } from 'express';
import { appAuthenticate } from '../../../middleware/authMiddleware.js';
import { 
  getOrCreateChat, 
  getChatMessages, 
  sendMessage, 
  getUserChats,
  readAllMessages
} from '../../../controllers/app/appChatController.js';

const router = Router();

// Apply app authentication for all chat routes
router.use(appAuthenticate);

/**
 * @swagger
 * /chat/list:
 *   get:
 *     tags: [App Chat]
 *     summary: Get current user's chats
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of chats
 */
router.get('/list', getUserChats);

/**
 * @swagger
 * /chat/{ticketId}:
 *   get:
 *     tags: [App Chat]
 *     summary: Get or create chat by ticket
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         schema:
 *           type: string
 *         required: true
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Chat object
 */
router.get('/:ticketId', getOrCreateChat);

/**
 * @swagger
 * /chat/{chatId}/messages:
 *   get:
 *     tags: [App Chat]
 *     summary: Get chat messages
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         schema:
 *           type: string
 *         required: true
 *         description: Chat ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         required: false
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         required: false
 *     responses:
 *       200:
 *         description: List of messages
 */
router.get('/:chatId/messages', getChatMessages);

/**
 * @swagger
 * /chat/send:
 *   post:
 *     tags: [App Chat]
 *     summary: Send a message in chat
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
 *               content:
 *                 type: string
 *               messageType:
 *                 type: string
 *                 enum: [text, image, file]
 *     responses:
 *       200:
 *         description: Message sent
 */
router.post('/send', sendMessage);


/**
 * @swagger
 * /chat/{chatId}/readAllMessages:
 *   put:
 *     tags: [App Chat]
 *     summary: Mark all messages as read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: messages marked as read
 */
router.put('/:chatId/readAllMessages', readAllMessages);

export default router;


