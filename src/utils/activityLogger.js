import ActivityLog from '../models/ActivityLog.js';

export async function logActivity(req, { message, status, userId: explicitUserId }) {
    const userId = explicitUserId || req?.user?.id;
    if (!userId) return; // silently skip if no user in context
    await ActivityLog.create({
        userId,
        message,
        status
    });
}

export default logActivity;


