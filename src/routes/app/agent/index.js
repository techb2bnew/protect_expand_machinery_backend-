import { Router } from 'express';
import ticketRoutes from './ticketRoutes.js';
import customerRoutes from './customerRoutes.js';
import chatRoutes from './chatRoutes.js';
import profileRoutes from './profileRoutes.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Agent Tickets
 *     description: Agent ticket management endpoints
 *   - name: Agent Customers
 *     description: Agent customer management endpoints
 *   - name: Agent Chat
 *     description: Agent chat endpoints
 *   - name: Agent Profile
 *     description: Agent profile management endpoints
 */

// Agent routes
router.use('/tickets', ticketRoutes);
router.use('/customers', customerRoutes);
router.use('/chat', chatRoutes);
router.use('/', profileRoutes);

export default router;
