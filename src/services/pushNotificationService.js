import { getFirebaseMessaging } from '../config/firebase.js';
import DeviceToken from '../models/DeviceToken.js';

const sanitizePayload = (payload = {}) => {
  const sanitized = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      sanitized[key] = String(value);
    }
  });
  return sanitized;
};

// Validate FCM token format
const isValidFCMToken = (token) => {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const trimmedToken = token.trim();
  
  // Reject obvious dummy/example tokens
  const invalidPatterns = [
    'fcm_token_example',
    'example',
    'test',
    'dummy',
    'placeholder',
    'token_example',
  ];
  
  if (invalidPatterns.some(pattern => trimmedToken.toLowerCase().includes(pattern))) {
    return false;
  }

  // FCM tokens are typically long strings (at least 100+ characters)
  // They usually start with specific prefixes or are base64-like
  if (trimmedToken.length < 50) {
    return false;
  }

  return true;
};

// Check if error indicates token should be deleted
const shouldDeleteToken = (error) => {
  if (!error || !error.code) {
    return false;
  }

  const deleteableErrors = [
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered',
    'messaging/invalid-argument', // When token format is invalid
  ];

  return deleteableErrors.includes(error.code);
};

export const registerDeviceToken = async ({
  userId,
  fcmToken,
  platform = 'android',
}) => {
  try {
    const normalizedToken = fcmToken.trim();
    console.log('🔄 Registering device token for userId:', userId);

    // Validate token format
    if (!isValidFCMToken(normalizedToken)) {
      console.warn('⚠️ Invalid FCM token format detected:', normalizedToken.substring(0, 20) + '...');
      throw new Error('Invalid FCM token format. Please provide a valid device token.');
    }

    // Ensure same token is not linked to other users
    const deleteResult = await DeviceToken.deleteMany({
      fcmToken: normalizedToken,
      userId: { $ne: userId },
    });

    if (deleteResult.deletedCount > 0) {
      console.log(`🔀 Token transferred from ${deleteResult.deletedCount} other user(s)`);
    }

    // Check if user already has a token registered
    const existing = await DeviceToken.findOne({ userId });

    if (existing) {
      // Same token already registered for this user, just update lastActiveAt
      existing.platform = platform;
      existing.fcmToken = normalizedToken;
      existing.lastActiveAt = new Date();
      await existing.save();
      console.log('✅ Token updated for user:', existing._id);

      return {
        record: existing,
        wasUpdated: true,
      };
    }

    // Create new token
    const record = await DeviceToken.create({
      userId,
      fcmToken: normalizedToken,
      platform,
      lastActiveAt: new Date(),
    });

    console.log('✅ New device token created:', record._id);
    return {
      record,
      wasUpdated: false,
    };
  } catch (error) {
    console.error('❌ Error registering device token:', error.message);
    throw error;
  }
};

export const getTokensForUserIds = async (userIds = []) => {
  if (!userIds?.length) {
    return [];
  }

  const devices = await DeviceToken.find({
    userId: { $in: userIds },
  }).lean();

  return devices;
};

// export const sendPushNotification = async ({
//   title,
//   body,
//   data = {},
//   userIds = [],
//   tokens = [],
//   android = {},
//   apns = {},
// }) => {
//   const messaging = getFirebaseMessaging();

//   let targetTokens = tokens.filter(Boolean);

//   if (userIds.length) {
//     const devices = await getTokensForUserIds(userIds);
//     targetTokens = [
//       ...new Set([
//         ...targetTokens,
//         ...devices.map((device) => device.fcmToken),
//       ]),
//     ];
//   }

//   // Filter out invalid tokens before sending
//   const validTokens = targetTokens.filter(token => isValidFCMToken(token));
//   const invalidTokens = targetTokens.filter(token => !isValidFCMToken(token));

//   if (invalidTokens.length > 0) {
//     console.warn(`⚠️ Filtered out ${invalidTokens.length} invalid token(s) before sending`);
//     // Remove invalid tokens from database
//     try {
//       await DeviceToken.deleteMany({ fcmToken: { $in: invalidTokens } });
//       console.log(`🗑️ Removed ${invalidTokens.length} invalid token(s) from database`);
//     } catch (deleteError) {
//       console.error('Error removing invalid tokens:', deleteError);
//     }
//   }

//   if (!validTokens.length) {
//     return {
//       success: false,
//       message: 'No valid device tokens available for notification delivery',
//       response: null,
//     };
//   }

//   targetTokens = validTokens;

//   const message = {
//     tokens: targetTokens,
//     notification: {
//       title,
//       body,
//     },
//     data: sanitizePayload(data),
//     android: {
//       priority: 'high',
//       notification: {
//         sound: 'default',
//         channelId: 'general',
//       },
//       ...android,
//     },
//     apns: {
//       headers: {
//         'apns-priority': '10',
//       },
//       payload: {
//         aps: {
//           sound: 'default',
//         },
//       },
//       ...apns,
//     },
//   };

//   const response = await messaging.sendEachForMulticast(message);

