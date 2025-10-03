import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const careerTitle = typeof body.careerTitle === 'string' ? body.careerTitle.trim() : '';
    if (!careerTitle) {
      return NextResponse.json({ error: 'Invalid careerTitle' }, { status: 400 });
    }
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const { error: updateError } = await supabase
      .from('student')
      .update({ targeted_career: careerTitle })
      .eq('profile_id', user.id);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}