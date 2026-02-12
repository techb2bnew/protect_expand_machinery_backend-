import jwt from 'jsonwebtoken';
import User from '../../models/User.js';
import { generateToken } from '../../utils/jwt.js';
import {
  sendAppPasswordResetEmail,
  sendPasswordResetConfirmation,
  sendCustomerWelcomeEmail,
  sendAdminRegistrationEmail,
  sendEmailVerificationOtp,
} from '../../utils/emailService.js';
import { logActivity } from '../../utils/activityLogger.js';
import {
  registerDeviceToken,
  sendPushNotification,
} from '../../services/pushNotificationService.js';
import {
  createNotificationWithPush,
  insertNotificationsWithPush,
} from '../../services/notificationDeliveryService.js';
import { getIO } from '../../socket/index.js';

/**
 * Customer Login (App) Agent Login
 */
export const login = async (req, res) => {
  try {
    const { email, password, fcmToken, platform } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // First check if user exists
    const customer = await User.findOne({ email, role: { $ne: 'manager' } }).select('+password');

    if (!customer) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is deleted
    if (customer.isDeleted) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deleted. Please contact support.'
      });
    }

    // Check if account is inactive
    if (!customer.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account is inactive. Please contact support.'
      });
    }

    // Check password using comparePassword method
    const isPasswordValid = await customer.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (customer.role === 'customer' && !customer.emailVerified) {
      const verificationOtp = Math.floor(100000 + Math.random() * 900000).toString();

      try {
        await sendEmailVerificationOtp({
          name: customer.name,
          email: customer.email,
          otp: verificationOtp,
        });
      } catch (otpError) {
        console.error('Failed to send email verification OTP:', otpError);
      }


      return res.status(403).json({
        success: false,
        message: 'Please verify your email address to continue.',
        data: {
          emailVerified: false,
          emailVerificationRequired: true
        }
      });
    }

    // Generate token
    const token = generateToken({
      id: customer._id,
      email: customer.email,
      role: customer.role
    });

    // Save token to database
    customer.token = token;
    
    
    await customer.save();
    console.log('fcmToken-----------------', fcmToken);
    // Register FCM token in DeviceToken collection for push notifications
    if (fcmToken) {
      try {
        await registerDeviceToken({
          userId: customer._id,
          fcmToken: fcmToken,
          platform: platform || 'android',
        });
      } catch (fcmError) {
        console.error('Failed to register FCM token during login:', fcmError);
        // Don't fail login if FCM registration fails
      }
    }

    // Register or refresh device token
    if (customer.role === 'agent') {
      await logActivity(req, {
        userId: customer._id,
        message: `Agent (${customer.email}) logged in via the app`,
        status: 'login'
      });
    }

    if (customer.role === 'customer') {
      await logActivity(req, {
        userId: customer._id,
        message: `Customer (${customer.email}) logged in Successfully`,
        status: 'login'
      });
    }

    // Split name into firstName and lastName
    const nameParts = customer.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        customer: {
          id: customer._id,
          name: customer.name,
          firstName,
          lastName,
          email: customer.email,
          phoneNumber: customer.phone,
          company_name: customer.company_name,
          role: customer.role,
        }
      }
    });


  } catch (error) {
    console.error('App login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Customer Registration (App)
 */
export const register = async (req, res) => {
  try {
    const {
      name,
      email,
      phoneNumber,
      password,
      company_name,
    } = req.body;

    // Validation
    if (!name || !email || !phoneNumber || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Phone validation (10-15 digits)
    const phoneDigits = phoneNumber.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be between 10 and 15 digits'
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if customer already exists with this email
    const existingCustomer = await User.findOne({ email, role: 'customer' });
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Check if phone already exists (search by digits only, ignoring formatting)
    const existingPhone = await User.findOne({
      role: 'customer',
      $or: [
        { phone: phoneDigits }, // Exact match for digits only
        { phone: { $regex: phoneDigits } } // Match if digits are contained in stored phone
      ]
    });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already exists'
      });
    }

    const customer = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phoneDigits, // For 15 digits, store digits only (User model hook will handle formatting)
      role: 'customer',
      password,
      company_name: company_name ? company_name.trim() : ''
    });

    // Generate token
    const token = generateToken({
      id: customer._id,
      email: customer.email,
      role: 'customer'
    });

    // Save token to database
    const verificationOtp = Math.floor(100000 + Math.random() * 900000).toString();
    customer.token = token;
    customer.emailVerified = false;
    customer.emailVerificationOTP = verificationOtp;
    customer.emailVerificationExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await customer.save();

    try {
      await sendEmailVerificationOtp({
        name: customer.name,
        email: customer.email,
        otp: verificationOtp,
      });
    } catch (otpError) {
      console.error('Failed to send email verification OTP:', otpError);
    }

    // Activity log: app registration
    await logActivity(req, {
      userId: customer._id,
      message: `Customer (${customer.email}) registered Successfully`,
      status: 'added'
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email address using the OTP sent to your email.',
      data: {
        // token,
        customer: {
          id: customer._id,
          name: customer.name,
          email: customer.email,
          phoneNumber: customer.phone,
          company_name: customer.company_name,
          emailVerified: customer.emailVerified,
        },
        emailVerificationRequired: true,
      }
    });


  } catch (error) {
    console.error('App registration error:', error);
    // Handle duplicate key errors
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
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * Register or update device token for push notifications
 */
export const registerDeviceTokenForUser = async (req, res) => {
  try {
    const { deviceToken, devicePlatform } = req.body;

    if (!deviceToken) {
      return res.status(400).json({
        success: false,
        message: 'deviceToken is required',
      });
    }

    const { record: tokenRecord, wasUpdated } = await registerDeviceToken({
      userId: req.user.id,
      fcmToken: deviceToken,
      platform: devicePlatform || 'android',
    });

    if (!tokenRecord) {
      return res.status(500).json({
        success: false,
        message: 'Unable to persist device token',
      });
    }

    return res.json({
      success: true,
      message: wasUpdated ? 'Device token updated successfully' : 'Device token registered successfully',
      data: {
        token: tokenRecord.token,
        platform: tokenRecord.platform,
        lastActiveAt: tokenRecord.lastActiveAt,
        updatedAt: tokenRecord.updatedAt,
      },
    });
  } catch (error) {
    console.error('Device token registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register device token',
    });
  }
};

