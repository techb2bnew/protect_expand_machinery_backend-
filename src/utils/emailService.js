import SibApiV3Sdk from 'sib-api-v3-sdk';
import User from '../models/User.js';

// Initialize Brevo client
const getBrevoInstance = () => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('BREVO_API_KEY is not defined in environment variables');
  }
  
  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  const apiKeyAuth = defaultClient.authentications['api-key'];
  apiKeyAuth.apiKey = apiKey;
  
  return new SibApiV3Sdk.TransactionalEmailsApi();
};

// Generic email sending function
export const sendEmail = async (to, subject, htmlContent, textContent = null, replyTo = null) => {
  try {
    const apiInstance = getBrevoInstance();
    
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { name: 'Expand Machinery', email: process.env.BREVO_API_EMEAIL };
    sendSmtpEmail.to = Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }];
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    
    if (textContent) {
      sendSmtpEmail.textContent = textContent;
    }
    
    if (replyTo) {
      sendSmtpEmail.replyTo = { email: replyTo };
    }

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log('Email sent successfully:', result);
    return { success: true, data: result };
  } catch (error) {
    console.error('Email service error:', error);
    return { success: false, error: error.message || error };
  }
};

export const sendPasswordResetEmail = async (email, resetToken, resetUrl) => {
  try {
    // Check if BREVO_API_KEY is configured
    if (!process.env.BREVO_API_KEY) {
      console.error('BREVO_API_KEY is not configured in environment variables');
      throw new Error('Email service is not configured. Please contact administrator.');
    }

    const apiInstance = getBrevoInstance();
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { name: 'Expand Machinery', email: process.env.BREVO_API_EMEAIL };
    sendSmtpEmail.to = [{ email }];
    sendSmtpEmail.subject = 'Password Reset - Expand Machinery';
    sendSmtpEmail.htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${process.env.APP_URL}/uploads/email.png" alt="Expand Machinery" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
            <p style="color: #6b7280; font-size: 16px;">Password Reset Request</p>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 12px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 15px;">Reset Your Password</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              You requested to reset your password for your Expand Machinery account. 
              Click the button below to reset your password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #7c3aed, #a855f7); 
                        color: white; 
                        padding: 12px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: 600; 
                        font-size: 16px;
                        display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              This link will expire in 10 minutes for security reasons.
            </p>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <p style="color: #92400e; font-size: 14px; margin: 0;">
              <strong>Security Note:</strong> If you didn't request this password reset, please ignore this email. 
              Your password will remain unchanged.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px;">
              This email was sent from Expand Machinery Support System.<br>
              If you have any questions, please contact our support team.
            </p>
          </div>
        </div>
      `;

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log('Password reset email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Email service error details:', {
      message: error.message,
      stack: error.stack,
      email: email,
      response: error.response?.body
    });
    
    // Handle quota exceeded error specifically
    if (error.statusCode === 429 || error.response?.statusCode === 429) {
      const quotaError = new Error('Daily email sending quota exceeded. Please try again tomorrow or contact administrator to upgrade the email service plan.');
      quotaError.name = 'QUOTA_EXCEEDED';
      quotaError.statusCode = 429;
      throw quotaError;
    }
    
    // Re-throw with more context
    if (error.message.includes('BREVO_API_KEY') || error.message.includes('not configured')) {
      throw new Error('Email service is not configured. Please contact administrator.');
    }
    
    throw error;
  }
};

export const sendPasswordResetConfirmation = async (email) => {
  try {
    const apiInstance = getBrevoInstance();
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { name: 'Expand Machinery', email: 'hello@expand.shabad-guru.org' };
    sendSmtpEmail.to = [{ email }];
    sendSmtpEmail.subject = 'Password Reset Successful - Expand Machinery';
    sendSmtpEmail.htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${process.env.APP_URL}/uploads/email.png" alt="Expand Machinery" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
            <p style="color: #6b7280; font-size: 16px;">Password Reset Confirmation</p>
          </div>
          
          <div style="background: #f0fdf4; padding: 30px; border-radius: 12px; border-left: 4px solid #22c55e;">
            <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 15px;">✅ Password Reset Successful</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Your password has been successfully reset for your Expand Machinery account. 
              You can now log in with your new password.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.APP_URL || 'http://localhost:3000'}" 
               style="background: linear-gradient(135deg, #7c3aed, #a855f7); 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      font-weight: 600; 
                      font-size: 16px;
                      display: inline-block;">
              Login to App
            </a>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px;">
              This email was sent from Expand Machinery Mobile App.<br>
              If you have any questions, please contact our support team.
            </p>
          </div>
        </div>
      `;

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Email service error:', error);
    throw new Error('Failed to send confirmation email');
  }
};

