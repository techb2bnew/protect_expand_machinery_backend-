import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

const userSchema = new Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: function() {
      return this.role === 'customer';
    },
    trim: true,
    default: '',
    unique: true,
    sparse: true
  },
  company_name: {
    type: String,
    trim: true,
    default: ''
  },
  profileImage: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['agent', 'manager', 'customer'],
    default: 'agent'
  },
  categoryIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  token: {
    type: String,
    default: null,
    select: false
  },
  emailVerified: {
    type: Boolean,
    default: function() {
      return this.role !== 'customer';
    }
  },
  emailVerificationOTP: {
    type: String,
    select: false
  },
  emailVerificationExpiry: {
    type: Date,
    select: false
  },
  status: {
    type: String,
    enum: ['online', 'offline'],
    default: 'offline'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    select: false
  },
  resetPasswordExpiry: {
    type: Date,
    select: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook for password hashing
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Pre-save hook for phone number - add country code if not present
userSchema.pre('save', function(next) {
  if (this.phone && this.isModified('phone')) {
    // Remove all non-digit characters first
    const phoneDigits = this.phone.replace(/\D/g, '');
    
    // If phone doesn't start with country code, add +1
    if (phoneDigits && !this.phone.startsWith('+1') && !this.phone.startsWith('1')) {
      // If it's 10 digits, add +1 prefix
      if (phoneDigits.length === 10) {
        this.phone = `+1${phoneDigits}`;
      } else if (phoneDigits.length === 11 && phoneDigits.startsWith('1')) {
        // If it's 11 digits starting with 1, add + prefix
        this.phone = `+${phoneDigits}`;
      } else {
        // Keep as is if format is different
        this.phone = phoneDigits;
      }
    } else if (phoneDigits && this.phone.startsWith('1') && !this.phone.startsWith('+1')) {
      // If starts with 1 but no +, add +
      this.phone = `+${phoneDigits}`;
    }
  }
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;


