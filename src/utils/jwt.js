import jwt from 'jsonwebtoken';

export const signToken = (payload, options = {}) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '24h', ...options });
};

// Alias for backward compatibility
export const generateToken = signToken;




