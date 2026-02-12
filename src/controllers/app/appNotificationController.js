import Notification from '../../models/Notification.js';

// Get notifications for a user
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id; // Get user ID from decoded token
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50);

    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      Notification.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ userId })
    ]);

    const unreadCount = await Notification.countDocuments({ 
      userId, 
      isRead: false 
    });

    res.json({
      notifications,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findById(id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ 
      message: 'Notification marked as read', 
      notification 
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark all notifications as read for a user
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id; // Get user ID from decoded token
    
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    res.json({ 
      message: `${result.modifiedCount} notifications marked as read`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete single notification
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // Get user ID from decoded token
    
    const notification = await Notification.findOneAndDelete({ 
      _id: id, 
      userId: userId 
    });
    
    if (!notification) {
      return res.status(404).json({ 
        message: 'Notification not found or you do not have permission to delete it' 
      });
    }

    res.json({ 
      message: 'Notification deleted successfully',
      deletedNotification: notification
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};