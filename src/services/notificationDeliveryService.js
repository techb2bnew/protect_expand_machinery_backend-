import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import { sendPushNotification } from './pushNotificationService.js';

const buildPushData = (notification, extraData = {}) => {
  const baseData = {
    notificationId: notification._id?.toString(),
    category: notification.category,
    type: notification.type,
  };

  if (notification.metadata && typeof notification.metadata === 'object') {
    Object.entries(notification.metadata).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      baseData[key] = value;
    });
  }

  Object.entries(extraData || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    baseData[key] = value;
  });

  const sanitized = {};
  Object.entries(baseData).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    sanitized[key] = typeof value === 'string' ? value : String(value);
  });

  return sanitized;
};

const sendPushSafely = async ({ notification, extraData }) => {
  try {
    await sendPushNotification({
      title: notification.title,
      body: notification.message,
      userIds: [notification.userId],
      data: buildPushData(notification, extraData),
    });
  } catch (error) {
    console.error('Failed to send push notification:', error);
  }
};

export const createNotificationWithPush = async (
  notificationPayload,
  { sendPush = true, pushData = {} } = {},
) => {
  const notification = await Notification.create(notificationPayload);

  const shouldSendPush = sendPush
    && notification.userId
    && mongoose.Types.ObjectId.isValid(notification.userId);

  if (shouldSendPush) {
    await sendPushSafely({
      notification,
      extraData: pushData,
    });
  }

  return notification;
};

export const insertNotificationsWithPush = async (
  notifications = [],
  { sendPush = true, pushDataBuilder, pushData = {} } = {},
) => {
  if (!notifications.length) {
    return [];
  }

  const createdNotifications = await Notification.insertMany(notifications);

  if (sendPush) {
    await Promise.allSettled(
      createdNotifications
        .filter((notification) => notification.userId && mongoose.Types.ObjectId.isValid(notification.userId))
        .map((notification) => sendPushSafely({
          notification,
          extraData: typeof pushDataBuilder === 'function'
            ? pushDataBuilder(notification)
            : pushData,
        })),
    );
  }

  return createdNotifications;
};

