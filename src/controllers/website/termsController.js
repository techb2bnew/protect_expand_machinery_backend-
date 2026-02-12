import TermsAndConditions from '../../models/TermsAndConditions.js';
import { logActivity } from '../../utils/activityLogger.js';

// Get Terms and Conditions (for app)
export const getLatestTerms = async (req, res) => {
  try {
    const { type } = req.query;

    const terms = await TermsAndConditions.findOne({ type })
      .select('content')
      .lean();

    if (!terms) {
      return res.status(404).json({
        success: false,
        message: 'Terms and Conditions not found'
      });
    }

    res.json({
      success: true,
      data: terms
    });
  } catch (error) {
    console.error('Get latest terms error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching terms and conditions'
    });
  }
};

// Get Terms and Conditions (for admin)
export const getAllTerms = async (req, res) => {
  try {
    const { type } = req.query;

    const terms = await TermsAndConditions.findOne({ type })
      .select('content type')
      .lean();

    res.json({
      success: true,
      data: terms ? [terms] : []
    });
  } catch (error) {
    console.error('Get terms error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching terms and conditions'
    });
  }
};

// Create or Update Terms and Conditions (admin only)
export const createTerms = async (req, res) => {
  try {
    const { content, type = 'terms' } = req.body;
    const userId = req.user.id;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Content is required'
      });
    }

    if (!['terms', 'privacy_policy'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid type. Must be "terms" or "privacy_policy"'
      });
    }

    // Check if terms already exist for this type
    let terms = await TermsAndConditions.findOne({ type });

    const typeLabel = type === 'terms' ? 'Terms and Conditions' : 'Privacy Policy';

    if (terms) {
      // Update existing terms
      terms.content = content.trim();
      terms.updatedBy = userId;
      await terms.save();

      // Log activity
      await logActivity(req, {
        message: `${typeLabel} updated`,
        status: 'updated'
      });

      const updatedTerms = await TermsAndConditions.findById(terms._id)
        .select('content type')
        .lean();

      return res.json({
        success: true,
        message: `${typeLabel} updated successfully`,
        data: updatedTerms
      });
    } else {
      // Create new terms
      const newTerms = await TermsAndConditions.create({
        type,
        content: content.trim(),
        createdBy: userId,
        updatedBy: userId
      });

      // Log activity
      await logActivity(req, {
        message: `${typeLabel} created`,
        status: 'added'
      });

      const createdTerms = await TermsAndConditions.findById(newTerms._id)
        .select('content type')
        .lean();

      return res.status(201).json({
        success: true,
        message: `${typeLabel} created successfully`,
        data: createdTerms
      });
    }
  } catch (error) {
    console.error('Create/Update terms error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while saving terms and conditions'
    });
  }
};

// Update Terms and Conditions (admin only)
export const updateTerms = async (req, res) => {
  try {
    const { content, type = 'terms' } = req.body;
    const userId = req.user.id;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Content is required'
      });
    }

    if (!['terms', 'privacy_policy'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid type. Must be "terms" or "privacy_policy"'
      });
    }

    const terms = await TermsAndConditions.findOne({ type });
    const typeLabel = type === 'terms' ? 'Terms and Conditions' : 'Privacy Policy';

    if (!terms) {
      return res.status(404).json({
        success: false,
        message: `${typeLabel} not found. Please create it first.`
      });
    }

    terms.content = content.trim();
    terms.updatedBy = userId;
    await terms.save();

    // Log activity
    await logActivity(req, {
      message: `${typeLabel} updated`,
      status: 'updated'
    });

    const updatedTerms = await TermsAndConditions.findById(terms._id)
      .select('content type')
      .lean();

    res.json({
      success: true,
      message: `${typeLabel} updated successfully`,
      data: updatedTerms
    });
  } catch (error) {
    console.error('Update terms error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating terms and conditions'
    });
  }
};

