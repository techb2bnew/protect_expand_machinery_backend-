import User from '../../models/User.js';
import Category from '../../models/Category.js';
import Notification from '../../models/Notification.js';
import { logActivity } from '../../utils/activityLogger.js';
import { sendPushNotification } from '../../services/pushNotificationService.js';
import { sendEmail } from '../../utils/emailService.js';

export const createAgent = async (req, res) => {
  try {
    const { name, email, phone, password, categoryId } = req.body;

    // Validate name is provided
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const fullName = name.trim();

    // Check if agent already exists by email
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Check if phone number already exists (if provided)
    if (phone) {
      const phoneDigits = String(phone).replace(/^\+1/, '').replace(/\D/g, '');
      if (phoneDigits.length !== 10) {
        return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
      }
      // Normalize phone number with country code for comparison
      const normalizedPhone = `+1${phoneDigits}`;
      const existingPhone = await User.findOne({ phone: normalizedPhone });
      if (existingPhone) {
        return res.status(400).json({ message: 'User with this phone number already exists' });
      }
    }

    // Validate password is provided
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    // Create agent (password will be hashed by pre-save hook)
    const agent = await User.create({
      name: fullName,
      email,
      password,
      role: 'agent',
      phone: phone ? String(phone).replace(/\D/g, '') : '', // Model hook will add +1 automatically if 10 digits
      categoryIds: categoryId || [],
      status: 'offline'
    });


    // Activity log: created
    await logActivity(req, {
      message: `Agent "${fullName}" has been added`,
      status: 'added'
    });

    // Send email to the new agent
    try {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="${process.env.APP_URL}/uploads/email.png" alt="Expand Machinery" style="max-width: 200px; height: auto; margin-bottom: 15px; display: block; margin-left: auto; margin-right: auto;" />
            <p style="color: #4b5563; font-size: 16px;">Agent Account Created</p>
          </div>
          <div style="background: #f9fafb; padding: 28px; border-radius: 14px; box-shadow: 0 10px 25px rgba(124,58,237,0.08);">
            <h2 style="color: #1f2937; font-size: 22px; margin-bottom: 16px;">Welcome ${fullName}!</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Your agent account has been successfully created. You can now access the Expand Machinery support dashboard using the credentials below:
            </p>
            <div style="background: #ffffff; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #e5e7eb;">
              <p style="color: #1f2937; font-size: 14px; margin: 8px 0;"><strong>Email:</strong> <span style="color: #7c3aed;">${email}</span></p>
              <p style="color: #1f2937; font-size: 14px; margin: 8px 0;"><strong>Password:</strong> <span style="color: #7c3aed; font-family: monospace;">${password}</span></p>
            </div>
            <div style="background: #eef2ff; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #4b5563; font-size: 14px; margin: 0; line-height: 1.6;">
                <strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.
              </p>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
              If you have any questions or need assistance, please contact the support team.
            </p>
          </div>
          <div style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 32px;">
            Expand Machinery • Management Team
          </div>
        </div>
      `;

      const emailResult = await sendEmail(
        email,
        'Welcome to Expand Machinery - Agent Account Created',
        emailHtml
      );

      if (emailResult.success) {
        console.log('📧 Welcome email sent to new agent');
      } else {
        console.error('Failed to send welcome email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Failed to send welcome email to new agent:', emailError);
    }

    // Send push notification to the new agent
    try {
      await sendPushNotification({
        title: 'Welcome to the Team!',
        body: `Your agent account has been created. Welcome aboard, ${fullName}!`,
        data: {
          type: 'agent_account_created',
          agentId: agent._id.toString(),
        },
        userIds: [agent._id],
      });
      console.log('📱 Push notification sent to new agent');
    } catch (pushError) {
      console.error('Failed to send push notification to new agent:', pushError);
    }

    res.status(201).json({
      success: true,
      message: 'Agent created successfully',
      data: {
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        phone: phone || '',
        role: agent.role,
        categoryIds: agent.categoryIds,
        status: agent.status || 'offline',
        createdAt: agent.createdAt
      }
    });
  } catch (error) {
    console.error('Create agent error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const getAgentsList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    // Build search query
    let searchQuery = { role: 'agent', isDeleted: false };
    if (search) {
      searchQuery = {
        role: 'agent',
        isDeleted: false,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      };
    }

    // Get total count for pagination
    const totalAgents = await User.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalAgents / limit);

    // Get paginated agents
    const agents = await User.find(searchQuery)
      .populate('categoryIds', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      message: 'Agents list fetched successfully',
      pagination: {
        currentPage: page,
        totalPages,
        totalAgents,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      },
      data: agents.map(a => ({
        _id: a._id,
        name: a.name,
        email: a.email,
        phone: a.phone || '',
        role: a.role,
        categoryIds: a.categoryIds,
        status: a.status || 'offline',
        isActive: a.isActive !== undefined ? a.isActive : true,
        createdAt: a.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const getAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const agent = await User.findOne({ _id: id, role: 'agent' }).populate('categoryIds', 'name');
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    res.json({
      success: true,
      data: {
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        phone: agent.phone || '',
        role: agent.role,
        categoryIds: agent.categoryIds,
        status: agent.status || 'offline',
        isActive: agent.isActive !== undefined ? agent.isActive : true,
        createdAt: agent.createdAt
      }
    });
  } catch (error) {
    console.error('Get agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const updateAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, password, categoryId } = req.body;

    const agent = await User.findOne({ _id: id, role: 'agent' });
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Keep original values to log changes later
    const original = {
      name: agent.name,
      email: agent.email,
      phone: agent.phone ?? '',
      categoryIds: Array.isArray(agent.categoryIds) ? [...agent.categoryIds] : agent.categoryIds,
    };

    // Update fields
    if (name && name.trim()) {
      agent.name = name.trim();
    }
    if (email) agent.email = email;
    if (phone !== undefined) {
      // Normalize phone number - extract digits only, remove +1 prefix if present
      const phoneDigits = phone ? String(phone).replace(/^\+1/, '').replace(/\D/g, '') : '';
      if (phone && phoneDigits.length !== 10) {
        return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
      }
      agent.phone = phoneDigits;
    }
    if (password && password.trim() !== '') {
      agent.password = password; // Will be hashed by pre-save hook
    }
    if (categoryId !== undefined) agent.categoryIds = categoryId;

    await agent.save();


    // Build changes message (exclude password)
    const changes = [];
    if (original.name !== agent.name) changes.push(`name: "${original.name}" -> "${agent.name}"`);
    if (original.email !== agent.email) changes.push(`email: "${original.email}" -> "${agent.email}"`);
    if ((original.phone || '') !== (agent.phone || '')) changes.push(`phone: "${original.phone || ''}" -> "${agent.phone || ''}"`);
    const originalCats = Array.isArray(original.categoryIds) ? original.categoryIds.join(',') : (original.categoryIds ?? '');
    const newCats = Array.isArray(agent.categoryIds) ? agent.categoryIds.join(',') : (agent.categoryIds ?? '');
    if (originalCats !== newCats) changes.push('categories: Changed');

    const changedText = changes.length ? ` (changes: ${changes.join(', ')})` : '';

    // Activity log: updated
    await logActivity(req, {
      message: `You have successfully updated agent "${agent.name}"${changedText}`,
      status: 'updated'
    });

    // Send push notification to the agent about profile update
    try {
      await sendPushNotification({
        title: 'Profile Updated',
        body: 'Your account information has been updated by the admin.',
        data: {
          type: 'agent_profile_updated',
          agentId: agent._id.toString(),
        },
        userIds: [agent._id],
      });
      console.log('📱 Push notification sent to agent for profile update');
    } catch (pushError) {
      console.error('Failed to send push notification for agent update:', pushError);
    }

    res.json({
      success: true,
      message: 'Agent updated successfully',
      data: {
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        phone: agent.phone || '',
        categoryIds: agent.categoryIds,
        createdAt: agent.createdAt
      }
    });
  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const deleteAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const agent = await User.findOne({ _id: id, role: 'agent' });
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    if (agent.isDeleted) {
      return res.status(400).json({ message: 'Agent is already deleted' });
    }


    agent.isDeleted = true;
    agent.deletedAt = new Date();
    await agent.save();

    // Store agent name before deletion for notification
    const agentName = agent.name;

    // Create notification for agent deletion
    await Notification.create({
      title: 'Agent Removed',
      message: `Agent ${agentName} has been deleted by you`,
      type: 'warning',
      category: 'agent',
      userId: req.user?.id,
      metadata: {
        agentId: agent._id,
        agentName: agentName,
        action: 'deleted'
      }
    });

    await logActivity(req, {
      message: `Agent "${agentName}" has been deleted`,
      status: 'deleted'
    });

    res.json({
      success: true,
      message: 'Agent deleted successfully'
    });
  } catch (error) {
    console.error('Delete agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const getCategoryList = async (req, res) => {
  try {
    const categoryList = await Category.find();
    res.json({
      success: true,
      data: categoryList
    });
  } catch (error) {
    console.error('Get category list error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const toggleAgentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const agent = await User.findById(id);
    
    if (!agent) {
      return res.status(404).json({ 
        success: false,
        message: 'Agent not found' 
      });
    }

    if (agent.role !== 'agent') {
      return res.status(400).json({ 
        success: false,
        message: 'User is not an agent' 
      });
    }

    // Toggle status
    const previousStatus = agent.isActive;
    agent.isActive = !agent.isActive;
    await agent.save();

    const action = agent.isActive ? 'activated' : 'deactivated';

    // Activity log
    await logActivity(req, {
      userId: agent._id,
      message: `Agent (${agent.email}) ${action}`,
      status: 'updated'
    });

    res.json({
      success: true,
      message: `Agent ${action} successfully`,
      data: agent
    });
  } catch (error) {
    console.error('Toggle agent status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const exportAgents = async (req, res) => {
  try {
    const search = req.query.search || '';

    // Build search query
    let searchQuery = { role: 'agent' };
    if (search) {
      searchQuery = {
        role: 'agent',
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      };
    }

    // Get all agents for export (no pagination)
    const agents = await User.find(searchQuery)
      .populate('categoryIds', 'name')
      .sort({ createdAt: -1 });

    // Format data for export
    const exportData = agents.map(agent => {
      const categories = agent.categoryIds?.map(cat =>
        typeof cat === 'object' ? cat.name : cat
      ).join(', ') || '';

      return {
        'Full Name': agent.name,
        'Email': agent.email,
        'Phone': agent.phone || 'N/A',
        'Status': agent.status || 'offline',
        'Departments': categories,
        'Created Date': new Date(agent.createdAt).toLocaleDateString('en-US'),
        'Created Time': new Date(agent.createdAt).toLocaleTimeString('en-US')
      };
    });

    res.json({
      success: true,
      message: 'Agents data exported successfully',
      count: exportData.length,
      data: exportData
    });
  } catch (error) {
    console.error('Export agents error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};