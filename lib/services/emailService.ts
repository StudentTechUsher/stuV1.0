"use server";

/**
 * Email Service
 *
 * Handles email sending functionality using Resend
 */

import { Resend } from 'resend';
import { EmailConfigError, EmailSendError } from './errors/emailErrors';
import { logError } from '@/lib/logger';

export interface StudentSubmissionData {
  firstName: string;
  lastName: string;
  email: string;
  university: string;
  major: string;
  secondMajor?: string | null;
  minors?: (string | undefined)[];
}

export interface GradPlanApprovalData {
  studentFirstName: string;
  studentEmail: string;
  planAccessId: string;
  advisorName?: string;
}

export interface GradPlanCreatedData {
  studentFirstName: string;
  studentEmail: string;
  planAccessId: string;
}

export interface IssueReportData {
  description: string;
  stepsToReproduce?: string;
  pageUrl: string;
  sessionReplayUrl?: string;
  userEmail?: string;
  userRole?: string;
  reportUrl?: string;
}

/**
 * AUTHORIZATION: PUBLIC (used during onboarding)
 * Sends a student submission email to admin
 * @param data - Student submission data
 */
export async function sendStudentSubmissionEmail(data: StudentSubmissionData) {
  try {
    const apiKey = process.env.RESEND_API_KEY ?? process.env.NEXT_PUBLIC_RESEND_API_KEY;

    if (!apiKey) {
      throw new EmailConfigError();
    }

    const resend = new Resend(apiKey);

    // Validate required fields
    if (!data.firstName || !data.lastName || !data.email || !data.university || !data.major) {
      throw new EmailSendError('Missing required fields: firstName, lastName, email, university, and major are required');
    }

    // Prepare the email content
    let emailBody = `
      Name: ${data.firstName} ${data.lastName}
      Email: ${data.email}
      University: ${data.university}
      Major: ${data.major}
    `;

    // Add second major if provided
    if (data.secondMajor) {
      emailBody += `\nSecond Major: ${data.secondMajor}`;
    }

    // Add minors if selected
    if (data.minors && data.minors.length > 0) {
      emailBody += `\nMinors: ${data.minors.join(', ')}`;
    }

    // Send the email
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'admin@stuplanning.com',
      subject: 'New Student Submission',
      text: emailBody,
    });
  } catch (error) {
    if (error instanceof EmailConfigError || error instanceof EmailSendError) {
      throw error;
    }
    throw new EmailSendError('Unexpected error sending email', error);
  }
}

/**
 * AUTHORIZATION: PUBLIC (automatic system notification)
 * Sends an email notification when a graduation plan is created/generated
 * @param data - Graduation plan creation data
 */
