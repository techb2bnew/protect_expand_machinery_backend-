import { Router } from 'express';
import {
  login,
  register,
  registerDeviceTokenForUser,
  verifyEmailOtp,
  resendEmailVerificationOtp,
  forgotPassword,
  verifyOTP,
  resetPassword,
  logout,
  onlineOfflineStatus,
} from '../../../controllers/app/appAuthController.js';
import { appLoggedInAuthenticate } from '../../../middleware/authMiddleware.js';

const router = Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags:
 *       - App Authentication
 *     summary: Customer login for mobile app
 *     description: No authentication required - public endpoint
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: customer@yopmail.com
 *               password:
 *                 type: string
 *                 example: password123
 *               fcmToken:
 *                 type: string
 *                 example: fcm_token_example
 *               platform:
 *                 type: string
 *                 enum: [android, ios]
 *                 default: android
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', login);

/**
 * @swagger
 * /auth/device-token:
 *   post:
 *     tags:
 *       - App Authentication
 *     summary: Register device token for push notifications
 *     description: Store or update the device token for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceToken
 *             properties:
 *               deviceToken:
 *                 type: string
 *                 example: fcm_token_example
 *               devicePlatform:
 *                 type: string
 *                 enum: [android, ios]
 *                 default: android
 *     responses:
 *       200:
 *         description: Device token registered successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/device-token', appLoggedInAuthenticate, registerDeviceTokenForUser);

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags:
 *       - App Authentication
 *     summary: Customer registration
 *     description: No authentication required - public endpoint
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phoneNumber
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               phoneNumber:
 *                 type: string
 *                 example: "9876543210"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: password123
 *               company_name:
 *                 type: string
 *                 example: "ABC Company"
 *     responses:
 *       201:
 *         description: Registration successful
 *       400:
 *         description: Validation error
 */
router.post('/register', register);

/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     tags:
 *       - App Authentication
 *     summary: Verify customer email using OTP
 *     description: Verify the email address using the OTP received after registration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: customer@example.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired OTP
 *       404:
 *         description: Account not found
 */
router.post('/verify-email', verifyEmailOtp);

/**
 * @swagger
 * /auth/resend-email-otp:
 *   post:
 *     tags:
 *       - App Authentication
 *     summary: Resend email verification OTP
 *     description: Resend OTP to verify customer email address
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: customer@example.com
 *     responses:
 *       200:
 *         description: Verification OTP resent successfully
 *       400:
 *         description: Email already verified
 *       404:
 *         description: Account not found
 */
router.post('/resend-email-otp', resendEmailVerificationOtp);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags:
 *       - App Authentication
 *     summary: Request password reset
 *     description: Send password reset token to customer email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: customer@yopmail.com
 *     responses:
 *       200:
 *         description: Reset token sent (if email exists)
 *       400:
 *         description: Validation error
 */
router.post('/forgot-password', forgotPassword);

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     tags:
 *       - App Authentication
 *     summary: Verify OTP for password reset
 *     description: Verify the OTP sent to user's email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: customer@yopmail.com
 *               otp:
 *                 type: string
 *                 pattern: '^[0-9]{6}$'
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid or expired OTP
 *       404:
 *         description: User not found
 */
router.post('/verify-otp', verifyOTP);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     tags:
 *       - App Authentication
 *     summary: Reset password after OTP verification
 *     description: Reset user password using reset token from verify-otp endpoint
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: newpassword123
 *               confirmPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Password validation error or passwords do not match
 *       401:
 *         description: Invalid or expired reset token
 *       404:
 *         description: User not found
 */
router.post('/reset-password', resetPassword);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags:
 *       - App Authentication
 *     summary: Customer logout
 *     description: Logout the authenticated customer
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
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
 *                   example: Logged out successfully
 */
router.post('/logout', appLoggedInAuthenticate, logout);



/**
 * @swagger
 * /auth/onlineOffline/{status}:
 *   post:
 *     tags:
 *       - App Authentication
 *     summary: Update customer online status
 *     description: Update the authenticated customer's online status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: status
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           enum: [online, offline]
 *           description: The online status to update. Use online for online and offline for offline.
 *     responses:
 *       200:
 *         description: Online status updated successfully
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
 *                   example: Online status updated successfully
 */
router.post('/onlineOffline/:status', appLoggedInAuthenticate, onlineOfflineStatus);


export default router;

