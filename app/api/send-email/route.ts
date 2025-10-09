import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { ValidationError } from 'yup';
import {
  VALIDATION_OPTIONS,
  sendEmailSchema,
  type SendEmailInput,
} from '@/lib/validation/schemas';
import { logError } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.RESEND_API_KEY ?? process.env.NEXT_PUBLIC_RESEND_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
    }
    
    const resend = new Resend(apiKey);
    
    const body = await req.json();
    let data: SendEmailInput;
    try {
      data = await sendEmailSchema.validate(body, VALIDATION_OPTIONS);
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: "Invalid request payload", details: error.errors }, { status: 400 });
      }
      throw error;
    }

    const { firstName, lastName, email, university, major, secondMajor, minors } = data;

    // Validate required fields
    if (!firstName || !lastName || !email || !university || !major) {
      return NextResponse.json({ error: "First name, last name, email, university, and major are required." }, { status: 400 });
    }

    // Prepare the email content
    let emailBody = `
      Name: ${firstName} ${lastName}
      Email: ${email}
      University: ${university}
      Major: ${major}
    `;

    // Add second major if provided
    if (secondMajor) {
      emailBody += `\nSecond Major: ${secondMajor}`;
    }

    // Add minors if selected
    if (minors && minors.length > 0) {
      emailBody += `\nMinors: ${minors.join(", ")}`;
    }

    // Send the email
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: "admin@stuplanning.com",
      subject: "New Student Submission",
      text: emailBody,
    });

    return NextResponse.json({ success: "Email sent successfully!" }, { status: 200 });

  } catch (error) {
    // CRITICAL: Do NOT log error object - may contain email body with PII (names, emails, majors)
    logError("Email sending failed", error, {
      action: 'send_email',
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
