import ActivityLog from '../../models/ActivityLog.js';

export const getActivityLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { startDate, endDate } = req.query;

    // Base query
    const query = {};

    // Date filter logic
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate), // Greater than or equal to startDate
        $lte: new Date(endDate),   // Less than or equal to endDate
      };
    } else if (startDate) {
      query.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.createdAt = { $lte: new Date(endDate) };
    }

    // Get total count with filters
    const totalActivityLogs = await ActivityLog.countDocuments(query);
    const totalPages = Math.ceil(totalActivityLogs / limit);

    // Fetch logs with filters
    const activityLogs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email role');

    res.json({
      success: true,
      message: 'Activity logs fetched successfully',
      pagination: {
        total: totalActivityLogs,
        totalPages,
        currentPage: page,
        limit,
      },
      filters: {
        startDate,
        endDate,
      },
      data: activityLogs.map(a => ({
        _id: a._id,
        userId: a.userId,
        message: a.message,
        status: a.status,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching activity logs',
    });
  }
};
