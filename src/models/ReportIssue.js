import mongoose from 'mongoose';

const { Schema } = mongoose;

const reportIssueSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
reportIssueSchema.index({ createdAt: -1 });

const ReportIssue = mongoose.models.ReportIssue || mongoose.model('ReportIssue', reportIssueSchema);
export default ReportIssue;
