import User from '../../models/User.js';
import { signToken } from '../../utils/jwt.js';
import crypto from 'crypto';
import { sendPasswordResetEmail, sendPasswordResetConfirmation } from '../../utils/emailService.js';
import { logActivity } from '../../utils/activityLogger.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    const user = await User.create({ name, email, password, role });

    const token = signToken({ id: user._id, email: user.email, role: user.role, name: user.name });

    // Activity log: registration
    await logActivity(req, {
      userId: user._id,
      message: `User registered (${user.email})`,
      status: 'added'
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email , role: { $ne: 'customer' } }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if account is deleted
    if (user.isDeleted) {
      return res.status(401).json({ success: false, message: 'Account has been deleted. Please contact support.' });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signToken({ id: user._id, email: user.email, role: user.role, name: user.name });
    
    // Activity log: login based on role
    if (user.role === 'agent') {
      await logActivity(req, {
        userId: user._id,
        message: `Agent (${user.email}) logged in via the website`,
        status: 'login'
      });
    } else if (user.role === 'manager') {
      await logActivity(req, {
        userId: user._id,
        message: `Manager (${user.email}) logged in via the website`,
        status: 'login'
      });
    } 
    

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      }
    });

  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // First try to find in User collection (admin/manager/agent)
    let user = await User.findOne({ email });
    let userType = 'user';

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found with this email' });
    }
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive. Please contact support.'
      });
    }
    


    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Save reset token based on user type
    if (userType === 'user') {
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = resetTokenExpires;
      await user.save({ validateBeforeSave: false });
    } else {
      // Customer
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpiry = resetTokenExpires;
      await user.save();
    }

    // Send password reset email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    try {
      await sendPasswordResetEmail(user.email, resetToken, resetUrl);

      // Activity log: password reset requested
      await logActivity(req, {
        userId: user._id,
        message: `Password reset requested (${user.email})`,
        status: 'password_reset_requested'
      });

      return res.status(200).json({
        success: true,
        message: 'Password reset email sent successfully',
        data: {
          message: 'Check your email for password reset instructions'
        }
      });
    } catch (emailError) {
      console.error('Email sending failed:', {
        error: emailError.message,
        stack: emailError.stack,
        email: user.email,
        errorName: emailError.name
      });
      
      // Handle quota exceeded error
      if (emailError.name === 'QUOTA_EXCEEDED' || emailError.statusCode === 429) {
        // In development mode, return reset token for testing
        const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
        
        return res.status(429).json({
          success: false,
          message: 'Daily email sending quota has been exceeded. Please try again tomorrow or contact support for assistance.',
          errorType: 'QUOTA_EXCEEDED',
          ...(isDevelopment && {
            developmentMode: true,
            resetToken: resetToken,
            resetUrl: resetUrl,
            note: 'Reset token provided for development/testing purposes only'
          })
        });
      }
      
      // Handle configuration errors
      if (emailError.message.includes('not configured')) {
        return res.status(500).json({
          success: false,
          message: 'Email service is not configured. Please contact administrator.'
        });
      }
      
      // Return more specific error message
      const errorMessage = emailError.message || 'Failed to send password reset email';
      return res.status(500).json({
        success: false,
        message: errorMessage.includes('Email service error') 
          ? errorMessage.replace('Email service error: ', '')
          : 'Failed to send password reset email. Please try again later.'
      });
    }
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }

    // First try to find in User collection (admin/manager/agent)
    let user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    }).select('+resetPasswordToken +resetPasswordExpires');

    let userType = 'user';
    let userEmail = '';

    if (user) {
      userType = 'user';
      userEmail = user.email;
      console.log('Found admin/agent user:', user.email);
    }

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    // Update password based on user type
    if (userType === 'user') {
      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
    } else {
      // Customer
      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpiry = undefined;
    }

    await user.save();

    // Activity log: password reset
    await logActivity(req, {
      userId: user._id,
      message: `Password reset successful (${user.email})`,
      status: 'password_reset'
    });

    // Send confirmation email
    try {
      await sendPasswordResetConfirmation(userEmail);
    } catch (emailError) {
      console.error('Confirmation email failed:', emailError);
    }

    return res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const { id, email, role } = req.user || {};
    // Activity log: logout
    await logActivity(req, {
      userId: id,
      message: role === 'manager'
        ? `You have successfully logged out of the system (${email})`
        : `Agent (${email}) logged out via the website`,
      status: 'logout'
    });

    return res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
};


export default { register, login, forgotPassword, resetPassword, logout };


