import User from '../../models/User.js';
import Ticket from '../../models/Ticket.js';
import { logActivity } from '../../utils/activityLogger.js';
import { createNotificationWithPush } from '../../services/notificationDeliveryService.js';
import { sendPushNotification } from '../../services/pushNotificationService.js';


export const getCustomer = async (req, res) => {
    try {
        // Get customer ID from authenticated user (set by auth middleware)
        const customerId = req.user.id;

        const customer = await User.findById(customerId);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }


        const totalSupportTickets = await Ticket.countDocuments({ customer: customerId });

        // Format member since date
        const memberSince = customer.createdAt ?
            new Date(customer.createdAt).toLocaleString('en-US', {
                month: 'long',
                year: 'numeric'
            }) : null;

        // Split name into firstName and lastName
        const nameParts = customer.name ? customer.name.trim().split(/\s+/) : [];
        const firstName = nameParts.length > 0 ? nameParts[0] : '';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

        res.json({
            customer: {
                ...customer.toObject(),
                firstName,
                lastName,
                memberSince,
                totalSupportTickets,
                company_name: customer.company_name
            }
        });
    } catch (error) {
        console.error('Get customer error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateCustomer = async (req, res) => {
    try {
        // Get customer ID from authenticated user (set by auth middleware)
        const customerId = req.user.id;
        const { name, email, phone, company_name } = req.body;
        const customer = await User.findById(customerId);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        if (name) customer.name = name.trim();
        if (email) {
            const emailRegex = /^\S+@\S+\.\S+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ message: 'Please provide a valid email' });
            }
            const existingUser = await User.findOne({ 
                email: email.toLowerCase(),
                _id: { $ne: customerId }
            });
            
            if (existingUser) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Email already exists' 
                });
            }
        }
        if (phone) {
            const phoneDigits = String(phone).replace(/^\+1/, '').replace(/\D/g, '');
            if (phoneDigits.length !== 10) {
                return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
            }
            // Check if phone already exists (search by digits only, ignoring formatting)
            const normalizedPhone = `+1${phoneDigits}`;
            const existingPhone = await User.findOne({
              $and: [
                {
                  $or: [
                    { phone: normalizedPhone }, // Exact match with +1 prefix
                    { phone: { $regex: phoneDigits } } // Match if digits are contained in stored phone
                  ]
                },
                { _id: { $ne: customer._id } }
              ]
            });
            if (existingPhone && String(existingPhone._id) !== String(customer._id)) {
                return res.status(400).json({ message: 'Phone number already exists' });
            }
            customer.phone = phoneDigits.trim(); // User model hook will add +1 automatically
        }
        if (company_name !== undefined) {
            customer.company_name = company_name ? company_name.trim() : '';
        }

        await customer.save();

        // Send Firebase push notification for profile update
        try {
            await sendPushNotification({
                title: 'Profile Updated',
                body: `Your profile has been updated successfully.`,
                data: {
                    type: 'profile_updated',
                    customerId: customer._id.toString(),
                    customerName: customer.name,
                },
                userIds: [customer._id],
            });
            console.log('📱 Push notification sent for profile update');
        } catch (pushError) {
            console.error('Failed to send push notification for profile update:', pushError);
        }

        // Create in-app notification for customer update
        await createNotificationWithPush({
            title: 'Profile Updated',
            message: `Your profile information has been updated successfully`,
            type: 'info',
            category: 'customer',
            userId: customer._id,
            metadata: {
                customerId: customer._id,
                customerName: customer.name,
                customerEmail: customer.email
            }
        }, {
            pushData: {
                action: 'customer_updated',
                customerId: customer._id.toString(),
            }
        });
        // Activity log: profile updated (app)
        if (customer.role === 'customer') {
            await logActivity(req, {
                message: `Customer (${customer.email}) profile updated`,
                status: 'updated'
            });
        }
        if (customer.role === 'agent') {
            await logActivity(req, {
                message: `Agent (${customer.email}) profile updated`,
                status: 'updated'
            });
        }

        res.json({ message: 'Customer updated successfully', customer });
    } catch (error) {
        console.error('Update customer error:', error);
        if (error?.code === 11000) {
            if (error?.keyPattern?.email) {
                return res.status(400).json({ message: 'Email already exists' });
            }
            if (error?.keyPattern?.phone) {
                return res.status(400).json({ message: 'Phone number already exists' });
            }
        }
        res.status(500).json({ message: 'Server error' });
    }
};