export const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required.',
      });
    }

    const customer = await User.findOne({
      email: email.toLowerCase().trim(),
      role: 'customer',
    }).select('+emailVerificationOTP +emailVerificationExpiry +token');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Account not found. Please register first.',
      });
    }

    if (customer.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified.',
      });
    }

    if (!customer.emailVerificationOTP || !customer.emailVerificationExpiry) {
      return res.status(400).json({
        success: false,
        message: 'Verification OTP not found. Please request a new OTP.',
      });
    }

    if (customer.emailVerificationExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new OTP.',
      });
    }

    if (customer.emailVerificationOTP !== otp.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.',
      });
    }

    const authToken = generateToken({
      id: customer._id,
      email: customer.email,
      role: customer.role,
    });

    customer.emailVerified = true;
    customer.emailVerificationOTP = undefined;
    customer.emailVerificationExpiry = undefined;
    customer.token = authToken;
    await customer.save();



    try {
      await Promise.all([
        sendCustomerWelcomeEmail({ name: customer.name, email: customer.email, phone: customer.phone }),
        sendAdminRegistrationEmail({ 
          name: customer.name, 
          email: customer.email, 
          phone: customer.phone,
          registrationDate: customer.createdAt || new Date()
        }),
      ]);
    } catch (emailError) {
      console.error('Failed to send post-verification emails:', emailError);
    }

    // Send Firebase push notification for email verification
    try {
      await sendPushNotification({
        title: 'Email Verified Successfully',
        body: 'Welcome! Your email has been verified. You can now access all features.',
        data: {
          type: 'email_verified',
          userId: customer._id.toString(),
        },
        userIds: [customer._id],
      });
      console.log('📱 Push notification sent for email verification');
    } catch (pushError) {
      console.error('Failed to send email verification push notification:', pushError);
    }

    try {
      await createNotificationWithPush({
        title: 'Email Verified Successfully',
        message: 'Thank you! Your email address has been verified.',
        type: 'success',
        category: 'auth',
        userId: customer._id,
        metadata: {
          action: 'email_verified',
        },
      }, {
        pushData: {
          action: 'email_verified',
        },
      });

      const managers = await User.find({ role: 'manager', isActive: true });
      if (managers.length) {
        const managerNotifications = managers.map((manager) => ({
          title: 'Customer Email Verified',
          message: `Customer ${customer.name} (${customer.email}) has verified their email address.`,
          type: 'info',
          category: 'customer',
          userId: manager._id,
          metadata: {
            action: 'customer_email_verified',
            customerId: customer._id,
            customerEmail: customer.email,
          },
        }));
        await insertNotificationsWithPush(managerNotifications, {
          pushDataBuilder: (notification) => ({
            action: notification.metadata?.action,
            customerId: notification.metadata?.customerId,
            customerEmail: notification.metadata?.customerEmail,
          }),
        });
      }
    } catch (notificationError) {
      console.error('Failed to send verification notifications:', notificationError);
    }

    return res.json({
      success: true,
      message: 'Email verified successfully.',
      data: {
        token: authToken,
        customer: {
          id: customer._id,
          name: customer.name,
          email: customer.email,
          phoneNumber: customer.phone,
          company_name: customer.company_name,
          emailVerified: true,
        },
      },
    });
  } catch (error) {
    console.error('Verify email OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify email. Please try again.',
    });
  }
};

