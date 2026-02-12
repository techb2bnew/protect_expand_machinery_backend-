import mongoose from 'mongoose';

const { Schema } = mongoose;

const equipmentSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Equipment name is required'],
    unique: true,
    trim: true
  },
  serialNumber: {
    type: String,
    required: [true, 'Serial number is required'],
    unique: true,
    trim: true
  },
  modelNumber: {
    type: String,
    required: [true, 'Model number is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// name and serialNumber already have unique indexes from schema definition
equipmentSchema.index({ isActive: 1 });

const Equipment = mongoose.models.Equipment || mongoose.model('Equipment', equipmentSchema);
export default Equipment;

