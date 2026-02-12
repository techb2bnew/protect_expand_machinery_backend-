import TermsAndConditions from '../../models/TermsAndConditions.js';

/**
 * Get Terms and Conditions for app
 */
export const getTermsAndConditions = async (req, res) => {
  try {
    const { type = 'terms' } = req.query;
    const terms = await TermsAndConditions.findOne({ type })
      .select('content')
      .lean();

    if (!terms) {
      return res.status(404).json({
        success: false,
        message: type === 'terms' ? 'Terms and Conditions not found' : 'Privacy Policy not found'
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