export const sendEmailVerificationOtp = async ({ name, email, otp }) => {
  try {
    const apiInstance = getBrevoInstance();
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { name: 'Expand Machinery', email: 'hello@expand.shabad-guru.org' };
    sendSmtpEmail.to = [{ email }];
    sendSmtpEmail.subject = 'Verify Your Email - Expand Machinery App';
    sendSmtpEmail.htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="${process.env.APP_URL}/uploads/email.png" alt="Expand Machinery" style="max-width: 200px; height: auto; margin-bottom: 8px;" />
            <p style="color: #4b5563; font-size: 16px;">Email Verification</p>
          </div>
          <div style="background: #f9fafb; padding: 28px; border-radius: 14px; box-shadow: 0 10px 25px rgba(124,58,237,0.08);">
            <h2 style="color: #1f2937; font-size: 22px; margin-bottom: 16px;">Hi ${name || 'there'},</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Thank you for registering with Expand Machinery. Use the one-time password (OTP) below to verify your email address and complete your registration.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <div style="
                display: inline-block;
                background: #ffffff;
                color: #1f2937;
                padding: 18px 40px;
                border-radius: 16px;
                font-size: 32px;
                letter-spacing: 16px;
                font-weight: 700;
                box-shadow: 0 18px 35px rgba(124,58,237,0.18);
                border: 1px solid rgba(124,58,237,0.25);
              ">
                ${otp}
              </div>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 12px;">
              This OTP is valid for the next <strong>10 minutes</strong>. Please do not share it with anyone.
            </p>
            <p style="color: #9ca3af; font-size: 13px;">
              If you didn't create an account with Expand Machinery, please ignore this email.
            </p>
          </div>
          <div style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 32px;">
            Expand Machinery • Customer Support Team
          </div>
        </div>
      `;

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Email verification service error:', error);
    throw new Error('Failed to send verification email');
  }
};

export const sendAppPasswordResetEmail = async (email, otp) => {
  try {
    const apiInstance = getBrevoInstance();
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { name: 'Expand Machinery', email: 'hello@expand.shabad-guru.org' };
    sendSmtpEmail.to = [{ email }];
    sendSmtpEmail.subject = 'Password Reset OTP - Expand Machinery App';
    sendSmtpEmail.htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${process.env.APP_URL}/uploads/email.png" alt="Expand Machinery" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
            <p style="color: #6b7280; font-size: 16px;">Mobile App Password Reset</p>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 12px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 15px;">Reset Your App Password</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              You requested to reset your password for your Expand Machinery mobile app. 
              Use the OTP below to reset your password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background: #7c3aed; 
                          color: #ffffff; 
                          padding: 20px 40px; 
                          border-radius: 12px; 
                          font-weight: 700; 
                          font-size: 36px;
                          letter-spacing: 10px;
                          display: inline-block;
                          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                          border: 2px solid #6d28d9;">
                ${otp}
              </div>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px; text-align: center;">
              This OTP will expire in 10 minutes for security reasons.
            </p>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 10px; text-align: center;">
              <strong>Do not share this OTP with anyone.</strong>
            </p>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <p style="color: #92400e; font-size: 14px; margin: 0;">
              <strong>Security Note:</strong> If you didn't request this password reset, please ignore this email. 
              Your password will remain unchanged.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px;">
              This email was sent from Expand Machinery Mobile App.<br>
              If you have any questions, please contact our support team.
            </p>
          </div>
        </div>
      `;

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('App email service error:', error);
    throw new Error('Failed to send app password reset email');
  }
};

export const sendTicketCreationEmail = async (ticket, customer, agents = []) => {
  try {
    // Email to customer
    const customerEmailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <img src="${process.env.APP_URL}/uploads/email.png" alt="Expand Machinery" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
                </div>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h2 style="color: #28a745; margin: 0;">Ticket Created Successfully!</h2>
                </div>
                <div style="background-color: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px;">
                    <h3 style="color: #333; margin-top: 0;">Ticket Details</h3>
                    <p><strong>Ticket Number:</strong> ${ticket.ticketNumber}</p>
                    <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">${ticket.status.toUpperCase()}</span></p>
                    <p><strong>Description:</strong> ${ticket.description}</p>
                    <p><strong>Created Date:</strong> ${new Date(ticket.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin-top: 20px;">
                    <p style="margin: 0; color: #1976d2;">
                        <strong>Notes:</strong> An Expand tech will be reaching out to you in the next few hours.  Please note that the inquiries are responded in the order received.
                    </p>
                </div>
                <div style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
                    <p>Thank you for choosing Expand Machinery!</p>
                    <p>This is an automated message. Please do not reply to this email.</p>
                </div>
            </div>
        `;

    const results = [];

    // Send email to customer
    const customerResult = await sendEmail(
      customer.email,
      `Ticket Created - ${ticket.ticketNumber}`,
      customerEmailHtml
    );
    results.push({ type: 'customer', result: customerResult });

    // Manager email sending removed; use sendTicketAdminNotify instead

    // Send email to relevant agents (if any)
    if (agents && agents.length > 0) {
      const agentEmails = agents.map(a => a.email).filter(Boolean);
      if (agentEmails.length > 0) {
        const agentEmailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <img src="${process.env.APP_URL}/uploads/email.png" alt="Expand Machinery" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
                </div>
                <div style="background-color: #e0f2fe; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h2 style="color: #075985; margin: 0;">New Ticket In Your Category</h2>
                </div>
                <div style="background-color: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px;">
                    <h3 style="color: #333; margin-top: 0;">Ticket Information</h3>
                    <p><strong>Ticket Number:</strong> ${ticket.ticketNumber}</p>
                    <p><strong>Customer Name:</strong> ${customer.name}</p>
                    <p><strong>Description:</strong> ${ticket.description}</p>
                    <p><strong>Status:</strong> ${ticket.status}</p>
                    <p><strong>Created Date:</strong> ${new Date(ticket.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
                    <p>Please check your agent panel to take this ticket.</p>
                </div>
            </div>`;

        const agentsResult = await sendEmail(
          agentEmails,
          `New Ticket In Your Category - ${ticket.ticketNumber}`,
          agentEmailHtml
        );
        results.push({ type: 'agents', result: agentsResult });
      }
    }

    return results;
  } catch (error) {
    console.error('Error sending ticket creation emails:', error);
    return { success: false, error: error.message };
  }
};

