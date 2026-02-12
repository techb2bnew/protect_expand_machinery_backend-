import mongoose from 'mongoose';

const { Schema } = mongoose;

const notificationSchema = new Schema({
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error'],
    default: 'info'
  },
  category: {
    type: String,
    enum: ['customer', 'ticket', 'agent', 'system', 'auth'],
    required: [true, 'Notification category is required']
  },
  isRead: {
    type: Boolean,
    default: false
  },
  userId: {
    type: String,
    required: [true, 'User ID is required']
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
export default Notification;
