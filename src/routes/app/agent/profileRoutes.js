import { Router } from 'express';
import { appAgentAuthenticate } from '../../../middleware/authMiddleware.js';
import { newProfileUpdate } from '../../../controllers/app/appProfileController.js';

const router = Router();

// Agent routes (for agents)
router.use(appAgentAuthenticate);

/**
 * @swagger
 * /agent/new-profile-update:
 *   put:
 *     tags:
 *       - Agent Profile
 *     summary: Update agent profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Agent name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Agent email
 *               phone:
 *                 type: string
 *                 description: Agent phone number
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *       400:
 *         description: Bad request (validation error)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.put('/new-profile-update', newProfileUpdate);

export default router;