export const sendTicketSupportTypeEmail = async (ticket, customer) => {
  try {
    const supportType = ticket.support_type;
    
    // Map support types to email addresses
    // const supportTypeEmailMap = {
    //   'applications_support': 'applications@expandmachinery.com',
    //   'parts_support': 'parts@expandmachinery.com',
    //   'service_support': 'service@expandmachinery.com',
    //   'sales_support': 'sales@expandmachinery.com'
    // };

    const supportTypeEmailMap = {
      'applications_support': 'applications@yopmail.com',
      'parts_support': 'parts@yopmail.com',
      'service_support': 'service@yopmail.com',
      'sales_support': 'sales@yopmail.com'
    };

    // Get email address based on support_type
    const recipientEmail = supportTypeEmailMap[supportType];
    
    if (!supportType || !recipientEmail) {
      console.log(`⚠️ Invalid or missing support_type (${supportType}), skipping support type email`);
      return { success: true, skipped: true };
    }

    const createdDate = ticket.createdAt 
      ? new Date(ticket.createdAt).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric'
        })
      : new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric'
        });

    const subject = `New ${supportType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Ticket - ${ticket.ticketNumber}`;
    
    console.log(`📧 Sending ${supportType} ticket email to:`, recipientEmail);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: #ffffff; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${process.env.APP_URL}/uploads/email.png" alt="Expand Machinery" style="max-width: 200px; height: auto; margin-bottom: 15px;" />
          </div>
          
          <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 20px; font-weight: 600;">New ${supportType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Ticket</h2>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            A new support ticket has been created and requires your attention.
          </p>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #7c3aed;">
            <h3 style="color: #1f2937; font-size: 18px; margin-bottom: 15px; font-weight: 600;">**Ticket Details**</h3>
            
            <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
              <strong style="color: #1f2937;">* Ticket Number:</strong> ${ticket.ticketNumber || 'N/A'}
            </p>
            
            <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
              <strong style="color: #1f2937;">* Support Type:</strong> ${supportType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </p>
            
            <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
              <strong style="color: #1f2937;">* Customer Name:</strong> ${customer.name || 'N/A'}
            </p>
            
            <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
              <strong style="color: #1f2937;">* Customer Email:</strong> ${customer.email || 'N/A'}
            </p>
            
            <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
              <strong style="color: #1f2937;">* Issue Description:</strong>
            </p>
            <div style="background-color: #ffffff; padding: 12px; border-radius: 6px; margin: 8px 0 16px 0; border: 1px solid #e5e7eb;">
              <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${ticket.description || 'No description provided'}</p>
            </div>
            
            ${ticket.control ? `
            <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
              <strong style="color: #1f2937;">* Control:</strong> ${ticket.control}
            </p>
            ` : ''}
            
            ${ticket.serialNumber ? `
            <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
              <strong style="color: #1f2937;">* Serial Number:</strong> ${ticket.serialNumber}
            </p>
            ` : ''}
            
        
            
            <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
              <strong style="color: #1f2937;">* Created On:</strong> ${createdDate}
            </p>
          </div>
          
          <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Please review the ticket and take appropriate action.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0;">
              This is an automated system notification.<br>
              Please do not reply to this email.
            </p>
          </div>
          
          <div style="margin-top: 20px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Regards,<br>
              <strong style="color: #6b7280;">Expand Machinery Support System</strong>
            </p>
          </div>
        </div>
      </div>`;

    const result = await sendEmail(recipientEmail, subject, html);
    console.log(`📧 ${supportType} ticket email result:`, result);
    return result;
  } catch (error) {
    console.error('❌ Error sending support type ticket email:', error);
    console.error('Error details:', error.message, error.stack);
    return { success: false, error: error.message };
  }
};

export const sendTicketAdminNotify = async (ticket, customer) => {
  try {
    const recipient = (process.env.ADMIN_EMAIL || '').trim();
    if (!recipient) {
      console.log('⚠️ ADMIN_EMAIL not configured, skipping admin ticket notification email');
      return { success: true, skipped: true };
    }

    // Get admin name
    const adminUser = await User.findOne({ email: recipient, role: 'manager' }).select('name');
    const adminName = adminUser?.name || 'Admin';

    const createdDate = ticket.createdAt 
      ? new Date(ticket.createdAt).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric'
        })
      : new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric'
        });

    const subject = `New Support Ticket Created - ${ticket.ticketNumber}`;
    
    console.log('📧 Sending admin ticket notification email to:', recipient);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: #ffffff; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${process.env.APP_URL}/uploads/email.png" alt="Expand Machinery" style="max-width: 200px; height: auto; margin-bottom: 15px;" />
          </div>
          
          <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 20px; font-weight: 600;">Hello ${adminName},</h2>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            A new support ticket has been created and requires your attention.
          </p>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #7c3aed;">
            <h3 style="color: #1f2937; font-size: 18px; margin-bottom: 15px; font-weight: 600;">**Ticket Details**</h3>
            
            <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
              <strong style="color: #1f2937;">* Ticket Number:</strong> ${ticket.ticketNumber || 'N/A'}
            </p>
            
            <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
              <strong style="color: #1f2937;">* Customer Name:</strong> ${customer.name || 'N/A'}
            </p>
            
            <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
              <strong style="color: #1f2937;">* Customer Email:</strong> ${customer.email || 'N/A'}
            </p>
            
            <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
              <strong style="color: #1f2937;">* Issue Description:</strong>
            </p>
            <div style="background-color: #ffffff; padding: 12px; border-radius: 6px; margin: 8px 0 16px 0; border: 1px solid #e5e7eb;">
              <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${ticket.description || 'No description provided'}</p>
            </div>
            
            <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
              <strong style="color: #1f2937;">* Status:</strong> <span style="text-transform: capitalize;">${ticket.status || 'pending'}</span>
            </p>
            
            <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
              <strong style="color: #1f2937;">* Created On:</strong> ${createdDate}
            </p>
          </div>
          
          <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Please review the ticket and assign it to the appropriate team member.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0;">
              This is an automated system notification.<br>
              Please do not reply to this email.
            </p>
          </div>
          
          <div style="margin-top: 20px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Regards,<br>
              <strong style="color: #6b7280;">Expand Machinery Support System</strong>
            </p>
          </div>
        </div>
      </div>`;

    const result = await sendEmail(recipient, subject, html);
    console.log('📧 Admin ticket notification email result:', result);
    return result;
  } catch (error) {
    console.error('❌ Error sending admin ticket notification email:', error);
    console.error('Error details:', error.message, error.stack);
    return { success: false, error: error.message };
  }
};

