import { NextRequest, NextResponse } from 'next/server';
import { ValidationError } from 'yup';
import {
  VALIDATION_OPTIONS,
  sendEmailSchema,
  type SendEmailInput,
} from '@/lib/validation/schemas';
import {
  sendStudentSubmissionEmail,
  EmailConfigError,
  EmailSendError,
} from '@/lib/services/emailService';
import { logError } from '@/lib/logger';

export async function POST(req: NextRequest) {
  return handleSendEmail(req);
}

async function handleSendEmail(req: NextRequest) {
  try {
    const body = await req.json();
    let data: SendEmailInput;

    try {
      data = await sendEmailSchema.validate(body, VALIDATION_OPTIONS);
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json(
          { error: 'Invalid request payload', details: error.errors },
          { status: 400 }
        );
      }
      throw error;
    }

    // Send email using service layer
    await sendStudentSubmissionEmail(data);

    return NextResponse.json({ success: 'Email sent successfully!' }, { status: 200 });
  } catch (error) {
    if (error instanceof EmailConfigError) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    if (error instanceof EmailSendError) {
      // Check for validation errors
      if (error.message.includes('Missing required fields')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      // CRITICAL: Do NOT log error details - may contain email body with PII
      logError('Email sending failed', error, {
        action: 'send_email',
      });
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    // CRITICAL: Do NOT log error object - may contain email body with PII (names, emails, majors)
    logError('Unexpected error sending email', error, {
      action: 'send_email',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
