import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerComponentClient } from '@/lib/supabase/server'

// GET /api/programs?type=minor|major&universityId=123
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // major | minor | emphasis | etc
    const universityId = searchParams.get('universityId')

    const supabase = await createSupabaseServerComponentClient()

    let query = supabase.from('program').select('id,name,university_id,program_type').order('name')

    if (type) query = query.eq('program_type', type)
    if (universityId) query = query.eq('university_id', Number(universityId))

    const { data, error } = await query

    if (error) {
      console.error('[programs] query error', error)
      return NextResponse.json({ error: 'Failed to fetch programs' }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[programs] unexpected error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
