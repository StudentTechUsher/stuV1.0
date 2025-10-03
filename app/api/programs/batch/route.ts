import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerComponentClient } from '@/lib/supabase/server'

// GET /api/programs/batch?ids=1,2,3&universityId=123
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids')
    const universityId = searchParams.get('universityId')

    if (!idsParam) {
      return NextResponse.json({ error: 'Missing required parameter: ids' }, { status: 400 })
    }

    const ids = idsParam.split(',').map(id => id.trim()).filter(Boolean)

    if (ids.length === 0) {
      return NextResponse.json({ error: 'No valid IDs provided' }, { status: 400 })
    }

    const supabase = await createSupabaseServerComponentClient()

    let query = supabase
      .from('program')
      .select('id, name, university_id, program_type, version, created_at, modified_at, requirements, is_general_ed')
      .in('id', ids)
      .order('name')

    if (universityId) {
      query = query.eq('university_id', Number(universityId))
    }

    const { data, error } = await query

    if (error) {
      console.error('[programs/batch] query error', error)
      return NextResponse.json({ error: 'Failed to fetch programs' }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[programs/batch] unexpected error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}