//   // Handle failed notifications and delete invalid tokens
//   if (response.failureCount > 0) {
//     const failedResults = response.responses
//       .map((res, index) => ({
//         token: targetTokens[index],
//         error: res.error,
//         errorCode: res.error?.code,
//         errorMessage: res.error?.message || 'Unknown error',
//         success: res.success,
//       }))
//       .filter((r) => !r.success);

//     console.log('⚠️ Some push notifications failed:', failedResults.length);

//     // Separate tokens that should be deleted
//     const tokensToDelete = failedResults
//       .filter(r => shouldDeleteToken(r.error))
//       .map(r => r.token);

//     if (tokensToDelete.length > 0) {
//       try {
//         const deleteResult = await DeviceToken.deleteMany({ 
//           fcmToken: { $in: tokensToDelete } 
//         });
//         console.log(`🗑️ Removed ${deleteResult.deletedCount} invalid/expired token(s) from database`);
//       } catch (deleteError) {
//         console.error('Error removing failed tokens:', deleteError);
//       }
//     }

//     // Log remaining failures (temporary errors, etc.)
//     const temporaryFailures = failedResults.filter(r => !shouldDeleteToken(r.error));
//     if (temporaryFailures.length > 0) {
//       console.log('⚠️ Temporary failures (tokens kept):', temporaryFailures.map(r => ({
//         token: r.token.substring(0, 20) + '...',
//         error: r.errorMessage
//       })));
//     }
//   }

//   if (response.successCount > 0) {
//     console.log(`✅ Push notifications sent successfully: ${response.successCount}/${targetTokens.length}`);
//   }

//   return {
//     success: true,
//     message: 'Notification processed',
//     response,
//     stats: {
//       total: targetTokens.length,
//       success: response.successCount,
//       failed: response.failureCount,
//     },
//   };
// };

export const sendPushNotification = async ({
  title,
  body,
  data = {},
  userIds = [],
  tokens = [],
  android = {},
  apns = {},
}) => {
  const messaging = getFirebaseMessaging();
 
  let targetTokens = tokens.filter(Boolean);
 
  if (userIds.length) {
    const devices = await getTokensForUserIds(userIds);
    targetTokens = [
      ...new Set([
        ...targetTokens,
        ...devices.map((device) => device.fcmToken),
      ]),
    ];
  }
 
  const validTokens = targetTokens.filter(token => isValidFCMToken(token));
  const invalidTokens = targetTokens.filter(token => !isValidFCMToken(token));
 
  if (invalidTokens.length > 0) {
    try {
      await DeviceToken.deleteMany({ fcmToken: { $in: invalidTokens } });
    } catch (e) {
      console.error('Error removing invalid tokens:', e);
    }
  }
 
  if (!validTokens.length) {
    return {
      success: false,
      message: 'No valid device tokens available',
      response: null,
    };
  }
 
  targetTokens = validTokens;
 
  // 🔥 THIS IS THE KEY LINE
  const badgeCount = Number(data?.badge || 0);
 
  const message = {
    tokens: targetTokens,
 
    notification: {
      title,
      body,
    },
 
    data: sanitizePayload({
      ...data,
      badge: String(badgeCount),
    }),
 
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'general',
      },
      ...android,
    },
 
    // 🔥 iOS BADGE FIX (MOST IMPORTANT)
    apns: {
      headers: {
        'apns-priority': '10',
      },
      payload: {
        aps: {
          badge: badgeCount, // 👈 iOS icon badge
          sound: 'default',
        },
      },
      ...apns,
    },
  };
 
  const response = await messaging.sendEachForMulticast(message);
 
  if (response.failureCount > 0) {
    const failedResults = response.responses
      .map((res, index) => ({
        token: targetTokens[index],
        error: res.error,
        success: res.success,
      }))
      .filter(r => !r.success);
 
    const tokensToDelete = failedResults
      .filter(r => shouldDeleteToken(r.error))
      .map(r => r.token);
 
    if (tokensToDelete.length > 0) {
      await DeviceToken.deleteMany({ fcmToken: { $in: tokensToDelete } });
    }
  }
 
  return {
    success: true,
    response,
  };
};

// Clean up invalid tokens from database
export const cleanupInvalidTokens = async () => {
  try {
    console.log('🧹 Starting cleanup of invalid device tokens...');
    
    const allTokens = await DeviceToken.find({}).lean();
    const invalidTokens = allTokens.filter(device => !isValidFCMToken(device.fcmToken));
    
    if (invalidTokens.length === 0) {
      console.log('✅ No invalid tokens found in database');
      return { deleted: 0 };
    }

    const invalidTokenIds = invalidTokens.map(t => t._id);
    const deleteResult = await DeviceToken.deleteMany({
      _id: { $in: invalidTokenIds }
    });

    console.log(`🗑️ Cleaned up ${deleteResult.deletedCount} invalid token(s) from database`);
    return { deleted: deleteResult.deletedCount };
  } catch (error) {
    console.error('❌ Error during token cleanup:', error);
    throw error;
  }
};

