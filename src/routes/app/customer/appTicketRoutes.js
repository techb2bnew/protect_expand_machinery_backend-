import { Router } from 'express';
import { appAuthenticate } from '../../../middleware/authMiddleware.js';
import { uploadAttachments } from '../../../middleware/uploadMiddleware.js';
import {
    createTicket,
    getTickets,
    getTicketdetails,
    markAsTicketRead
} from '../../../controllers/app/appticketController.js';

const router = Router();

// All app routes require authentication
router.use(appAuthenticate);

/**
 * @swagger
 * /tickets/fetch:
 *   get:
 *     tags:
 *       - App Tickets
 *     summary: Get customer's tickets
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of customer tickets
 *       401:
 *         description: Unauthorized
 */
router.get('/fetch', getTickets);

/**
 * @swagger
 * /tickets/details/{id}:
 *   get:
 *     tags:
 *       - App Tickets
 *     summary: Get specific ticket
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ticket details
 *       404:
 *         description: Ticket not found
 */
router.get('/details/:id', getTicketdetails);

/**
 * @swagger
 * /tickets/create:
 *   post:
 *     tags:
 *       - App Tickets
 *     summary: Create new support ticket
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *               - categoryId
 *             properties:
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               equipmentId:
 *                 type: string
 *               serialNumber:
 *                 type: string
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary   
 *     responses:
 *       201:
 *         description: Ticket created
 */
router.post('/create', uploadAttachments.array('attachments', 5), createTicket);


/**
 * @swagger
 * /tickets/{ticketId}/read:
 *   put:
 *     tags:
 *       - App Tickets
 *     summary: Mark ticket as read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
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
router.put('/:ticketId/read', markAsTicketRead);








export default router;