export const sendCustomerWelcomeEmail = async ({ name, email, phone, password }) => {
  try {
    if (!email) {
      console.error('❌ sendCustomerWelcomeEmail: Missing customer email');
      return { success: false, error: 'Missing customer email' };
    }
    console.log('📧 sendCustomerWelcomeEmail: Sending email to', email, 'for customer:', name);
    const result = await sendEmail(
      email,
      'Welcome to Expand Machinery',
      `<table role="presentation" width="100%" style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="text-align:center;padding:24px 24px 16px;">
            <img src="${process.env.APP_URL}/uploads/email.png" alt="Expand Machinery" style="max-width: 200px; height: auto; margin: 0;" />
          </td>
        </tr>
        <tr>
          <td style="padding:24px;color:#1f2937;font-size:16px;line-height:1.6;">
            <p style="margin:0 0 16px;">Hello ${name || 'there'},</p>
            <p style="margin:0 0 20px;font-size:20px;font-weight:600;">Welcome to Expand Machinery 👋</p>
            <p style="margin:0 0 24px;">We're glad to have you with us.</p>
            <p style="margin:0 0 24px;">Your account has been successfully created. You can now access the Expand Machinery support system using the credentials below:</p>
          </td>
        </tr>
        ${password ? `
        <tr>
          <td style="padding:0 24px 24px;">
            <div style="background:#ffffff;padding:20px;border-radius:12px;margin:0 0 24px;border:1px solid #e5e7eb;">
              <h3 style="margin:0 0 16px;color:#1f2937;font-size:18px;font-weight:600;">🔐 Your Login Credentials</h3>
              <p style="margin:8px 0;color:#1f2937;font-size:14px;"><strong>Email:</strong> <span style="color:#7c3aed;">${email}</span></p>
              <p style="margin:8px 0;color:#1f2937;font-size:14px;"><strong>Password:</strong> <span style="color:#7c3aed;font-family:monospace;">${password}</span></p>
            </div>
            <div style="background:#eef2ff;padding:16px;border-radius:8px;margin:20px 0;">
              <p style="color:#4b5563;font-size:14px;margin:0;line-height:1.6;">
                <strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.
              </p>
            </div>
          </td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding:0 24px 24px;">
            <h3 style="margin:0 0 16px;color:#1f2937;font-size:18px;font-weight:600;">🛠️ How Our Support Works</h3>
            <ul style="margin:0 0 24px;padding-left:20px;color:#1f2937;font-size:15px;line-height:1.8;">
              <li style="margin-bottom:10px;">🎫 Create a ticket anytime you need help</li>
              <li style="margin-bottom:10px;">💬 Chat with our support agents for quick assistance</li>
              <li style="margin-bottom:10px;">📊 Track ticket status (Pending, In Progress, Resolved, Closed)</li>
            </ul>
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px 24px;">
            <h3 style="margin:0 0 16px;color:#1f2937;font-size:18px;font-weight:600;">📌 What You Can Do Next</h3>
            <ul style="margin:0 0 24px;padding-left:20px;color:#1f2937;font-size:15px;line-height:1.8;">
              <li style="margin-bottom:10px;">Save your ticket numbers for quick reference</li>
              <li style="margin-bottom:10px;">Provide detailed information to help us resolve issues faster</li>
              <li style="margin-bottom:10px;">Respond promptly if our team requests additional details</li>
            </ul>
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px 24px;color:#1f2937;font-size:15px;line-height:1.6;">
            <p style="margin:0 0 20px;">Our technical team is committed to providing timely, reliable, and professional support to keep your operations running smoothly.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px;background:#f9fafb;color:#6b7280;font-size:12px;text-align:center;">
            This is an automated message. Please do not reply directly to this email.
          </td>
        </tr>
      </table>`
    );
    console.log('📧 sendCustomerWelcomeEmail: Email send result:', result);
    return result;
  } catch (error) {
    console.error('❌ sendCustomerWelcomeEmail: Exception occurred:', error);
    console.error('Error details:', error.message, error.stack);
    return { success: false, error: error.message || 'Unknown error' };
  }
};

export const sendAdminRegistrationEmail = async ({ name, email, phone, registrationDate }) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL?.trim();
    if (!adminEmail) {
      console.log('⚠️ ADMIN_EMAIL not configured, skipping admin registration email');
      return { success: true, skipped: true };
    }

    // Get admin name
    const adminUser = await User.findOne({ email: adminEmail, role: 'manager' }).select('name');
    const adminName = adminUser?.name || 'Admin';

    const formattedDate = registrationDate 
      ? new Date(registrationDate).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric'
        })
      : new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric'
        });

    const dashboardLink = process.env.FRONTEND_URL 
      ? `${process.env.FRONTEND_URL}/dashboard/customers`
      : '#';

    console.log('📧 Sending admin registration email to:', adminEmail);

    return await sendEmail(
      adminEmail,
      'New Customer Registration - Expand Machinery',
      `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: #ffffff; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${process.env.APP_URL}/uploads/email.png" alt="Expand Machinery" style="max-width: 200px; height: auto; margin-bottom: 15px;" />
          </div>
          
          <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 20px; font-weight: 600;">Hello ${adminName},</h2>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            A new customer has successfully registered on the Expand Machinery platform.
          </p>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #7c3aed;">
            <h3 style="color: #1f2937; font-size: 18px; margin-bottom: 15px; font-weight: 600;">**Customer Details**</h3>
            
            <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
              <strong style="color: #1f2937;">* Name:</strong> ${name || 'N/A'}
            </p>
            
            <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
              <strong style="color: #1f2937;">* Email:</strong> ${email || 'N/A'}
            </p>
            
            <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
              <strong style="color: #1f2937;">* Phone:</strong> ${phone || 'N/A'}
            </p>
            
            <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
              <strong style="color: #1f2937;">* Registration Date:</strong> ${formattedDate}
            </p>
            
          
          </div>
          
          <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            You can review and manage this customer directly from the admin dashboard.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0;">
              This is an automated notification from the Expand Machinery system.<br>
              No action is required unless follow-up is needed.
            </p>
          </div>
          
          <div style="margin-top: 20px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Regards,<br>
              <strong style="color: #6b7280;">Expand Machinery System</strong>
            </p>
          </div>
        </div>
      </div>`
    );
  } catch (error) {
    console.error('❌ Failed to send admin registration email:', error);
    console.error('Error details:', error.message, error.stack);
    return { success: false, error: error.message };
  }
};

export const buildReportIssueAdminEmail = ({
  reportId,
  name,
  email,
  phone,
  description,
  createdAt
}) => {
  const subject = `New Issue Reported - ${reportId}`;

  const createdDate = createdAt
    ? new Date(createdAt).toLocaleDateString('en-GB') // DD/MM/YYYY
    : 'N/A';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${process.env.APP_URL}/uploads/email.png" alt="Expand Machinery" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
      </div>
      <div style="background: #fff3cd; padding: 16px 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 16px;">
        <h2 style="color: #7c2d12; margin: 0;">New Issue Reported</h2>
      </div>
      <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
        <h3 style="margin-top: 0; color: #111827;">Reporter Details</h3>
        <p style="margin: 6px 0;"><strong>Name:</strong> ${name}</p>
        <p style="margin: 6px 0;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 6px 0;"><strong>Phone:</strong> ${phone || 'Not provided'}</p>
        <p style="margin: 6px 0;"><strong>Created At:</strong> ${createdDate}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
        <h3 style="color:#111827;">Issue Description</h3>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px;white-space:pre-wrap;">${description}</div>
      </div>
      <p style="color:#6b7280;font-size:12px;text-align:center;margin-top:16px;">
        This is an automated notification from Expand Machinery Support System.
      </p>
    </div>
  `;

  return { subject, html };
};


export const buildReportIssueUserEmail = ({ reportId, name, email, phone, description, createdAt }) => {
  const subject = `Issue Reported Successfully - ${reportId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="${process.env.APP_URL}/uploads/email.png" alt="Expand Machinery" style="max-width: 200px; height: auto; margin: 0 0 8px 0;" />
        <p style="color: #6b7280; margin: 8px 0 0;">Issue Report Confirmation</p>
      </div>
      <div style="background: #f0fdf4; padding: 20px; border-radius: 12px; border-left: 4px solid #22c55e;">
        <h2 style="color: #1f2937; margin-top: 0;">Issue Reported Successfully</h2>
        <p style="color:#4b5563;">Thank you for reporting the issue. Our team will review it shortly.</p>
        <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-top:12px;">
          <h3 style="margin-top:0;color:#111827;">Report Details</h3>
          <p style="margin:6px 0;"><strong>Your Name:</strong> ${name}</p>
          <p style="margin:6px 0;"><strong>Your Email:</strong> ${email}</p>
          <p style="margin:6px 0;"><strong>Your Phone:</strong> ${phone || 'Not provided'}</p>
          <p style="margin:6px 0;"><strong>Reported At:</strong> ${createdAt}</p>
          <p style="margin:10px 0 6px;"><strong>Issue Description:</strong></p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px;white-space:pre-wrap;">${description}</div>
        </div>
      </div>
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px;">This email was sent from Expand Machinery Support System.</p>
    </div>
  `;
  return { subject, html };
};

export const sendTicketUpdateStatusEmail = async (ticket, customer) => {
  try {
    const status = ticket.status.toLowerCase();
    const customerName = customer.name || 'Customer';
    const ticketNumber = ticket.ticketNumber || ticket._id;
    const dateObj = new Date(ticket.updatedAt || ticket.createdAt);
    // Format date in PST timezone
    const updatedDate = dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let subject = '';
    let customerEmailHtml = '';

    // Define email templates based on status
    switch (status) {
      case 'reopen':
      case 'reopened':
        subject = `Ticket Reopened - ${ticketNumber}`;
        customerEmailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="${process.env.APP_URL}/uploads/email.png" alt="Expand Machinery" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1f2937; margin: 0;">Ticket Reopened</h2>
            </div>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Hello ${customerName},
            </p>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              We wanted to inform you that your support ticket has been reopened for further review.
            </p>

            <div style="background-color: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">🎫 Ticket Details</h3>
              <p style="margin: 8px 0;"><strong>Ticket Number:</strong> ${ticketNumber}</p>
              <p style="margin: 8px 0;"><strong>Current Status:</strong> <span style="color: #7c3aed; font-weight: bold;">Reopened</span></p>
              <p style="margin: 8px 0;"><strong>Last Updated On:</strong> ${updatedDate}</p>
            </div>

            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-bottom: 20px;">
              <h3 style="color: #1e40af; margin-top: 0; margin-bottom: 15px;">🔧 What This Means</h3>
              <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>Your concern requires additional investigation or follow-up.</li>
                <li>Our support team is actively reviewing the issue again.</li>
                <li>You may be contacted for more details to help us resolve this faster.</li>
              </ul>
            </div>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              Thank you for your patience and cooperation. We're committed to ensuring your issue is fully resolved.
            </p>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">
                <strong>Warm regards,<br>Expand Machinery Support Team</strong>
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 15px;">
                This is an automated message. Please do not reply directly to this email.
              </p>
            </div>
          </div>
        `;
        break;

      case 'pending':
        subject = `Ticket Pending - ${ticketNumber}`;
        customerEmailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="${process.env.APP_URL}/uploads/email.png" alt="Expand Machinery" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
            </div>
            
            <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #92400e; margin: 0;">Ticket Pending</h2>
            </div>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Hello ${customerName},
            </p>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              Your support ticket is currently marked as Pending.
            </p>

            <div style="background-color: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">🎫 Ticket Details</h3>
              <p style="margin: 8px 0;"><strong>Ticket Number:</strong> ${ticketNumber}</p>
              <p style="margin: 8px 0;"><strong>Current Status:</strong> <span style="color: #f59e0b; font-weight: bold;">Pending</span></p>
              <p style="margin: 8px 0;"><strong>Last Updated On:</strong> ${updatedDate}</p>
            </div>

            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-bottom: 20px;">
              <h3 style="color: #1e40af; margin-top: 0; margin-bottom: 15px;">📌 What's Happening?</h3>
              <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>Your request has been received and is queued for review.</li>
                <li>Tickets are handled in the order they are received.</li>
                <li>Our team will reach out shortly once the investigation begins.</li>
              </ul>
            </div>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              We appreciate your patience and will keep you informed of any updates.
            </p>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">
                <strong>Best regards,<br>Expand Machinery Support Team</strong>
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 15px;">
                This is an automated message. Please do not reply directly to this email.
              </p>
            </div>
          </div>
        `;
        break;

      case 'in_progress':
        subject = `Ticket In Progress - ${ticketNumber}`;
        customerEmailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="${process.env.APP_URL}/uploads/email.png" alt="Expand Machinery" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
            </div>
            
            <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1e40af; margin: 0;">Ticket In Progress</h2>
            </div>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Hello ${customerName},
            </p>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              Good news! Your support ticket is now actively being worked on by our technical team.
            </p>

            <div style="background-color: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">🎫 Ticket Details</h3>
              <p style="margin: 8px 0;"><strong>Ticket Number:</strong> ${ticketNumber}</p>
              <p style="margin: 8px 0;"><strong>Current Status:</strong> <span style="color: #3b82f6; font-weight: bold;">In Progress</span></p>
              <p style="margin: 8px 0;"><strong>Assigned Team:</strong> Technical Support</p>
              <p style="margin: 8px 0;"><strong>Last Updated On:</strong> ${updatedDate}</p>
            </div>

            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-bottom: 20px;">
              <h3 style="color: #1e40af; margin-top: 0; margin-bottom: 15px;">🔍 What to Expect</h3>
              <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>Our specialists are diagnosing and resolving the issue.</li>
                <li>You may be contacted if additional information is required.</li>
                <li>We'll notify you once the issue is resolved.</li>
              </ul>
            </div>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              Thank you for your continued patience.
            </p>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">
                <strong>Sincerely,<br>Expand Machinery Support Team</strong>
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 15px;">
                This is an automated message. Please do not reply directly to this email.
              </p>
            </div>
          </div>
        `;
        break;

      case 'resolved':
        subject = `Ticket Resolved - ${ticketNumber}`;
        customerEmailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="${process.env.APP_URL}/uploads/email.png" alt="Expand Machinery" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
            </div>
            
            <div style="background-color: #d1fae5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #065f46; margin: 0;">Ticket Resolved</h2>
            </div>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Hello ${customerName},
            </p>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              We're happy to inform you that your support ticket has been successfully resolved.
            </p>

            <div style="background-color: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">🎫 Ticket Details</h3>
              <p style="margin: 8px 0;"><strong>Ticket Number:</strong> ${ticketNumber}</p>
              <p style="margin: 8px 0;"><strong>Current Status:</strong> <span style="color: #10b981; font-weight: bold;">Resolved</span></p>
              <p style="margin: 8px 0;"><strong>Resolution Date:</strong> ${updatedDate}</p>
            </div>

            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin-bottom: 20px;">
              <h3 style="color: #065f46; margin-top: 0; margin-bottom: 15px;">✔️ What's Next?</h3>
              <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>Please review the resolution provided.</li>
                <li>If everything looks good, no further action is needed.</li>
                <li>If the issue persists, you may reopen the ticket for further assistance.</li>
              </ul>
            </div>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              Your satisfaction is important to us. Thank you for choosing Expand Machinery.
            </p>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">
                <strong>Warm regards,<br>Expand Machinery Support Team</strong>
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 15px;">
                This is an automated message. Please do not reply directly to this email.
              </p>
            </div>
          </div>
        `;
        break;

      case 'closed':
        subject = `Ticket Closed - ${ticketNumber}`;
        customerEmailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="${process.env.APP_URL}/uploads/email.png" alt="Expand Machinery" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
            </div>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #374151; margin: 0;">Ticket Closed</h2>
            </div>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Hello ${customerName},
            </p>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              Your support ticket has now been closed.
            </p>

            <div style="background-color: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">🎫 Ticket Details</h3>
              <p style="margin: 8px 0;"><strong>Ticket Number:</strong> ${ticketNumber}</p>
              <p style="margin: 8px 0;"><strong>Final Status:</strong> <span style="color: #6b7280; font-weight: bold;">Closed</span></p>
              <p style="margin: 8px 0;"><strong>Closed On:</strong> ${updatedDate}</p>
            </div>

            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #6b7280; margin-bottom: 20px;">
              <h3 style="color: #374151; margin-top: 0; margin-bottom: 15px;">📝 Summary</h3>
              <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>The issue has been resolved and confirmed.</li>
                <li>No further action is required at this time.</li>
                <li>If you need additional help, you can always create a new support ticket.</li>
              </ul>
            </div>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              Thank you for trusting Expand Machinery. We're always here to help when you need us.
            </p>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">
                <strong>Best regards,<br>Expand Machinery Support Team</strong>
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 15px;">
                This is an automated message. Please do not reply directly to this email.
              </p>
            </div>
          </div>
        `;
        break;

      default:
        // Fallback for any other status
        subject = `Ticket Status Updated - ${ticketNumber}`;
        customerEmailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="${process.env.APP_URL}/uploads/email.png" alt="Expand Machinery" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
            </div>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #0d6efd; margin: 0;">Ticket Status Updated</h2>
            </div>
            <div style="background-color: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px;">
              <h3 style="color: #333; margin-top: 0;">Ticket Details</h3>
              <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
              <p><strong>Current Status:</strong> <span style="color: #0d6efd; font-weight: bold;">${ticket.status.toUpperCase()}</span></p>
              <p><strong>Last Updated:</strong> ${updatedDate}</p>
            </div>
            <div style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
              <p>Your ticket status has been updated. Please log in to your account for more details.</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        `;
    }

    const results = [];

    // Send email to customer
    const customerResult = await sendEmail(
      customer.email,
      subject,
      customerEmailHtml
    );

    results.push({ type: 'customer', result: customerResult });

    return results;
  } catch (error) {
    console.error('Error sending ticket status update email:', error);
    return { success: false, error: error.message };
  }
};

export const sendTicketStatusChangeAdminEmail = async (ticket, customer, changedBy = null, reason = null) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL?.trim();
    if (!adminEmail) {
      console.log('⚠️ ADMIN_EMAIL not configured, skipping admin ticket status change email');
      return { success: true, skipped: true };
    }

    // Get admin name
    const adminUser = await User.findOne({ email: adminEmail, role: 'manager' }).select('name');
    const adminName = adminUser?.name || 'Admin';

    const status = ticket.status?.toLowerCase() || 'pending';
    const ticketNumber = ticket.ticketNumber || ticket._id;
    const customerName = customer?.name || 'N/A';
    const customerEmail = customer?.email || 'N/A';
    
    const dateObj = new Date(ticket.updatedAt || ticket.createdAt);
    const formattedDate = dateObj.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });

    const changedByName = changedBy?.name || 'System';
    
    let subject = '';
    let html = '';

    // Generate email based on status
    switch (status) {
      case 'pending':
        subject = `Ticket Marked as Pending - ${ticketNumber}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: #ffffff; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <img src="${process.env.APP_URL}/uploads/email.png" alt="Expand Machinery" style="max-width: 200px; height: auto; margin-bottom: 15px;" />
              </div>
              
              <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 20px; font-weight: 600;">Hello ${adminName},</h2>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                A support ticket has been marked as <strong>Pending</strong> and is awaiting further action.
              </p>
              
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #f59e0b;">
                <h3 style="color: #1f2937; font-size: 18px; margin-bottom: 15px; font-weight: 600;">**Ticket Details**</h3>
                
                <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
                  <strong style="color: #1f2937;">* Ticket Number:</strong> ${ticketNumber}
                </p>
                
                <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
                  <strong style="color: #1f2937;">* Customer Name:</strong> ${customerName}
                </p>
                
                <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
                  <strong style="color: #1f2937;">* Customer Email:</strong> ${customerEmail}
                </p>
                
                <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
                  <strong style="color: #1f2937;">* Current Status:</strong> <span style="text-transform: capitalize; color: #f59e0b; font-weight: 600;">Pending</span>
                </p>
                
                <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
                  <strong style="color: #1f2937;">* Pending Since:</strong> ${formattedDate}
                </p>
              </div>
              
              ${reason ? `
              <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
                <h4 style="color: #92400e; font-size: 16px; margin: 0 0 10px 0; font-weight: 600;">**Reason for Pending**</h4>
                <p style="color: #78350f; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${reason}</p>
              </div>
              ` : ''}
              
              <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
                This ticket may require:
              </p>
              
              <ul style="color: #4b5563; font-size: 15px; line-height: 1.8; margin: 0 0 20px 20px; padding: 0;">
                <li style="margin-bottom: 8px;">Additional information from the customer, or</li>
                <li style="margin-bottom: 8px;">Review or action from the support/admin team.</li>
              </ul>
              
              <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
                Please follow up as necessary to move the ticket forward.
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0;">
                  This is an automated system notification.
                </p>
              </div>
              
              <div style="margin-top: 20px; text-align: center;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  Regards,<br>
                  <strong style="color: #6b7280;">Expand Machinery Support System</strong>
                </p>
              </div>
            </div>
          </div>`;
        break;

      case 'in_progress':
        const assignedAgentName = ticket.assignedAgent ? (typeof ticket.assignedAgent === 'object' ? ticket.assignedAgent.name : 'Agent') : 'Unassigned';
        subject = `Ticket In Progress - ${ticketNumber}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: #ffffff; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <img src="${process.env.APP_URL}/uploads/email.png" alt="Expand Machinery" style="max-width: 200px; height: auto; margin-bottom: 15px;" />
              </div>
              
              <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 20px; font-weight: 600;">Hello ${adminName},</h2>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                A support ticket has been picked up and marked as <strong>In Progress</strong>.
              </p>
              
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #3b82f6;">
                <h3 style="color: #1f2937; font-size: 18px; margin-bottom: 15px; font-weight: 600;">**Ticket Information**</h3>
                
                <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
                  <strong style="color: #1f2937;">* Ticket Number:</strong> ${ticketNumber}
                </p>
                
                <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
                  <strong style="color: #1f2937;">* Customer Name:</strong> ${customerName}
                </p>
                
                <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
                  <strong style="color: #1f2937;">* Assigned To:</strong> ${assignedAgentName}
                </p>
                
                <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
                  <strong style="color: #1f2937;">* Started On:</strong> ${formattedDate}
                </p>
              </div>
              
              <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
                The issue is now actively being worked on.
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0;">
                  This is an automated notification.
                </p>
              </div>
              
              <div style="margin-top: 20px; text-align: center;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  Regards,<br>
                  <strong style="color: #6b7280;">Expand Machinery Support System</strong>
                </p>
              </div>
            </div>
          </div>`;
        break;

      case 'resolved':
        subject = `Ticket Resolved - ${ticketNumber}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: #ffffff; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <img src="${process.env.APP_URL}/uploads/email.png" alt="Expand Machinery" style="max-width: 200px; height: auto; margin-bottom: 15px;" />
              </div>
              
              <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 20px; font-weight: 600;">Hello ${adminName},</h2>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                A support ticket has been successfully <strong>Resolved</strong>.
              </p>
              
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #10b981;">
                <h3 style="color: #1f2937; font-size: 18px; margin-bottom: 15px; font-weight: 600;">**Ticket Summary**</h3>
                
                <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
                  <strong style="color: #1f2937;">* Ticket Number:</strong> ${ticketNumber}
                </p>
                
                <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
                  <strong style="color: #1f2937;">* Customer Name:</strong> ${customerName}
                </p>
                
                <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
                  <strong style="color: #1f2937;">* Resolved By:</strong> ${changedByName}
                </p>
                
                <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
                  <strong style="color: #1f2937;">* Resolution Date:</strong> ${formattedDate}
                </p>
              </div>
              
              ${reason || ticket.notes?.length > 0 ? `
              <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #10b981;">
                <h4 style="color: #065f46; font-size: 16px; margin: 0 0 10px 0; font-weight: 600;">**Resolution Notes**</h4>
                <p style="color: #047857; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${reason || (ticket.notes && ticket.notes.length > 0 ? ticket.notes[ticket.notes.length - 1] : 'No notes provided')}</p>
              </div>
              ` : ''}
              
              <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
                The ticket is ready for closure or customer confirmation.
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0;">
                  Automated system message.
                </p>
              </div>
              
              <div style="margin-top: 20px; text-align: center;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  Regards,<br>
                  <strong style="color: #6b7280;">Expand Machinery Support System</strong>
                </p>
              </div>
            </div>
          </div>`;
        break;

      case 'closed':
        subject = `Ticket Closed - ${ticketNumber}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: #ffffff; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <img src="${process.env.APP_URL}/uploads/email.png" alt="Expand Machinery" style="max-width: 200px; height: auto; margin-bottom: 15px;" />
              </div>
              
              <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 20px; font-weight: 600;">Hello ${adminName},</h2>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                The following support ticket has been <strong>Closed</strong>.
              </p>
              
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #6b7280;">
                <h3 style="color: #1f2937; font-size: 18px; margin-bottom: 15px; font-weight: 600;">**Ticket Details**</h3>
                
                <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
                  <strong style="color: #1f2937;">* Ticket Number:</strong> ${ticketNumber}
                </p>
                
                <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
                  <strong style="color: #1f2937;">* Customer Name:</strong> ${customerName}
                </p>
                
                <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
                  <strong style="color: #1f2937;">* Closed By:</strong> ${changedByName}
                </p>
                
                <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
                  <strong style="color: #1f2937;">* Closed On:</strong> ${formattedDate}
                </p>
              </div>
              
              <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
                No further action is required unless the ticket is reopened.
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0;">
                  This is a system-generated notification.
                </p>
              </div>
              
              <div style="margin-top: 20px; text-align: center;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  Regards,<br>
                  <strong style="color: #6b7280;">Expand Machinery Support System</strong>
                </p>
              </div>
            </div>
          </div>`;
        break;

      case 'reopen':
      case 'reopened':
        subject = `Ticket Reopened - ${ticketNumber}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: #ffffff; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <img src="${process.env.APP_URL}/uploads/email.png" alt="Expand Machinery" style="max-width: 200px; height: auto; margin-bottom: 15px;" />
              </div>
              
              <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 20px; font-weight: 600;">Hello ${adminName},</h2>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                A previously closed ticket has been <strong>Reopened</strong> by the customer or support team.
              </p>
              
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #7c3aed;">
                <h3 style="color: #1f2937; font-size: 18px; margin-bottom: 15px; font-weight: 600;">**Ticket Details**</h3>
                
                <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
                  <strong style="color: #1f2937;">* Ticket Number:</strong> ${ticketNumber}
                </p>
                
                <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
                  <strong style="color: #1f2937;">* Customer Name:</strong> ${customerName}
                </p>
                
                <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
                  <strong style="color: #1f2937;">* Reopened On:</strong> ${formattedDate}
                </p>
              </div>
              
              ${reason ? `
              <div style="background-color: #f3e8ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #7c3aed;">
                <h4 style="color: #6b21a8; font-size: 16px; margin: 0 0 10px 0; font-weight: 600;">**Reason for Reopening**</h4>
                <p style="color: #7c3aed; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${reason}</p>
              </div>
              ` : ''}
              
              <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
                Please review and reassign the ticket as required.
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0;">
                  This is an automated alert.
                </p>
              </div>
              
              <div style="margin-top: 20px; text-align: center;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  Regards,<br>
                  <strong style="color: #6b7280;">Expand Machinery Support System</strong>
                </p>
              </div>
            </div>
          </div>`;
        break;

      default:
        // For any other status, send a generic notification
        subject = `Ticket Status Updated - ${ticketNumber}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: #ffffff; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <img src="${process.env.APP_URL}/uploads/email.png" alt="Expand Machinery" style="max-width: 200px; height: auto; margin-bottom: 15px;" />
              </div>
              
              <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 20px; font-weight: 600;">Hello ${adminName},</h2>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                A support ticket status has been updated.
              </p>
              
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #7c3aed;">
                <h3 style="color: #1f2937; font-size: 18px; margin-bottom: 15px; font-weight: 600;">**Ticket Details**</h3>
                
                <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
                  <strong style="color: #1f2937;">* Ticket Number:</strong> ${ticketNumber}
                </p>
                
                <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
                  <strong style="color: #1f2937;">* Customer Name:</strong> ${customerName}
                </p>
                
                <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
                  <strong style="color: #1f2937;">* New Status:</strong> <span style="text-transform: capitalize;">${status}</span>
                </p>
                
                <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 8px 0;">
                  <strong style="color: #1f2937;">* Updated On:</strong> ${formattedDate}
                </p>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0;">
                  This is an automated system notification.
                </p>
              </div>
              
              <div style="margin-top: 20px; text-align: center;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  Regards,<br>
                  <strong style="color: #6b7280;">Expand Machinery Support System</strong>
                </p>
              </div>
            </div>
          </div>`;
    }

    console.log('📧 Sending admin ticket status change email to:', adminEmail, 'for status:', status);
    const result = await sendEmail(adminEmail, subject, html);
    console.log('📧 Admin ticket status change email result:', result);
    return result;
  } catch (error) {
    console.error('❌ Error sending admin ticket status change email:', error);
    console.error('Error details:', error.message, error.stack);
    return { success: false, error: error.message };
  }
};

