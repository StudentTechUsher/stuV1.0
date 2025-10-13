"use server";

/**
 * Email Service
 *
 * Handles email sending functionality using Resend
 */

import { Resend } from 'resend';

// Custom error types for better error handling
export class EmailConfigError extends Error {
  constructor(message = 'Email service not configured') {
    super(message);
    this.name = 'EmailConfigError';
  }
}

export class EmailSendError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'EmailSendError';
  }
}

export interface StudentSubmissionData {
  firstName: string;
  lastName: string;
  email: string;
  university: string;
  major: string;
  secondMajor?: string | null;
  minors?: (string | undefined)[];
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
