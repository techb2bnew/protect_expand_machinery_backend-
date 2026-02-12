import ReportIssue from '../../models/ReportIssue.js';
import User from '../../models/User.js';
import { sendEmail, buildReportIssueAdminEmail, buildReportIssueUserEmail } from '../../utils/emailService.js';
import { sendPushNotification } from '../../services/pushNotificationService.js';

export const reportIssue = async (req, res) => {
    try {
        const { description } = req.body;

        // Validate required fields
        if (!description) {
            return res.status(400).json({
                message: 'Description is required'
            });
        }
        const userId = req.user.id
        if (!userId) {
            return res.status(404).json({
                message: 'User not found'
            });
        }
        // Create report issue record
        const reportIssue = new ReportIssue({
            userId: userId,
            description: description.trim(),
        });

        await reportIssue.save();

        const user = await User.findById(userId).select('name email phone');
        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }
        const { name, email, phone } = user;
        // Build email templates
        const createdAt = reportIssue.createdAt.toLocaleString();
        const { subject: adminSubject, html: adminHtml } = buildReportIssueAdminEmail({
            reportId: reportIssue._id,
            name,
            email,
            phone,
            description,
            createdAt
        });
        const { subject: userSubject, html: userHtml } = buildReportIssueUserEmail({
            reportId: reportIssue._id,
            name,
            email,
            phone,
            description,
            createdAt
        });

        try {
            // Send email to admin with customer email as reply-to
            await sendEmail(process.env.ADMIN_EMAIL, adminSubject, adminHtml, null, email);
            // Send confirmation to user with admin email as reply-to
            await sendEmail(email, userSubject, userHtml, null, process.env.ADMIN_EMAIL);
        } catch (emailError) {
            console.error('Failed to send email notification:', emailError);
        }

        // Send Firebase push notification to user confirming issue reported
        try {
            await sendPushNotification({
                title: 'Issue Reported Successfully',
                body: 'Your issue has been reported. Our team will review it shortly.',
                data: {
                    type: 'issue_reported',
                    reportId: reportIssue._id.toString(),
                    userId: userId.toString(),
                },
                userIds: [userId],
            });
            console.log('📱 Push notification sent for issue report');
        } catch (pushError) {
            console.error('Failed to send push notification for issue report:', pushError);
        }

        res.status(201).json({
            message: 'Issue reported successfully',
            reportId: reportIssue._id,
            user: user
        });

    } catch (error) {
        console.error('Report issue error:', error);
        res.status(500).json({
            message: 'Failed to report issue',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};
