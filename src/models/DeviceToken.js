import mongoose from 'mongoose';

const { Schema } = mongoose;

const deviceTokenSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  fcmToken: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  platform: {
    type: String,
    enum: ['ios', 'android', 'web'],
    default: 'android',
  },
  lastActiveAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// userId index - not unique since one user can have multiple devices
deviceTokenSchema.index({ userId: 1 });
// fcmToken already has unique: true in schema, no need for separate index

const DeviceToken = mongoose.models.DeviceToken || mongoose.model('DeviceToken', deviceTokenSchema);

// Drop old 'token_1' index if it exists (migration from old schema)
DeviceToken.collection.dropIndex('token_1').catch(() => {
  // Index doesn't exist, ignore error
});

export default DeviceToken;

