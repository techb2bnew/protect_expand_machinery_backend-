import User from '../../models/User.js';
import path from 'path';
import { logActivity } from '../../utils/activityLogger.js';
import { sendPushNotification } from '../../services/pushNotificationService.js';
import bcrypt from 'bcryptjs';
// Get current user profile
export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
        role: user.role,
        status: user.status,
        categoryIds: user.categoryIds,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update user profile
export const updateProfile = async (req, res, next) => {
  try {
    const { name, email, phone, currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Check if email is being changed and if it's already taken
    if (email) {
      const existingUser = await User.findOne({ 
        email, 
        _id: { $ne: userId } 
      });
      
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email already in use' 
        });
      }
    }

    // Check if phone is being changed and if it's already taken
    if (phone) {
      const existingUser = await User.findOne({ 
        phone, 
        _id: { $ne: userId } 
      });
      
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'Phone number already in use' 
        });
      }
    }

    // Load current user WITH password field (important: +password)
    const currentUser = await User.findById(userId).select('+password');
    if (!currentUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const updateData = {};
    
    // Prepare update data for basic fields
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;

    // Handle password change if requested
    if (currentPassword && newPassword) {
      // Verify that current user has a password (should always have)
      if (!currentUser.password) {
        return res.status(400).json({ 
          success: false, 
          message: 'User password not found. Please contact administrator.' 
        });
      }

      // Debug: Log the comparison values
      console.log('Comparing password:', {
        providedPassword: currentPassword,
        hashedPassword: currentUser.password,
        hashedLength: currentUser.password?.length
      });

      // Verify current password
      let isMatch;
      try {
        // Make sure both values are strings
        if (typeof currentPassword !== 'string' || typeof currentUser.password !== 'string') {
          console.error('Password values are not strings:', {
            currentPasswordType: typeof currentPassword,
            dbPasswordType: typeof currentUser.password
          });
          return res.status(400).json({ 
            success: false, 
            message: 'Password format error' 
          });
        }

        isMatch = await bcrypt.compare(currentPassword, currentUser.password);
        console.log('Password match result:', isMatch);
        
      } catch (bcryptError) {
        console.error('Bcrypt compare error:', bcryptError);
        return res.status(400).json({ 
          success: false, 
          message: 'Error verifying current password' 
        });
      }
      
      if (!isMatch) {
        return res.status(400).json({ 
          success: false, 
          message: 'Current password is incorrect' 
        });
      }

      // Validate new password length
      if (newPassword.length < 6) {
        return res.status(400).json({ 
          success: false, 
          message: 'New password must be at least 6 characters long' 
        });
      }

      // Hash new password
      try {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(newPassword, salt);
        console.log('New password hashed successfully');
      } catch (hashError) {
        console.error('Password hash error:', hashError);
        return res.status(400).json({ 
          success: false, 
          message: 'Error updating password' 
        });
      }
    } else if ((currentPassword && !newPassword) || (!currentPassword && newPassword)) {
      // If only one password field is provided
      return res.status(400).json({ 
        success: false, 
        message: 'Both current password and new password are required to change password' 
      });
    }

    // Update user in database
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found after update' 
      });
    }

    // Activity log: profile updated with detailed old -> new values
    const changes = [];
    if (name && currentUser.name !== name) {
      changes.push(`name: "${currentUser.name || ''}" -> "${user.name || ''}"`);
    }
    if (email && currentUser.email !== email) {
      changes.push(`email: "${currentUser.email || ''}" -> "${user.email || ''}"`);
    }
    if (phone && currentUser.phone !== phone) {
      changes.push(`phone: "${currentUser.phone || ''}" -> "${user.phone || ''}"`);
    }
    // Add password change to activity log if password was changed
    if (currentPassword && newPassword) {
      changes.push('password: updated');
    }
    const changedText = changes.length ? ` (changes: ${changes.join(', ')})` : '';

    // Log activity based on user role
    if (user.role === 'manager') {
      await logActivity(req, {
        message: `You have successfully updated your profile${changedText}`,
        status: 'updated'
      });
    }
    if (user.role === 'agent') {
      await logActivity(req, {
        message: `Agent (${user.email}) profile updated${changedText}`,
        status: 'updated'
      });
    }


    return res.status(200).json({
      success: true,
      message: currentPassword && newPassword 
        ? 'Profile and password updated successfully' 
        : 'Profile updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
        role: user.role,
        status: user.status,
        categoryIds: user.categoryIds,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    next(error);
  }
};

// Upload/Update user profile image
export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }

    const userId = req.user.id;
    const relativePath = path.posix.join('uploads', req.file.filename);

    const user = await User.findByIdAndUpdate(
      userId,
      { profileImage: `/${relativePath}` },
      { new: true }
    ).select('-password');

    // Activity log: avatar updated
    if (user.role === 'manager') {
      await logActivity(req, {
        message: `You have successfully updated your profile image`,
        status: 'updated'
      });
    }
    if (user.role === 'agent') {
      await logActivity(req, {
        message: `Agent (${user.email}) profile image updated`,
        status: 'updated'
      });
    }

    // Send push notification for avatar update
    try {
      await sendPushNotification({
        title: 'Profile Image Updated',
        body: 'Your profile image has been updated successfully.',
        data: {
          type: 'avatar_updated',
          userId: user._id.toString(),
          profileImage: user.profileImage,
        },
        userIds: [user._id],
      });
      console.log('📱 Push notification sent for avatar update');
    } catch (pushError) {
      console.error('Failed to send push notification for avatar update:', pushError);
    }

    return res.status(200).json({
      success: true,
      message: 'Profile image updated successfully',
      user
    });
  } catch (error) {
    next(error);
  }
};



export default { getCurrentUser, updateProfile, uploadAvatar };