export const sendTicketAssignmentEmail = async (ticket, agent, customer) => {
  try {
    if (!agent || !agent.email) {
      console.error('❌ sendTicketAssignmentEmail: Missing agent email');
      return { success: false, error: 'Missing agent email' };
    }

    const ticketNumber = ticket.ticketNumber || ticket._id;
    const customerName = customer?.name || 'Customer';
    const customerEmail = customer?.email || 'N/A';
    const agentName = agent.name || 'Agent';
    
    const createdDate = ticket.createdAt 
      ? new Date(ticket.createdAt).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric'
        })
      : 'N/A';

    const assignedDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });

    console.log('📧 Sending ticket assignment email to agent:', agent.email, 'for ticket:', ticketNumber);

    const subject = `New Ticket Assigned to You - ${ticketNumber}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${process.env.APP_URL}/uploads/email.png" alt="Expand Machinery" style="max-width: 200px; height: auto; margin-bottom: 10px; display: block; margin-left: auto; margin-right: auto;" />
        </div>
        <div style="background-color: #e0f2fe; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #075985; margin: 0;">New Ticket Assigned to You</h2>
        </div>
        <div style="background-color: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px;">
          <h3 style="color: #333; margin-top: 0;">Ticket Information</h3>
          <p style="margin: 8px 0;"><strong>Ticket Number:</strong> ${ticketNumber}</p>
          <p style="margin: 8px 0;"><strong>Customer Name:</strong> ${customerName}</p>
          <p style="margin: 8px 0;"><strong>Customer Email:</strong> ${customerEmail}</p>
          <p style="margin: 8px 0;"><strong>Status:</strong> <span style="text-transform: capitalize;">${ticket.status || 'pending'}</span></p>
          <p style="margin: 8px 0;"><strong>Created Date:</strong> ${createdDate}</p>
          <p style="margin: 8px 0;"><strong>Assigned Date:</strong> ${assignedDate}</p>
          <p style="margin: 8px 0;"><strong>Description:</strong></p>
          <div style="background-color: #f9fafb; padding: 12px; border-radius: 6px; margin: 8px 0; border: 1px solid #e5e7eb;">
            <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${ticket.description || 'No description provided'}</p>
          </div>
        </div>
        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin-top: 20px;">
          <p style="margin: 0; color: #1976d2;">
            <strong>Action Required:</strong> Please review this ticket and start working on it. You can access the ticket from your agent dashboard.
          </p>
        </div>
        <div style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
          <p>Thank you for your continued support!</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    `;

    const result = await sendEmail(agent.email, subject, html);
    console.log('📧 Ticket assignment email result:', result);
    return result;
  } catch (error) {
    console.error('❌ Error sending ticket assignment email:', error);
    console.error('Error details:', error.message, error.stack);
    return { success: false, error: error.message || 'Unknown error' };
  }
};
