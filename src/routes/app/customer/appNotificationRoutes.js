import { Router } from 'express';
import { appLoggedInAuthenticate } from '../../../middleware/authMiddleware.js';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from '../../../controllers/app/appNotificationController.js';

const router = Router();

//All app routes require authentication
router.use(appLoggedInAuthenticate);

/**
 * @swagger
 * /notifications:
 *   get:
 *     tags:
 *       - App Notifications
 *     summary: Get customer notifications with pagination
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
 *         description: Number of notifications per page
 *     responses:
 *       200:
 *         description: List of notifications with pagination info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *                   description: Total number of notifications
 *                 unreadCount:
 *                   type: integer
 *                   description: Number of unread notifications
 *                 page:
 *                   type: integer
 *                   description: Current page number
 *                 limit:
 *                   type: integer
 *                   description: Number of items per page
 *                 totalPages:
 *                   type: integer
 *                   description: Total number of pages
 */
router.get('/', getNotifications);

/**
 * @swagger
 * /notifications/{id}/read:
 *   put:
 *     tags:
 *       - App Notifications
 *     summary: Mark notification as read
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
 *         description: Notification marked as read
 */
router.put('/:id/read', markAsRead);

/**
 * @swagger
 * /notifications/read-all:
 *   put:
 *     tags:
 *       - App Notifications
 *     summary: Mark all notifications as read
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.put('/read-all', markAllAsRead);

/**
 * @swagger
 * /notifications/{id}:
 *   delete:
 *     tags:
 *       - App Notifications
 *     summary: Delete single notification
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
 *         description: Notification deleted successfully
 *       404:
 *         description: Notification not found
 */
router.delete('/:id', deleteNotification);


export default router;