export async function sendGradPlanCreatedEmail(data: GradPlanCreatedData) {
  console.log('📧 sendGradPlanCreatedEmail called with:', JSON.stringify(data));
  try {
    const apiKey = process.env.RESEND_API_KEY ?? process.env.NEXT_PUBLIC_RESEND_API_KEY;

    console.log('📧 Checking API key...');
    console.log('   - RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
    console.log('   - NEXT_PUBLIC_RESEND_API_KEY exists:', !!process.env.NEXT_PUBLIC_RESEND_API_KEY);
    console.log('   - Using API key:', apiKey ? 'YES (length: ' + apiKey.length + ')' : 'NO');

    if (!apiKey) {
      logError('Resend API key not configured - skipping email notification', new Error('ResendApiKeyMissing'), { action: 'sendGradPlanCreatedEmail' });
      return;
    }

    console.log('📧 Creating Resend client...');
    const resend = new Resend(apiKey);

    // Validate required fields
    console.log('📧 Validating required fields...');
    if (!data.studentFirstName || !data.studentEmail || !data.planAccessId) {
      logError('Missing required fields for grad plan email', new Error('MissingRequiredFields'), {
        action: 'sendGradPlanCreatedEmail',
        errorHint: JSON.stringify({
          studentFirstName: !!data.studentFirstName,
          studentEmail: !!data.studentEmail,
          planAccessId: !!data.planAccessId
        })
      });
      throw new EmailSendError('Missing required fields: studentFirstName, studentEmail, and planAccessId are required');
    }
    console.log('✅ All required fields present');

    const planUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://stuplanning.com'}/grad-plan/${data.planAccessId}`;

    // HTML email body
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .content {
              background: #ffffff;
              padding: 30px;
              border: 1px solid #e0e0e0;
              border-top: none;
              border-radius: 0 0 10px 10px;
            }
            .button {
              display: inline-block;
              background-color: #12f987;
              color: #0a1f1a;
              padding: 14px 28px;
              text-decoration: none;
              border-radius: 7px;
              font-weight: 600;
              margin-top: 20px;
              margin-bottom: 20px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0;">🎓 Your Graduation Plan is Ready!</h1>
          </div>
          <div class="content">
            <p>Hi ${data.studentFirstName},</p>

            <p>Great news! Your graduation plan has been generated and is now ready for review.</p>

            <p>You can view your plan, make adjustments, and track your progress toward graduation.</p>

            <div style="text-align: center;">
              <a href="${planUrl}" class="button">View Your Graduation Plan</a>
            </div>

            <p>If you have any questions or need to make changes to your plan, you can edit it directly or reach out to your academic advisor.</p>

            <p>Best regards,<br>The Stu Team</p>
          </div>
          <div class="footer">
            <p>This email was sent by Stu Planning</p>
            <p><a href="https://stuplanning.com">stuplanning.com</a></p>
          </div>
        </body>
      </html>
    `;

    // Plain text fallback
    const textBody = `
Hi ${data.studentFirstName},

Great news! Your graduation plan has been generated and is now ready for review.

You can view your plan, make adjustments, and track your progress toward graduation.

View your plan here: ${planUrl}

If you have any questions or need to make changes to your plan, you can edit it directly or reach out to your academic advisor.

Best regards,
The Stu Team

---
This email was sent by Stu Planning
stuplanning.com
    `;

    // Send the email
    console.log('📧 Calling resend.emails.send...');
    console.log('   - From: Stu Planning <notifications@stuplanning.com>');
    console.log('   - To:', data.studentEmail);
    console.log('   - Subject: 🎓 Your Graduation Plan is Ready!');

    const result = await resend.emails.send({
      from: 'Stu Planning <notifications@stuplanning.com>',
      to: data.studentEmail,
      subject: '🎓 Your Graduation Plan is Ready!',
      html: htmlBody,
      text: textBody,
    });

    console.log(`✅ Resend API response:`, result);
    console.log(`✅ Grad plan created email sent to ${data.studentEmail}`);
  } catch (error) {
    logError('Error sending grad plan created email', error, { action: 'sendGradPlanCreatedEmail' });
    if (error instanceof EmailSendError) {
      // already logged above, but keeping consistent structure
    }
  }
}

/**
 * AUTHORIZATION: ADVISORS AND ADMINS
 * Sends an email notification when a graduation plan is approved
 * @param data - Graduation plan approval data
 */
export async function sendGradPlanApprovalEmail(data: GradPlanApprovalData) {
  console.log('📧 sendGradPlanApprovalEmail called with:', JSON.stringify(data));
  try {
    const apiKey = process.env.RESEND_API_KEY ?? process.env.NEXT_PUBLIC_RESEND_API_KEY;

    console.log('📧 Checking API key...');
    console.log('   - RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
    console.log('   - NEXT_PUBLIC_RESEND_API_KEY exists:', !!process.env.NEXT_PUBLIC_RESEND_API_KEY);
    console.log('   - Using API key:', apiKey ? 'YES (length: ' + apiKey.length + ')' : 'NO');

    if (!apiKey) {
      logError('Resend API key not configured - skipping approval email', new Error('ResendApiKeyMissing'), { action: 'sendGradPlanApprovalEmail' });
      return; // Don't throw error, just skip email
    }

    console.log('📧 Creating Resend client...');
    const resend = new Resend(apiKey);

    // Validate required fields
    console.log('📧 Validating required fields...');
    if (!data.studentFirstName || !data.studentEmail || !data.planAccessId) {
      logError('Missing required fields for approval email', new Error('MissingRequiredFields'), {
        action: 'sendGradPlanApprovalEmail',
        errorHint: JSON.stringify({
          studentFirstName: !!data.studentFirstName,
          studentEmail: !!data.studentEmail,
          planAccessId: !!data.planAccessId
        })
      });
      throw new EmailSendError('Missing required fields: studentFirstName, studentEmail, and planAccessId are required');
    }
    console.log('✅ All required fields present');

    const planUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://stuplanning.com'}/grad-plan/${data.planAccessId}`;
    const advisorNameText = data.advisorName ? ` by ${data.advisorName}` : '';

    // HTML email body
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .content {
              background: #ffffff;
              padding: 30px;
              border: 1px solid #e0e0e0;
              border-top: none;
              border-radius: 0 0 10px 10px;
            }
            .button {
              display: inline-block;
              background-color: #12f987;
              color: #0a1f1a;
              padding: 14px 28px;
              text-decoration: none;
              border-radius: 7px;
              font-weight: 600;
              margin-top: 20px;
              margin-bottom: 20px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0;">🎉 Graduation Plan Approved!</h1>
          </div>
          <div class="content">
            <p>Hi ${data.studentFirstName},</p>

            <p>Great news! Your graduation plan has been approved${advisorNameText}.</p>

            <p>You can now view your active graduation plan and start tracking your progress toward graduation.</p>

            <div style="text-align: center;">
              <a href="${planUrl}" class="button">View Your Graduation Plan</a>
            </div>

            <p>If you have any questions or need to make changes to your plan, please reach out to your academic advisor.</p>

            <p>Best regards,<br>The Stu Team</p>
          </div>
          <div class="footer">
            <p>This email was sent by Stu Planning</p>
            <p><a href="https://stuplanning.com">stuplanning.com</a></p>
          </div>
        </body>
      </html>
    `;

    // Plain text fallback
    const textBody = `
Hi ${data.studentFirstName},

Great news! Your graduation plan has been approved${advisorNameText}.

You can now view your active graduation plan and start tracking your progress toward graduation.

View your plan here: ${planUrl}

If you have any questions or need to make changes to your plan, please reach out to your academic advisor.

Best regards,
The Stu Team

---
This email was sent by Stu Planning
stuplanning.com
    `;

    // Send the email
    console.log('📧 Calling resend.emails.send...');
    console.log('   - From: Stu Planning <notifications@stuplanning.com>');
    console.log('   - To:', data.studentEmail);
    console.log('   - Subject: 🎉 Your Graduation Plan Has Been Approved!');

    const result = await resend.emails.send({
      from: 'Stu Planning <notifications@stuplanning.com>',
      to: data.studentEmail,
      subject: '🎉 Your Graduation Plan Has Been Approved!',
      html: htmlBody,
      text: textBody,
    });

    console.log(`✅ Resend API response:`, result);
    console.log(`✅ Grad plan approval email sent to ${data.studentEmail}`);
  } catch (error) {
    logError('Error sending grad plan approval email', error, { action: 'sendGradPlanApprovalEmail' });
  }
}

/**
 * AUTHORIZATION: AUTHENTICATED USERS
 * Sends an issue report email to admin@stuplanning.com
 * @param data - Issue report data
 */
export async function sendIssueReportEmail(data: IssueReportData) {
  try {
    const apiKey = process.env.RESEND_API_KEY ?? process.env.NEXT_PUBLIC_RESEND_API_KEY;

    if (!apiKey) {
      throw new EmailConfigError();
    }

    const resend = new Resend(apiKey);

    // Validate required fields
    if (!data.description || !data.pageUrl) {
      throw new EmailSendError('Missing required fields: description and pageUrl are required');
    }

    // HTML email body
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 700px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
              color: white;
              padding: 25px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .content {
              background: #ffffff;
              padding: 30px;
              border: 1px solid #e0e0e0;
              border-top: none;
              border-radius: 0 0 10px 10px;
            }
            .section {
              margin-bottom: 25px;
            }
            .section-title {
              font-weight: 600;
              color: #0a0a0a;
              margin-bottom: 8px;
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .section-content {
              background: #f9fafb;
              padding: 15px;
              border-left: 3px solid #12f987;
              border-radius: 4px;
              white-space: pre-wrap;
            }
            .metadata {
              display: grid;
              grid-template-columns: 140px 1fr;
              gap: 10px;
              background: #f9fafb;
              padding: 15px;
              border-radius: 4px;
              font-size: 14px;
            }
            .metadata-label {
              font-weight: 600;
              color: #6b7280;
            }
            .metadata-value {
              color: #0a0a0a;
              word-break: break-all;
            }
            .button {
              display: inline-block;
              background-color: #12f987;
              color: #0a1f1a;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 7px;
              font-weight: 600;
              margin-top: 10px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0;">🐛 Issue Report from User</h1>
          </div>
          <div class="content">
            <div class="section">
              <div class="section-title">Issue Description</div>
              <div class="section-content">${data.description}</div>
            </div>

            ${data.stepsToReproduce ? `
            <div class="section">
              <div class="section-title">Steps to Reproduce</div>
              <div class="section-content">${data.stepsToReproduce}</div>
            </div>
            ` : ''}

            <div class="section">
              <div class="section-title">Technical Details</div>
              <div class="metadata">
                <div class="metadata-label">Page URL:</div>
                <div class="metadata-value">${data.pageUrl}</div>
                ${data.userEmail ? `
                <div class="metadata-label">User Email:</div>
                <div class="metadata-value">${data.userEmail}</div>
                ` : ''}
                ${data.userRole ? `
                <div class="metadata-label">User Role:</div>
                <div class="metadata-value">${data.userRole}</div>
                ` : ''}
                <div class="metadata-label">Timestamp:</div>
                <div class="metadata-value">${new Date().toISOString()}</div>
              </div>
            </div>

            ${data.sessionReplayUrl || data.reportUrl ? `
            <div class="section">
              <div class="section-title">Debugging Resources</div>
              ${data.reportUrl ? `<a href="${data.reportUrl}" class="button">View Full Report (JSON + Screenshot)</a>` : ''}
              ${data.sessionReplayUrl ? `<a href="${data.sessionReplayUrl}" class="button" style="margin-left: 10px;">View Session Replay in PostHog</a>` : ''}
            </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>This issue report was sent automatically from Stu Planning</p>
          </div>
        </body>
      </html>
    `;

    // Plain text fallback
    const textBody = `
🐛 ISSUE REPORT FROM USER

Issue Description:
${data.description}

${data.stepsToReproduce ? `Steps to Reproduce:\n${data.stepsToReproduce}\n\n` : ''}

Technical Details:
- Page URL: ${data.pageUrl}
${data.userEmail ? `- User Email: ${data.userEmail}\n` : ''}
${data.userRole ? `- User Role: ${data.userRole}\n` : ''}
- Timestamp: ${new Date().toISOString()}

${data.reportUrl ? `Full Report (JSON + Screenshot): ${data.reportUrl}\n` : ''}
${data.sessionReplayUrl ? `Session Replay: ${data.sessionReplayUrl}\n` : ''}

---
This issue report was sent automatically from Stu Planning
    `;

    // Send the email
    const result = await resend.emails.send({
      from: 'Stu Planning <issue-reports@stuplanning.com>',
      to: 'admin@stuplanning.com',
      subject: `🐛 Issue Report: ${data.description.substring(0, 50)}${data.description.length > 50 ? '...' : ''}`,
      html: htmlBody,
      text: textBody,
    });

    console.log(`✅ Issue report email sent to admin@stuplanning.com:`, result);
  } catch (error) {
    if (error instanceof EmailConfigError || error instanceof EmailSendError) {
      throw error;
    }
    throw new EmailSendError('Unexpected error sending issue report email', error);
  }
}
