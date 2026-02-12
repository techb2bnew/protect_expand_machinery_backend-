import { Router } from 'express';
import { appAuthenticate } from '../../../middleware/authMiddleware.js';
import { reportIssue } from '../../../controllers/app/appReportIssueController.js';

const router = Router();
router.use(appAuthenticate);


/**
 * @swagger
 * /report-issue:
 *   post:
 *     tags:
 *       - App Report Issues
 *     summary: Report a new issue
 *     description: Report a new issue to the support team
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *             properties:
 *               description:
 *                 type: string
 *                 description: Issue description
 *     responses:
 *       201:
 *         description: Issue reported successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.post('/', reportIssue);


export default router;
