import User from '../../models/User.js';
import Notification from '../../models/Notification.js';
import Ticket from '../../models/Ticket.js';
import { logActivity } from '../../utils/activityLogger.js';
import { sendPushNotification } from '../../services/pushNotificationService.js';
import { sendCustomerWelcomeEmail } from '../../utils/emailService.js';


export const createCustomer = async (req, res) => {
  try {
    const { firstName, lastName, name, email, phone, password, company_name } = req.body;

    // Prioritize name field, fallback to firstName+lastName for backward compatibility
    let fullName = '';
    if (name && name.trim()) {
      fullName = name.trim();
    } else if (firstName && lastName) {
      fullName = `${firstName.trim()} ${lastName.trim()}`;
    }

    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({ ok: false, success: false, message: 'Name, email, phone and password are required' });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ ok: false, success: false, message: 'Please provide a valid email' });
    }

    const phoneDigits = String(phone).replace(/^\+1/, '').replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      return res.status(400).json({ ok: false, success: false, message: 'Phone number must be exactly 10 digits' });
    }

    if (password.length < 6) {
      return res.status(400).json({ ok: false, success: false, message: 'Password must be at least 6 characters long' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ ok: false, success: false, message: 'Email already exists' });
    }

    // Check if phone already exists (search by digits only, ignoring formatting)
    // Since phone is stored with +1 prefix for old 10-digit numbers, search for the 15 digits pattern
    const existingPhone = await User.findOne({
      $or: [
        { phone: phoneDigits }, // Exact match for digits only
        { phone: { $regex: phoneDigits } } // Match if digits are contained in stored phone
      ]
    });
    if (existingPhone) {
      return res.status(400).json({ ok: false, success: false, message: 'Phone number already exists' });
    }

    const customer = await User.create({
      name: fullName,
      email: email.toLowerCase().trim(),
      phone: phoneDigits.trim(), // Model hook will add +1 automatically
      role: 'customer',
      password: password,
      emailVerified: true,
      company_name: company_name ? company_name.trim() : ''
    });

    // Get current user details for notifications
    const currentUser = req.user?.id ? await User.findById(req.user.id).select('name role') : null;
    const currentUserName = currentUser?.name || 'System';

    // Send notification to all managers (including current user if they are manager)
    const managers = await User.find({ role: 'manager', isActive: true });
    for (const manager of managers) {
      const isCurrentUser = String(manager._id) === String(req.user?.id);
      const actionBy = isCurrentUser ? 'you' : currentUserName;

      await Notification.create({
        title: 'New Customer Added',
        message: `Customer "${customer.name}" has been added by ${actionBy}`,
        type: 'success',
        category: 'customer',
        userId: manager._id,
        metadata: {
          customerId: customer._id,
          customerName: customer.name,
          customerEmail: customer.email,
          createdBy: currentUserName
        }
      });
    }

    // If current user is not a manager, send them a separate notification
    if (currentUser?.role !== 'manager') {
      await Notification.create({
        title: 'New Customer Added',
        message: `Customer "${customer.name}" has been added by you`,
        type: 'success',
        category: 'customer',
        userId: req.user?.id || 'system',
        metadata: {
          customerId: customer._id,
          customerName: customer.name,
          customerEmail: customer.email,
          createdBy: currentUserName
        }
      });
    }

    // Activity log: created
    await logActivity(req, {
      message: `Customer "${customer.name}" has been added`,
      status: 'added'
    });

    // Send welcome email to the new customer
    try {
      console.log('📧 Attempting to send welcome email to:', customer.email);
      const emailResult = await sendCustomerWelcomeEmail({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        password: password // Include password in welcome email
      });
      if (emailResult && emailResult.success) {
        console.log('✅ Welcome email sent successfully to:', customer.email);
      } else {
        console.error('❌ Failed to send welcome email. Result:', emailResult);
        if (emailResult && emailResult.error) {
          console.error('Email error details:', emailResult.error);
        }
      }
    } catch (emailError) {
      console.error('❌ Exception while sending welcome email to new customer:', emailError);
      console.error('Error stack:', emailError.stack);
    }

    // Send push notification to the new customer
    try {
      await sendPushNotification({
        title: 'Welcome to Expand Machinery!',
        body: `Your account has been created successfully. Welcome aboard, ${customer.name}!`,
        data: {
          type: 'account_created',
          customerId: customer._id.toString(),
        },
        userIds: [customer._id],
      });
      console.log('📱 Push notification sent to new customer');
    } catch (pushError) {
      console.error('Failed to send push notification to new customer:', pushError);
    }

    // Return only required fields
    const customerResponse = {
      _id: customer._id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      company_name: customer.company_name,
      profileImage: customer.profileImage,
      status: customer.status,
      isActive: customer.isActive,
      createdAt: customer.createdAt
    };

    res.status(201).json({ message: 'Customer created successfully', customer: customerResponse });
  } catch (error) {
    console.error('Create customer error:', error);
    if (error?.code === 11000) {
      if (error?.keyPattern?.email) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      if (error?.keyPattern?.phone) {
        return res.status(400).json({ message: 'Phone number already exists' });
      }
    }
    res.status(500).json({ message: 'Server error' });
  }
};

