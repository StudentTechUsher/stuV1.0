import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  return handleReportIssue(request);
}

async function handleReportIssue(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, stepsToReproduce, pageUrl, sessionReplayUrl } = body;

    // Validate required fields
    if (!description || !pageUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerComponentClient();

    // Get user info for context (optional - issue reports work even for logged-out users)
    let userId: string | undefined;
    let userEmail: string | undefined;
    let userRole: string | undefined;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        userId = user.id;
        userEmail = user.email || undefined;

        // Get user role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role_id')
          .eq('id', user.id)
          .single();

        if (profile?.role_id) {
          const roleMap: Record<number, string> = {
            1: 'admin',
            2: 'advisor',
            3: 'student',
          };
          userRole = roleMap[profile.role_id] || 'unknown';
        }
      }
    } catch (error) {
      console.warn('Could not fetch user info for issue report:', error);
      // Continue without user info - not critical
    }

    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportId = `${timestamp}_${userId || 'anonymous'}`;

    // Create JSON report
    const reportData = {
      reportId,
      timestamp: new Date().toISOString(),
      description,
      stepsToReproduce: stepsToReproduce || undefined,
      pageUrl,
      sessionReplayUrl: sessionReplayUrl || undefined,
      userId: userId || undefined,
      userEmail: userEmail || undefined,
      userRole: userRole || undefined,
    };

    // Upload JSON report to Storage
    const jsonPath = `${reportId}_report.json`;
    const { error: jsonError } = await supabase.storage
      .from('error_logs')
      .upload(jsonPath, JSON.stringify(reportData, null, 2), {
        contentType: 'application/json',
        cacheControl: '3600',
        upsert: false,
      });

    if (jsonError) {
      console.error('Error uploading JSON report:', jsonError);
      return NextResponse.json(
        { success: false, error: 'Failed to save issue report' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling issue report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit issue report' },
      { status: 500 }
    );
  }
}
