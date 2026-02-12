import Category from '../../models/Category.js';
import { getFirebaseMessaging } from '../../config/firebase.js';

/**
 * Get all categories for app
 */
export const getCategories = async (req, res) => {
  try {
    // Fetch only active categories, sorted by sortOrder
    const categories = await Category.find();

    // Send Firebase push notification - Direct test with hardcoded token
    // try {
    //   const messaging = getFirebaseMessaging();
            
    //   const message = {
    //     token: "cqlO4zxWTjWnjJYHsSy1v4:APA91bHLKeIhv6W11I7ttl-4K6rZyKAEXLbe-cHuDAiXZtG4Z3aaVo_V6tZsnTzaSn_U3hIO_5yTLj8T8DI3aUMcRQKGjzN49UxuiItCn5w4NFFNfWbA6kI",
    //     notification: {
    //       title: "Hello!",
    //       body: "This is a test notification from Node.js",
    //     },
    //   };

    //   console.log('message3333333333-----------------', message);


    
    //   const response = await messaging.send(message);
    //   console.log("✅ Notification sent successfully:", response);
    // } catch (notifError) {
    //   console.error("❌ Notification error:", notifError.message);``
    // }

    res.json({
      success: true,
      message: 'Categories fetched successfully',
      data: categories.map(cat => ({
        id: cat._id,
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        sortOrder: cat.sortOrder
      }))
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
};