export const resendEmailVerificationOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required.',
      });
    }

    const customer = await User.findOne({
      email: email.toLowerCase().trim(),
      role: 'customer',
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Account not found. Please register first.',
      });
    }

    if (customer.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified.',
      });
    }

    const verificationOtp = Math.floor(100000 + Math.random() * 900000).toString();
    customer.emailVerificationOTP = verificationOtp;
    customer.emailVerificationExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await customer.save();

    try {
      await sendEmailVerificationOtp({
        name: customer.name,
        email: customer.email,
        otp: verificationOtp,
      });
    } catch (otpError) {
      console.error('Failed to resend verification OTP:', otpError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again later.',
      });
    }

    return res.json({
      success: true,
      message: 'Verification OTP has been resent to your email address.',
    });
  } catch (error) {
    console.error('Resend email OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resend verification OTP. Please try again.',
    });
  }
};

/**
 * Forgot Password (App)
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Find customer by email with role
    const customer = await User.findOne({ email: email.toLowerCase().trim(), role: { $ne: 'manager' } });

    if (!customer) {
      return res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetTokenExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Save OTP to customer (storing as resetPasswordToken)
    customer.resetPasswordToken = otp;
    customer.resetPasswordExpiry = resetTokenExpiry;
    await customer.save();

    // Send password reset email with OTP
    try {
      await sendAppPasswordResetEmail(customer.email, otp);

      // Send Firebase push notification for OTP sent
      try {
        await sendPushNotification({
          title: 'Password Reset OTP Sent',
          body: 'We have sent a password reset OTP to your email. Please check your inbox.',
          data: {
            type: 'password_reset_otp',
            userId: customer._id.toString(),
          },
          userIds: [customer._id],
        });
        console.log('📱 Push notification sent for password reset OTP');
      } catch (pushError) {
        console.error('Failed to send OTP push notification:', pushError);
      }

      // Activity log: app password reset requested
      if (customer.role === 'customer') {
        await logActivity(req, {
          userId: customer._id,
          message: `Customer (${customer.email}) password reset requested`,
          status: 'password_reset_requested'
        });
      }

      if (customer.role === 'agent') {
        await logActivity(req, {
          userId: customer._id,
          message: `Agent (${customer.email}) password reset requested`,
          status: 'password_reset_requested'
        });
      }


      return res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
        data: {
          message: 'Check your email for password reset instructions'
        }
      });
    } catch (emailError) {
      return res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
        otp: otp // Only for development/testing
      });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Verify OTP for password reset
 */
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validation
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // OTP validation (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: 'OTP must be 6 digits'
      });
    }

    // Find customer by email
    const customer = await User.findOne({
      email: email.toLowerCase().trim(),
      role: { $ne: 'manager' }
    }).select('+resetPasswordToken +resetPasswordExpiry');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if OTP exists
    if (!customer.resetPasswordToken) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found. Please request a new password reset.'
      });
    }

    // Check if OTP matches
    if (customer.resetPasswordToken !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Check if OTP is expired
    if (!customer.resetPasswordExpiry || Date.now() > customer.resetPasswordExpiry) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new password reset.'
      });
    }

    // Generate reset token for password reset
    const resetToken = generateToken({
      id: customer._id,
      email: customer.email,
      role: customer.role,
      purpose: 'password_reset'
    });

    // OTP verified successfully - return token for password reset
    return res.json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        email: customer.email,
        verified: true,
        resetToken: resetToken
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Reset password after OTP verification
 */
