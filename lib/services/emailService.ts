"use server";

/**
 * Email Service
 *
 * Handles email sending functionality using Resend
 */

import { Resend } from 'resend';
import { EmailConfigError, EmailSendError } from './errors/emailErrors';

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
 * AUTHORIZATION: ADVISORS AND ADMINS
 * Sends an email notification when a graduation plan is approved
 * @param data - Graduation plan approval data
 */
export async function sendGradPlanApprovalEmail(data: GradPlanApprovalData) {
  try {
    const apiKey = process.env.RESEND_API_KEY ?? process.env.NEXT_PUBLIC_RESEND_API_KEY;

    if (!apiKey) {
      console.error('Resend API key not configured - skipping email notification');
      return; // Don't throw error, just skip email
    }

    const resend = new Resend(apiKey);

    // Validate required fields
    if (!data.studentFirstName || !data.studentEmail || !data.planAccessId) {
      throw new EmailSendError('Missing required fields: studentFirstName, studentEmail, and planAccessId are required');
    }

    const planUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://stuplanning.com'}/dashboard/grad-plan/${data.planAccessId}`;
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
    await resend.emails.send({
      from: 'Stu Planning <notifications@stuplanning.com>',
      to: data.studentEmail,
      subject: '🎉 Your Graduation Plan Has Been Approved!',
      html: htmlBody,
      text: textBody,
    });

    console.log(`✅ Grad plan approval email sent to ${data.studentEmail}`);
  } catch (error) {
    console.error('Error sending grad plan approval email:', error);
    // Don't throw - we don't want to block the approval process if email fails
    if (error instanceof EmailSendError) {
      console.error('Email send error:', error.message);
    }
  }
}
