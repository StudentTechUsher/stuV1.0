import { NextRequest, NextResponse } from 'next/server';
import { sendGradPlanApprovalEmail } from '@/lib/services/emailService';

/**
 * POST /api/email-testing/send
 *
 * Test endpoint for sending graduation plan approval emails
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentEmail, studentFirstName, planAccessId, advisorName } = body;

    // Validate required fields
    if (!studentEmail || !studentFirstName || !planAccessId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields: studentEmail, studentFirstName, and planAccessId are required'
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(studentEmail)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email address format' },
        { status: 400 }
      );
    }

    console.log('📧 Sending test email to:', studentEmail);

    // Send the email
    await sendGradPlanApprovalEmail({
      studentFirstName,
      studentEmail,
      planAccessId,
      advisorName: advisorName || undefined
    });

    console.log('✅ Test email sent successfully');

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${studentEmail}! Check your inbox (and spam folder).`
    });

  } catch (error) {
    console.error('❌ Error sending test email:', error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send test email'
      },
      { status: 500 }
    );
  }
}
