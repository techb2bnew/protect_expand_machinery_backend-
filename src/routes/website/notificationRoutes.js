import { Router } from 'express';
import { authenticate } from '../../middleware/authMiddleware.js';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationStats
} from '../../controllers/website/notificationController.js';

const router = Router();

router.use(authenticate);


router.get('/', getNotifications);

router.get('/stats', getNotificationStats);

router.patch('/:id/read', markAsRead);

router.patch('/read-all', markAllAsRead);

router.delete('/:id', deleteNotification);

export default router;
