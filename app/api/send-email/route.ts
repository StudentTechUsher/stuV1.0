import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY ?? process.env.NEXT_PUBLIC_RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, university, major, secondMajor, minors } = await req.json();

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
    console.error("Error sending email:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
