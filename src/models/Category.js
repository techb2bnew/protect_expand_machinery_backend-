import mongoose from 'mongoose';

const { Schema } = mongoose;

const categorySchema = new Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  }
}, {
  timestamps: true
});

// name already has unique: true in schema, no need for separate index
categorySchema.index({ isActive: 1 });

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
export default Category;

