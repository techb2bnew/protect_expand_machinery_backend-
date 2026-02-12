import { Router } from 'express';
import { getTermsAndConditions } from '../../../controllers/app/termsController.js';

const router = Router();


/**
 * @swagger
 * /terms:
 *   get:
 *     tags:
 *       - App Terms and Conditions
 *     summary: Get Terms and Conditions
 *     description: Protected endpoint - Requires authentication token. Returns latest Terms and Conditions.
 *     responses:
 *       200:
 *         description: Terms and Conditions fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     content:
 *                       type: string
 *                       example: "Terms and Conditions content here..."
 *       404:
 *         description: Terms and Conditions not found
 *       500:
 *         description: Server error
 */
router.get('/', getTermsAndConditions);

export default router;

