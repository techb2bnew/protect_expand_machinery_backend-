import { Router } from 'express';
import { appLoggedInAuthenticate } from '../../../middleware/authMiddleware.js';
import { getCustomer, updateCustomer, uploadProfileImage, deleteAccount, newProfileUpdate } from '../../../controllers/app/appProfileController.js';
import { upload } from '../../../middleware/uploadMiddleware.js';

const router = Router();

router.use(appLoggedInAuthenticate);

/**
 * @swagger
 * /profile:
 *   get:
 *     tags:
 *       - App Profile
 *     summary: Get customer profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 */
router.get('/', getCustomer);

/**
 * @swagger
 * /profile:
 *   put:
 *     tags:
 *       - App Profile
 *     summary: Update customer profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put('/', updateCustomer);

/**
 * @swagger
 * /profile/upload-image:
 *   post:
 *     tags:
 *       - App Profile
 *     summary: Upload profile image
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profileImage:
 *                 type: string
 *                 format: binary
 *                 description: Profile image file
 *     responses:
 *       200:
 *         description: Profile image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 profileImage:
 *                   type: string
 *                 customer:
 *                   $ref: '#/components/schemas/Customer'
 *       400:
 *         description: No image file provided
 *       404:
 *         description: Customer not found
 */
router.post('/upload-image', upload.single('profileImage'), uploadProfileImage);

/**
 * @swagger
 * /profile/delete-account:
 *   delete:
 *     tags:
 *       - App Profile
 *     summary: Delete customer account permanently
 *     description: Permanently deletes the customer account along with all associated data including tickets, chats, messages, and notifications. This action cannot be undone.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Account deleted successfully
 *                 deleted:
 *                   type: object
 *                   properties:
 *                     tickets:
 *                       type: number
 *                       description: Number of tickets deleted
 *                     customer:
 *                       type: string
 *                       description: Name of the deleted customer
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Server error
 */
router.delete('/delete-account', deleteAccount);

/**
 * @swagger
 * /profile/new-profile-update:
 *   put:
 *     tags:
 *       - App Profile
 *     summary: Update customer profile
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
 *                 description: Customer name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Customer email
 *               phone:
 *                 type: string
 *                 description: Customer phone number
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

