import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true
  },
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    userType: {
      type: String,
      enum: ['customer', 'agent', 'manager'],
      required: true
    },
    userName: {
      type: String,
      required: true
    },
    userEmail: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'old', 'inactive'],
      default: 'active'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastMessage: {
    type: String,
    default: ''
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
chatSchema.index({ ticketId: 1 });
chatSchema.index({ 'participants.userId': 1 });

export default mongoose.model('Chat', chatSchema);
