/**
 * Database types stub (Manual Restoration)
 * The Supabase CLI generation failed, so we are using a manual definition
 * to support the new scheduler tables while keeping generic support for others.
 */

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            student_schedules: {
                Row: {
                    schedule_id: string
                    student_id: number
                    grad_plan_id: string | null
                    term_name: string
                    term_index: number | null
                    blocked_times: Json
                    preferences: Json
                    created_at: string
                    updated_at: string
                    is_active: boolean
                }
                Insert: {
                    schedule_id?: string
                    student_id: number
                    grad_plan_id?: string | null
                    term_name: string
                    term_index?: number | null
                    blocked_times?: Json
                    preferences?: Json
                    created_at?: string
                    updated_at?: string
                    is_active?: boolean
                }
                Update: {
                    schedule_id?: string
                    student_id?: number
                    grad_plan_id?: string | null
                    term_name?: string
                    term_index?: number | null
                    blocked_times?: Json
                    preferences?: Json
                    created_at?: string
                    updated_at?: string
                    is_active?: boolean
                }
            }
            schedule_course_selections: {
                Row: {
                    selection_id: string
                    schedule_id: string
                    course_code: string
                    requirement_type: string | null
                    primary_offering_id: number | null
                    backup_1_offering_id: number | null
                    backup_2_offering_id: number | null
                    status: 'planned' | 'registered' | 'waitlisted' | 'dropped'
                    notes: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    selection_id?: string
                    schedule_id: string
                    course_code: string
                    requirement_type?: string | null
                    primary_offering_id?: number | null
                    backup_1_offering_id?: number | null
                    backup_2_offering_id?: number | null
                    status?: 'planned' | 'registered' | 'waitlisted' | 'dropped'
                    notes?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    selection_id?: string
                    schedule_id?: string
                    course_code?: string
                    requirement_type?: string | null
                    primary_offering_id?: number | null
                    backup_1_offering_id?: number | null
                    backup_2_offering_id?: number | null
                    status?: 'planned' | 'registered' | 'waitlisted' | 'dropped'
                    notes?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            course_offerings: {
                Row: {
                    offering_id: number
                    university_id: number
                    term_name: string | null
                    college: string | null
                    department_code: string | null
                    course_code: string | null
                    section_label: string | null
                    title: string | null
                    description: string | null
                    prerequisites: string | null
                    type: string | null
                    mode: string | null
                    instructor: string | null
                    credits_raw: string | null
                    credits_decimal: number | null
                    meetings_json: Json | null
                    days_raw: string | null
                    start_time_raw: string | null
                    end_time_raw: string | null
                    location_raw: string | null
                    seats_available: number | null
                    seats_capacity: number | null
                    waitlist_count: number | null
                    source_row_hash: string
                    raw_json: Json
                    created_at: string
                }
                Insert: {
                    // simplified for loose typing
                    [key: string]: unknown
                }
                Update: {
                    [key: string]: unknown
                }
            }
            [key: string]: {
                Row: Record<string, unknown>
                Insert: Record<string, unknown>
                Update: Record<string, unknown>
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
    }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
