import { Router } from 'express';
import { appLoggedInAuthenticate } from '../../../middleware/authMiddleware.js';
import { getCategories } from '../../../controllers/app/appCategoryController.js';

const router = Router();

// Require authentication for all category routes
router.use(appLoggedInAuthenticate);

/**
 * @swagger
 * /categories:
 *   get:
 *     tags:
 *       - App Categories
 *     summary: Get all support categories
 *     description: Protected endpoint - Requires authentication token. Returns list of ticket categories.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categories fetched successfully
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
 *                   example: Categories fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                         example: Applications Support
 *                       description:
 *                         type: string
 *                         example: Help with software applications and technical issues
 */
router.get('/', getCategories);

export default router;