export const uploadProfileImage = async (req, res) => {
    try {
        // Get customer ID from authenticated user (set by auth middleware)
        const customerId = req.user.id;

        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }

        const customer = await User.findById(customerId);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        // Update profile image path
        const imageUrl = `/uploads/${req.file.filename}`;
        customer.profileImage = imageUrl;
        await customer.save();

        // Send Firebase push notification for profile image update
        try {
            await sendPushNotification({
                title: 'Profile Image Updated',
                body: 'Your profile image has been updated successfully.',
                data: {
                    type: 'profile_image_updated',
                    customerId: customer._id.toString(),
                    profileImage: imageUrl,
                },
                userIds: [customer._id],
            });
            console.log('📱 Push notification sent for profile image update');
        } catch (pushError) {
            console.error('Failed to send push notification for profile image:', pushError);
        }

        // Activity log: profile image updated (app)

        if (customer.role === 'customer') {
            await logActivity(req, {
                message: `Customer (${customer.email}) profile image updated`,
                status: 'updated'
            });
        }

        if (customer.role === 'agent') {
            await logActivity(req, {
                message: `Agent (${customer.email}) profile image updated`,
                status: 'updated'
            });
        }

        res.json({
            message: 'Profile image uploaded successfully',
            profileImage: imageUrl,
            customer
        });


    } catch (error) {
        console.error('Upload profile image error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteAccount = async (req, res) => {
    try {
        const customerId = req.user.id;

        const customer = await User.findById(customerId);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        // Soft delete the customer account instead of hard delete
        await User.findByIdAndUpdate(customerId, {
            isDeleted: true,
            deletedAt: new Date(),
            isActive: false
        });

        // Activity log: account deleted (app)
        await logActivity(req, {
            message: `App account deleted (${customer.email})`,
            status: 'deleted'
        });

        res.json({
            message: 'Account deleted successfully',
            deleted: {
                customer: customer.name
            }
        });


    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ message: 'Server error while deleting account' });
    }
};

export const newProfileUpdate = async (req, res) => {
    try {
        // Get user ID from authenticated user (set by auth middleware)
        const userId = req.user.id;
        const { name, email, phone, company_name } = req.body;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        // Update name if provided
        if (name) {
            user.name = name.trim();
        }

        // Update email if provided
        if (email) {
            const emailRegex = /^\S+@\S+\.\S+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Please provide a valid email' 
                });
            }
            
            // Check if email already exists for another user
            const existingUser = await User.findOne({ 
                email: email.toLowerCase(),
                _id: { $ne: userId }
            });
            
            if (existingUser) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Email already exists' 
                });
            }
            
            user.email = email.toLowerCase().trim();
        }

        // Update phone if provided
        if (phone) {
            const phoneDigits = String(phone).replace(/^\+1/, '').replace(/\D/g, '');
            if (phoneDigits.length !== 10) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Phone number must be exactly 10 digits' 
                });
            }
            
            // Check if phone already exists for another user
            const normalizedPhone = `+1${phoneDigits}`;
            const existingPhone = await User.findOne({
                $and: [
                    {
                        $or: [
                            { phone: normalizedPhone },
                            { phone: { $regex: phoneDigits } }
                        ]
                    },
                    { _id: { $ne: userId } }
                ]
            });
            
            if (existingPhone) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Phone number already exists' 
                });
            }
            
            user.phone = phoneDigits.trim(); // User model hook will add +1 automatically
        }
        if (company_name !== undefined) {
            user.company_name = company_name ? company_name.trim() : '';
        }

        await user.save();

        // Send Firebase push notification for profile update
        try {
            await sendPushNotification({
                title: 'Profile Updated',
                body: `Your profile has been updated successfully.`,
                data: {
                    type: 'profile_updated',
                    userId: user._id.toString(),
                    userName: user.name,
                },
                userIds: [user._id],
            });
            console.log('📱 Push notification sent for profile update');
        } catch (pushError) {
            console.error('Failed to send push notification for profile update:', pushError);
        }

        // Create in-app notification for profile update
        await createNotificationWithPush({
            title: 'Profile Updated',
            message: `Your profile information has been updated successfully`,
            type: 'info',
            category: user.role === 'agent' ? 'agent' : 'customer',
            userId: user._id,
            metadata: {
                userId: user._id,
                userName: user.name,
                userEmail: user.email
            }
        }, {
            pushData: {
                action: 'profile_updated',
                userId: user._id.toString(),
            }
        });

        // Activity log: profile updated
        if (user.role === 'customer') {
            await logActivity(req, {
                userId: user._id,
                message: `Customer (${user.email}) profile updated via new-profile-update`,
                status: 'updated'
            });
        } else if (user.role === 'agent') {
            await logActivity(req, {
                userId: user._id,
                message: `Agent (${user.email}) profile updated via new-profile-update`,
                status: 'updated'
            });
        }

        return res.status(200).json({ 
            success: true,
            message: 'Profile updated successfully', 
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    company_name: user.company_name,
                    profileImage: user.profileImage,
                    role: user.role
                }
            }
        });
    } catch (error) {
        console.error('New profile update error:', error);
        if (error?.code === 11000) {
            if (error?.keyPattern?.email) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Email already exists' 
                });
            }
            if (error?.keyPattern?.phone) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Phone number already exists' 
                });
            }
        }
        return res.status(500).json({ 
            success: false,
            message: 'Server error' 
        });
    }
};