export const resetPassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    const resetToken = req.headers.authorization?.replace('Bearer ', '');

    // Validation
    if (!resetToken) {
      return res.status(401).json({
        success: false,
        message: 'Reset token is required. Please verify OTP first.'
      });
    }

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirm password are required'
      });
    }

    // Password validation
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirm password do not match'
      });
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET || 'fallback_secret');

      // Check if token is for password reset
      if (decoded.purpose !== 'password_reset') {
        return res.status(401).json({
          success: false,
          message: 'Invalid reset token'
        });
      }
    } catch (tokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired reset token. Please verify OTP again.'
      });
    }

    // Find customer by ID from token
    const customer = await User.findById(decoded.id).select('+password');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update password
    customer.password = newPassword;
    customer.resetPasswordToken = undefined;
    customer.resetPasswordExpiry = undefined;
    await customer.save();

    // Send Firebase push notification for password reset
    try {
      await sendPushNotification({
        title: 'Password Reset Successful',
        body: 'Your password has been reset successfully. You can now login with your new password.',
        data: {
          type: 'password_reset_success',
          userId: customer._id.toString(),
        },
        userIds: [customer._id],
      });
      console.log('📱 Push notification sent for password reset');
    } catch (pushError) {
      console.error('Failed to send password reset push notification:', pushError);
    }

    // Activity log: password reset
    if (customer.role === 'customer') {
      await logActivity(req, {
        userId: customer._id,
        message: `Customer (${customer.email}) password reset successfully`,
        status: 'password_reset'
      });
    }

    if (customer.role === 'agent') {
      await logActivity(req, {
        userId: customer._id,
        message: `Agent (${customer.email}) password reset successfully`,
        status: 'password_reset'
      });
    }

    return res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Customer Logout (App)
 */
export const logout = async (req, res) => {
  try {
    const customerId = req.user?.id;

    const customer = await User.findById(customerId);

    if (customer) {
      // Clear token from database
      customer.token = null;
      await customer.save();

      // Activity log: app logout
      if (customer.role === 'customer') {
        await logActivity(req, {
          userId: customer._id,
          message: `Customer (${customer.email}) logged out Successfully`,
          status: 'logout'
        });
      }
      if (customer.role === 'agent') {
        await logActivity(req, {
          userId: customer._id,
          message: `Agent (${customer.email}) logged out via the app`,
          status: 'logout'
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  }
};



export const onlineOfflineStatus = async (req, res) => {
  try {
    const { status } = req.params;
    if (status !== 'online' && status !== 'offline') {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Please use online or offline'
      });
    }
    const customerId = req.user?.id;
    const customer = await User.findById(customerId);
    if (customer) {
      customer.status = status;
      await customer.save();

      // Emit socket event for real-time status update
      try {
        const io = getIO();
        if (io && customer.role === 'customer') {
          io.emit('customer_status_update', {
            userId: customer._id.toString(),
            userEmail: customer.email,
            userName: customer.name,
            status: status,
            timestamp: new Date()
          });
        } else if (io && (customer.role === 'agent' || customer.role === 'admin' || customer.role === 'manager')) {
          io.emit('agent_status_update', {
            userId: customer._id.toString(),
            userEmail: customer.email,
            userName: customer.name,
            status: status,
            timestamp: new Date()
          });
        }
      } catch (socketError) {
        console.error('Error emitting socket event for status update:', socketError);
        // Don't fail the request if socket emit fails
      }
    }
    res.status(200).json({
      success: true,
      message: `${status} status updated successfully`
    });
  } catch (error) {
    console.error('Online offline status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};  