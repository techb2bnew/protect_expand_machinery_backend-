import { Router } from 'express';
import { appAuthenticate } from '../../../middleware/authMiddleware.js';
import { getEquipment } from '../../../controllers/app/appEquipmentController.js';

const router = Router();

// Require authentication for all equipment routes
router.use(appAuthenticate);

/**
 * @swagger
 * /equipment:
 *   get:
 *     tags:
 *       - App Equipment
 *     summary: Get all equipment list
 *     description: Protected endpoint - Requires authentication token. Returns list of available equipment.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Equipment fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Equipment fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                         example: 3D Camera Pro
 *                       serialNumber:
 *                         type: string
 *                         example: CAM001234
 *                       modelNumber:
 *                         type: string
 *                         example: CP-2024-PRO
 *                       description:
 *                         type: string
 *                         example: Professional 3D camera for high-resolution scanning
 *                       sortOrder:
 *                         type: number
 *                         example: 1
 */
router.get('/', getEquipment);

export default router;

