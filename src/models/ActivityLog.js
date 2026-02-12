import mongoose from 'mongoose';

const { Schema } = mongoose;

const activityLogSchema = new Schema({
    // User Information
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        trim: true
    },
}, {
    timestamps: true,
    collection: 'activityLogs'
});

// userId already has index: true in schema, no need for separate index



const ActivityLog = mongoose.models.ActivityLog || mongoose.model('ActivityLog', activityLogSchema);
export default ActivityLog;