import { Router } from 'express';
import { appAgentAuthenticate } from '../../../middleware/authMiddleware.js';
import {
  getTicketList,
  getTicketByID,
  getTicketsSummary,
  updateTicketStatus
} from '../../../controllers/website/agentTicketController.js';
const router = Router();

router.use(appAgentAuthenticate);

/**
 * @swagger
 * /agent/tickets:
 *   get:
 *     tags:
 *       - Agent Tickets
 *     summary: Get all tickets
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
 *         description: Number of tickets per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, closed, resolved]
 *         description: Filter by ticket status
     *       - in: query
     *         name: category
     *         schema:
     *           type: string
     *         description: Filter by ticket category name
     *       - in: query
     *         name: search
     *         schema:
     *           type: string
     *         description: Search in ticket number and description
     *     responses:
 *       200:
 *         description: List of tickets with pagination
 *       401:
 *         description: Unauthorized
 */
router.get('/', getTicketList);

/**
 * @swagger
 * /agent/tickets/details/{id}:
 *   get:
 *     tags:
 *       - Agent Tickets
 *     summary: Get ticket by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Ticket details
 *       404:
 *         description: Ticket not found
 *       401:
 *         description: Unauthorized
 */
router.get('/details/:id', getTicketByID);


/**
 * @swagger
 * /agent/tickets/summary:
 *   get:
 *     tags:
 *       - Agent Tickets
 *     summary: Get tickets summary
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tickets summary
 *       401:
 *         description: Unauthorized
 */
router.get('/summary', getTicketsSummary);




/**
 * @swagger
 * /agent/tickets/change-status/{id}:
 *   put:
 *     tags:
 *       - Agent Tickets
 *     summary: Update ticket status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 example: pending
 *     responses:
 *       200:
 *         description: Ticket status updated successfully
 *       400:
 *         description: Invalid status
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Ticket not found
 */


router.put('/change-status/:id', updateTicketStatus);





export default router;