export const getCustomers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 100);
    const search = (req.query.search || '').toString().trim();

    // Get the logged-in user to check their role
    const loggedInUser = await User.findOne({ email: req.user.email });
    if (!loggedInUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    // Add role filter for customers and exclude deleted users
    query.role = 'customer';
    query.isDeleted = { $ne: true };
    query.emailVerified = true; // Only show customers with verified email

    // If user is an agent (not manager/admin), filter to show only assigned customers
    if (loggedInUser.role === 'agent') {
      // Find all tickets assigned to this agent
      const assignedTickets = await Ticket.find({ 
        assignedAgent: loggedInUser._id 
      }).select('customer');
      
      // Get unique customer IDs from assigned tickets (keep as ObjectId)
      const assignedCustomerIds = [...new Set(
        assignedTickets.map(ticket => ticket.customer.toString())
      )].filter(Boolean);
      
      // If no customers assigned, return empty result
      if (assignedCustomerIds.length === 0) {
        return res.json({
          page,
          limit,
          total: 0,
          totalPages: 0,
          customers: [],
        });
      }
      
      // Filter query to only include assigned customers
      query._id = { $in: assignedCustomerIds };
    }
    // If user is manager/admin, show all customers (no additional filter)

    const [customers, total] = await Promise.all([
      User.find(query).select('email name phone company_name profileImage status isActive createdAt').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(query),
    ]);

    // Return customers with name field (no need to split into firstName/lastName)
    const customersList = customers.map(customer => customer.toObject());

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      customers: customersList,
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await User.findById(id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json({ customer });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, name, email, phone, password, company_name } = req.body;
    const customer = await User.findById(id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Prioritize name field, fallback to firstName+lastName for backward compatibility
    if (name && name.trim()) {
      customer.name = name.trim();
    } else if (firstName && lastName) {
      customer.name = `${firstName.trim()} ${lastName.trim()}`;
    }
    if (email) {
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Please provide a valid email' });
      }
      const exists = await User.findOne({ email: email.toLowerCase() });
      if (exists && String(exists._id) !== String(customer._id)) {
        return res.status(400).json({ ok: false, success: false, message: 'Email already exists' });
      }
      customer.email = email.toLowerCase().trim();
    }
    if (phone) {
      const phoneDigits = String(phone).replace(/^\+1/, '').replace(/\D/g, '');
      if (phoneDigits.length !== 10) {
        return res.status(400).json({ ok: false, success: false, message: 'Phone number must be exactly 10 digits' });
      }
      // Check if phone already exists (search by digits only, ignoring formatting)
      const existingPhone = await User.findOne({
        $and: [
          {
            $or: [
              { phone: phoneDigits }, // Exact match for digits only
              { phone: { $regex: phoneDigits } } // Match if digits are contained in stored phone
            ]
          },
          { _id: { $ne: customer._id } }
        ]
      });
      if (existingPhone && String(existingPhone._id) !== String(customer._id)) {
        return res.status(400).json({ ok: false, success: false, message: 'Phone number already exists' });
      }
      customer.phone = phoneDigits.trim(); // For 15 digits, store digits only (User model hook will handle formatting)
    }
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ ok: false, success: false, message: 'Password must be at least 6 characters long' });
      }
      customer.password = password;
    }
    if (company_name !== undefined) {
      customer.company_name = company_name ? company_name.trim() : '';
    }
    await customer.save();

    // Get current user details for notifications
    const currentUser = req.user?.id ? await User.findById(req.user.id).select('name role') : null;
    const currentUserName = currentUser?.name || 'System';

    // Send notification to all managers (including current user if they are manager)
    const managers = await User.find({ role: 'manager', isActive: true });
    for (const manager of managers) {
      const isCurrentUser = String(manager._id) === String(req.user?.id);
      const actionBy = isCurrentUser ? 'you' : currentUserName;

      await Notification.create({
        title: 'Customer Updated',
        message: `Customer "${customer.name}" has been updated by ${actionBy}`,
        type: 'info',
        category: 'customer',
        userId: manager._id,
        metadata: {
          customerId: customer._id,
          customerName: customer.name,
          customerEmail: customer.email,
          updatedBy: currentUserName
        }
      });
    }

    // If current user is not a manager, send them a separate notification
    if (currentUser?.role !== 'manager') {
      await Notification.create({
        title: 'Customer Updated',
        message: `Customer "${customer.name}" has been updated by you`,
        type: 'info',
        category: 'customer',
        userId: req.user?.id || 'system',
        metadata: {
          customerId: customer._id,
          customerName: customer.name,
          customerEmail: customer.email,
          updatedBy: currentUserName
        }
      });
    }

    // Activity log: updated
    await logActivity(req, {
      message: `Customer "${customer.name}" has been updated`,
      status: 'updated'
    });

    // Send push notification to the customer about profile update
    try {
      await sendPushNotification({
        title: 'Profile Updated',
        body: 'Your account information has been updated by the admin.',
        data: {
          type: 'profile_updated_by_admin',
          customerId: customer._id.toString(),
        },
        userIds: [customer._id],
      });
      console.log('📱 Push notification sent to customer for profile update');
    } catch (pushError) {
      console.error('Failed to send push notification for customer update:', pushError);
    }

    // Return only required fields
    const customerResponse = {
      _id: customer._id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      company_name: customer.company_name,
      profileImage: customer.profileImage,
      status: customer.status,
      isActive: customer.isActive,
      createdAt: customer.createdAt
    };

    res.json({ message: 'Customer updated successfully', customer: customerResponse });
  } catch (error) {
    console.error('Update customer error:', error);
    if (error?.code === 11000) {
      if (error?.keyPattern?.email) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      if (error?.keyPattern?.phone) {
        return res.status(400).json({ message: 'Phone number already exists' });
      }
    }
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await User.findById(id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (customer.isDeleted) {
      return res.status(400).json({ message: 'Customer is already deleted' });
    }

    const customerName = customer.name;
    customer.isDeleted = true;
    customer.deletedAt = new Date();
    await customer.save();


    // Get current user details for notifications
    const currentUser = req.user?.id ? await User.findById(req.user.id).select('name role') : null;
    const currentUserName = currentUser?.name || 'System';

    await logActivity(req, {
      message: `Customer "${customerName}" has been deleted`,
      status: 'deleted'
    });

    // Send notification to all managers (including current user if they are manager)
    const managers = await User.find({ role: 'manager', isActive: true });
    for (const manager of managers) {
      const isCurrentUser = String(manager._id) === String(req.user?.id);
      const actionBy = isCurrentUser ? 'you' : currentUserName;

      await Notification.create({
        title: 'Customer Deleted',
        message: `Customer "${customerName}" has been deleted by ${actionBy}`,
        type: 'warning',
        category: 'customer',
        userId: manager._id,
        metadata: {
          customerId: id,
          customerName: customerName,
          deletedBy: currentUserName
        }
      });

    }

    // If current user is not a manager, send them a separate notification
    if (currentUser?.role !== 'manager') {
      await Notification.create({
        title: 'Customer Deleted',
        message: `Customer "${customerName}" has been deleted by you`,
        type: 'warning',
        category: 'customer',
        userId: req.user?.id || 'system',
        metadata: {
          customerId: id,
          customerName: customerName,
          deletedBy: currentUserName
        }
      });

    }

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getCustomerStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const endOfYesterday = new Date(startOfToday);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(startOfMonth);

    const [
      total,
      active,
      today,
      yesterday,
      thisMonth,
      lastMonth,
    ] = await Promise.all([
      User.countDocuments({ role: 'customer', isDeleted: { $ne: true } }),
      User.countDocuments({ isActive: true, role: 'customer', isDeleted: { $ne: true } }),
      User.countDocuments({ createdAt: { $gte: startOfToday }, role: 'customer', isDeleted: { $ne: true } }),
      User.countDocuments({ createdAt: { $gte: startOfYesterday, $lt: endOfYesterday }, role: 'customer', isDeleted: { $ne: true } }),
      User.countDocuments({ createdAt: { $gte: startOfMonth }, role: 'customer', isDeleted: { $ne: true } }),
      User.countDocuments({ createdAt: { $gte: startOfPrevMonth, $lt: endOfPrevMonth }, role: 'customer', isDeleted: { $ne: true } }),
    ]);

    const pct = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return res.json({
      totalCustomers: { value: total, change: pct(total, total - today) },
      activeCustomers: { value: active, change: 0 },
      newToday: { value: today, change: pct(today, yesterday) },
      newThisMonth: { value: thisMonth, change: pct(thisMonth, lastMonth) },
    });
  } catch (error) {
    console.error('Get customer stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const exportCustomersCsv = async (req, res) => {
  try {
    const search = (req.query.search || '').toString().trim();
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    query.role = 'customer';
    query.isDeleted = { $ne: true };
    const customers = await User.find(query).sort({ createdAt: -1 });
    const header = 'Name,Email,Phone,Created At\n';
    const rows = customers.map(c => {
      const cols = [c.name, c.email, c.phone, new Date(c.createdAt).toISOString()]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',');
      return cols;
    });
    const csv = header + rows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="customers.csv"');
    return res.status(200).send(csv);
  } catch (error) {
    console.error('Export customers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Activate customer
export const activateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await User.findById(id);
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (customer.role !== 'customer') {
      return res.status(400).json({ message: 'User is not a customer' });
    }

    if (customer.isActive) {
      return res.status(400).json({ message: 'Customer is already active' });
    }

    customer.isActive = true;
    await customer.save();

    // Get current user details for notifications
    const currentUser = req.user?.id ? await User.findById(req.user.id).select('name role') : null;
    const currentUserName = currentUser?.name || 'System';

    // Send notification to all managers
    const managers = await User.find({ role: 'manager', isActive: true });
    for (const manager of managers) {
      const isCurrentUser = String(manager._id) === String(req.user?.id);
      const actionBy = isCurrentUser ? 'you' : currentUserName;

      await Notification.create({
        title: 'Customer Activated',
        message: `Customer "${customer.name}" has been activated by ${actionBy}`,
        type: 'success',
        category: 'customer',
        userId: manager._id,
        metadata: {
          customerId: customer._id,
          customerName: customer.name,
          customerEmail: customer.email,
          activatedBy: currentUserName
        }
      });
    }

    // If current user is not a manager, send them a separate notification
    if (currentUser?.role !== 'manager') {
      await Notification.create({
        title: 'Customer Activated',
        message: `Customer "${customer.name}" has been activated by you`,
        type: 'success',
        category: 'customer',
        userId: req.user?.id || 'system',
        metadata: {
          customerId: customer._id,
          customerName: customer.name,
          customerEmail: customer.email,
          activatedBy: currentUserName
        }
      });
    }

    // Activity log
    await logActivity(req, {
      message: `Customer "${customer.name}" has been activated`,
      status: 'activated'
    });

    // Send push notification to the customer about activation
    try {
      await sendPushNotification({
        title: 'Account Activated',
        body: 'Your account has been activated. You can now access all features.',
        data: {
          type: 'account_activated',
          customerId: customer._id.toString(),
        },
        userIds: [customer._id],
      });
      console.log('📱 Push notification sent to customer for activation');
    } catch (pushError) {
      console.error('Failed to send push notification for customer activation:', pushError);
    }

    // Return only required fields
    const customerResponse = {
      _id: customer._id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      company_name: customer.company_name,
      profileImage: customer.profileImage,
      status: customer.status,
      isActive: customer.isActive,
      createdAt: customer.createdAt
    };

    res.json({ message: 'Customer activated successfully', customer: customerResponse });
  } catch (error) {
    console.error('Activate customer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Deactivate customer
export const deactivateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await User.findById(id);
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (customer.role !== 'customer') {
      return res.status(400).json({ message: 'User is not a customer' });
    }

    if (!customer.isActive) {
      return res.status(400).json({ message: 'Customer is already inactive' });
    }

    customer.isActive = false;
    await customer.save();

    // Get current user details for notifications
    const currentUser = req.user?.id ? await User.findById(req.user.id).select('name role') : null;
    const currentUserName = currentUser?.name || 'System';

    // Send notification to all managers
    const managers = await User.find({ role: 'manager', isActive: true });
    for (const manager of managers) {
      const isCurrentUser = String(manager._id) === String(req.user?.id);
      const actionBy = isCurrentUser ? 'you' : currentUserName;

      await Notification.create({
        title: 'Customer Deactivated',
        message: `Customer "${customer.name}" has been deactivated by ${actionBy}`,
        type: 'warning',
        category: 'customer',
        userId: manager._id,
        metadata: {
          customerId: customer._id,
          customerName: customer.name,
          customerEmail: customer.email,
          deactivatedBy: currentUserName
        }
      });
    }

    // If current user is not a manager, send them a separate notification
    if (currentUser?.role !== 'manager') {
      await Notification.create({
        title: 'Customer Deactivated',
        message: `Customer "${customer.name}" has been deactivated by you`,
        type: 'warning',
        category: 'customer',
        userId: req.user?.id || 'system',
        metadata: {
          customerId: customer._id,
          customerName: customer.name,
          customerEmail: customer.email,
          deactivatedBy: currentUserName
        }
      });
    }

    // Activity log
    await logActivity(req, {
      message: `Customer "${customer.name}" has been deactivated`,
      status: 'deactivated'
    });

    // Send push notification to the customer about deactivation
    try {
      await sendPushNotification({
        title: 'Account Deactivated',
        body: 'Your account has been deactivated. Please contact support for assistance.',
        data: {
          type: 'account_deactivated',
          customerId: customer._id.toString(),
        },
        userIds: [customer._id],
      });
      console.log('📱 Push notification sent to customer for deactivation');
    } catch (pushError) {
      console.error('Failed to send push notification for customer deactivation:', pushError);
    }

    // Return only required fields
    const customerResponse = {
      _id: customer._id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      company_name: customer.company_name,
      profileImage: customer.profileImage,
      status: customer.status,
      isActive: customer.isActive,
      createdAt: customer.createdAt
    };

    res.json({ message: 'Customer deactivated successfully', customer: customerResponse });
  } catch (error) {
    console.error('Deactivate customer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};



