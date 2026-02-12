import mongoose from 'mongoose';

const { Schema } = mongoose;

const termsAndConditionsSchema = new Schema({
  type: {
    type: String,
    enum: ['terms', 'privacy_policy'],
    required: [true, 'Type is required'],
    default: 'terms'
  },
  content: {
    type: String,
    required: [true, 'Terms and Conditions content is required'],
    trim: true
  }
}, {
  timestamps: true
});

// Ensure unique type (only one document per type)
termsAndConditionsSchema.index({ type: 1 }, { unique: true });

// Ensure only one document exists
termsAndConditionsSchema.statics.getSingle = async function() {
  let terms = await this.findOne();
  return terms;
};

const TermsAndConditions = mongoose.models.TermsAndConditions || mongoose.model('TermsAndConditions', termsAndConditionsSchema);
export default TermsAndConditions;

