import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// For website APIs - checks User table
export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Authorization required.'
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback_secret'
    );

    // First check if user exists
    const user = await User.findOne({ email: decoded.email,  role: { $ne: 'customer' }  });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - User not found'
      });
    }

    // Check if account is deleted
    if (user.isDeleted) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deleted. Please contact support.'
      });
    }

    // Check if account is inactive
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive. Please contact support.'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// For app APIs - checks User table with customer role
export const appAuthenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Authorization required.'
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback_secret'
    );

    // First check if user exists
    const user = await User.findOne({ email: decoded.email, role: 'customer' }).select('+token');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - Customer not found'
      });
    }

    // Check if account is deleted
    if (user.isDeleted) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deleted. Please contact support.'
      });
    }

    // Check if account is inactive
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive. Please contact support.'
      });
    }

    // Check if token exists in database (user is logged in)
    if (!user.token || user.token !== token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - Please login again'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};


export const appLoggedInAuthenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Authorization required.'
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback_secret'
    );
    // First check if user exists
    const user = await User.findOne({ email: decoded.email, role: { $ne: 'manager' } }).select('+token');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - User not found'
      });
    }

    // Check if account is deleted
    if (user.isDeleted) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deleted. Please contact support.'
      });
    }

    // Check if account is inactive
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive. Please contact support.'
      });
    }

    // Check if token exists in database (user is logged in)
    if (!user.token || user.token !== token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - Please login again'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};


export const appAgentAuthenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Authorization required.'
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback_secret'
    );

    // First check if user exists (allow both agent and manager roles)
    const user = await User.findOne({ email: decoded.email, role: { $in: ['agent', 'manager'] } }).select('+token');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - Agent or Manager not found'
      });
    }

    // Check if account is deleted
    if (user.isDeleted) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deleted. Please contact support.'
      });
    }

    // Check if account is inactive
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive. Please contact support.'
      });
    }

    // Check if token exists in database (user is logged in)
    if (!user.token || user.token !== token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - Please login again'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

export const adminAuthenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Authorization required.'
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback_secret'
    );

    // First check if user exists
    const user = await User.findOne({ email: decoded.email,  role:  'manager' });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - User not found'
      });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};