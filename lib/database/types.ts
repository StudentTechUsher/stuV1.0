export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      advisors: {
        Row: {
          created_at: string
          id: number
          profile_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          profile_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advisors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompts: {
        Row: {
          ai_model: string | null
          id: number
          max_output_tokens: number
          prompt: string | null
          prompt_name: string | null
          version: number
        }
        Insert: {
          ai_model?: string | null
          id?: number
          max_output_tokens?: number
          prompt?: string | null
          prompt_name?: string | null
          version: number
        }
        Update: {
          ai_model?: string | null
          id?: number
          max_output_tokens?: number
          prompt?: string | null
          prompt_name?: string | null
          version?: number
        }
        Relationships: []
      }
      ai_responses: {
        Row: {
          created_at: string
          escalation_flag: boolean | null
          id: number
          output_tokens: number
          response: string | null
          route_context: string | null
          session_id: string | null
          user_id: string
          user_prompt: string
        }
        Insert: {
          created_at?: string
          escalation_flag?: boolean | null
          id?: number
          output_tokens?: number
          response?: string | null
          route_context?: string | null
          session_id?: string | null
          user_id: string
          user_prompt?: string
        }
        Update: {
          created_at?: string
          escalation_flag?: boolean | null
          id?: number
          output_tokens?: number
          response?: string | null
          route_context?: string | null
          session_id?: string | null
          user_id?: string
          user_prompt?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      career_options: {
        Row: {
          created_at: string
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      class_preferences: {
        Row: {
          created_at: string
          id: number
          name: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          name?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          name?: string | null
        }
        Relationships: []
      }
      course_offerings: {
        Row: {
          college: string | null
          course_code: string | null
          credits_decimal: number | null
          credits_raw: string | null
          days_raw: string | null
          department_code: string | null
          description: string | null
          end_time_raw: string | null
          instructor: string | null
          loaded_at: string | null
          location_raw: string | null
          meetings_json: Json | null
          mode: string | null
          offering_id: number
          prerequisites: string | null
          raw_json: Json | null
          seats_available: number | null
          seats_capacity: number | null
          section_label: string | null
          source_row_hash: string | null
          start_time_raw: string | null
          term_name: string | null
          title: string | null
          type: string | null
          university_id: number
          waitlist_count: number | null
        }
        Insert: {
          college?: string | null
          course_code?: string | null
          credits_decimal?: number | null
          credits_raw?: string | null
          days_raw?: string | null
          department_code?: string | null
          description?: string | null
          end_time_raw?: string | null
          instructor?: string | null
          loaded_at?: string | null
          location_raw?: string | null
          meetings_json?: Json | null
          mode?: string | null
          offering_id?: number
          prerequisites?: string | null
          raw_json?: Json | null
          seats_available?: number | null
          seats_capacity?: number | null
          section_label?: string | null
          source_row_hash?: string | null
          start_time_raw?: string | null
          term_name?: string | null
          title?: string | null
          type?: string | null
          university_id?: number
          waitlist_count?: number | null
        }
        Update: {
          college?: string | null
          course_code?: string | null
          credits_decimal?: number | null
          credits_raw?: string | null
          days_raw?: string | null
          department_code?: string | null
          description?: string | null
          end_time_raw?: string | null
          instructor?: string | null
          loaded_at?: string | null
          location_raw?: string | null
          meetings_json?: Json | null
          mode?: string | null
          offering_id?: number
          prerequisites?: string | null
          raw_json?: Json | null
          seats_available?: number | null
          seats_capacity?: number | null
          section_label?: string | null
          source_row_hash?: string | null
          start_time_raw?: string | null
          term_name?: string | null
          title?: string | null
          type?: string | null
          university_id?: number
          waitlist_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_course_offerings_university"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "university"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          status: string
          storage_path: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          status?: string
          storage_path: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          status?: string
          storage_path?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      grad_plan: {
        Row: {
          advisor_notes: string | null
          created_at: string
          id: number
          is_active: boolean
          pending_approval: boolean
          pending_edits: boolean
          plan_details: Json | null
          plan_name: string | null
          programs_in_plan: number[] | null
          student_id: number | null
          updated_at: string | null
        }
        Insert: {
          advisor_notes?: string | null
          created_at?: string
          id?: number
          is_active?: boolean
          pending_approval?: boolean
          pending_edits?: boolean
          plan_details?: Json | null
          plan_name?: string | null
          programs_in_plan?: number[] | null
          student_id?: number | null
          updated_at?: string | null
        }
        Update: {
          advisor_notes?: string | null
          created_at?: string
          id?: number
          is_active?: boolean
          pending_approval?: boolean
          pending_edits?: boolean
          plan_details?: Json | null
          plan_name?: string | null
          programs_in_plan?: number[] | null
          student_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grad_plan_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_settings: {
        Row: {
          selection_mode: string
          university_id: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          selection_mode?: string
          university_id: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          selection_mode?: string
          university_id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_settings_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: true
            referencedRelation: "university"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel_mask: number
          context_json: Json | null
          created_utc: string
          id: string
          initiator_user_id: string | null
          is_read: boolean
          read_utc: string | null
          status: string
          target_user_id: string
          type: string
          url: string | null
        }
        Insert: {
          channel_mask?: number
          context_json?: Json | null
          created_utc?: string
          id?: string
          initiator_user_id?: string | null
          is_read?: boolean
          read_utc?: string | null
          status?: string
          target_user_id: string
          type: string
          url?: string | null
        }
        Update: {
          channel_mask?: number
          context_json?: Json | null
          created_utc?: string
          id?: string
          initiator_user_id?: string | null
          is_read?: boolean
          read_utc?: string | null
          status?: string
          target_user_id?: string
          type?: string
          url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          authorization_agreed: boolean
          authorization_agreed_at: string | null
          career_goals: string | null
          created_at: string
          email: string | null
          est_grad_date: string | null
          est_grad_sem: string | null
          fname: string
          id: string
          lname: string
          notif_preferences: Json | null
          onboarded: boolean
          role_id: number
          university_id: number
          updated_at: string
        }
        Insert: {
          authorization_agreed?: boolean
          authorization_agreed_at?: string | null
          career_goals?: string | null
          created_at?: string
          email?: string | null
          est_grad_date?: string | null
          est_grad_sem?: string | null
          fname?: string
          id: string
          lname?: string
          notif_preferences?: Json | null
          onboarded?: boolean
          role_id?: number
          university_id?: number
          updated_at?: string
        }
        Update: {
          authorization_agreed?: boolean
          authorization_agreed_at?: string | null
          career_goals?: string | null
          created_at?: string
          email?: string | null
          est_grad_date?: string | null
          est_grad_sem?: string | null
          fname?: string
          id?: string
          lname?: string
          notif_preferences?: Json | null
          onboarded?: boolean
          role_id?: number
          university_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "university"
            referencedColumns: ["id"]
          },
        ]
      }
      program: {
        Row: {
          course_flow: Json | null
          created_at: string
          id: number
          is_general_ed: boolean
          modified_at: string | null
          name: string
          program_type: Database["public"]["Enums"]["Program Types"] | null
          requirements: Json | null
          target_total_credits: number | null
          university_id: number
          version: string
        }
        Insert: {
          course_flow?: Json | null
          created_at?: string
          id?: number
          is_general_ed: boolean
          modified_at?: string | null
          name: string
          program_type?: Database["public"]["Enums"]["Program Types"] | null
          requirements?: Json | null
          target_total_credits?: number | null
          university_id: number
          version?: string
        }
        Update: {
          course_flow?: Json | null
          created_at?: string
          id?: number
          is_general_ed?: boolean
          modified_at?: string | null
          name?: string
          program_type?: Database["public"]["Enums"]["Program Types"] | null
          requirements?: Json | null
          target_total_credits?: number | null
          university_id?: number
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "university"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          id: number
          modified_at: string | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: number
          modified_at?: string | null
          name: string
        }
        Update: {
          created_at?: string
          id?: number
          modified_at?: string | null
          name?: string
        }
        Relationships: []
      }
      student: {
        Row: {
          class_preferences: number[] | null
          created_at: string
          id: number
          profile_id: string | null
          selected_interests: number[] | null
          selected_programs: number[] | null
          targeted_career: string | null
          year_in_school: Database["public"]["Enums"]["Year In School"]
        }
        Insert: {
          class_preferences?: number[] | null
          created_at?: string
          id?: number
          profile_id?: string | null
          selected_interests?: number[] | null
          selected_programs?: number[] | null
          targeted_career?: string | null
          year_in_school?: Database["public"]["Enums"]["Year In School"]
        }
        Update: {
          class_preferences?: number[] | null
          created_at?: string
          id?: number
          profile_id?: string | null
          selected_interests?: number[] | null
          selected_programs?: number[] | null
          targeted_career?: string | null
          year_in_school?: Database["public"]["Enums"]["Year In School"]
        }
        Relationships: [
          {
            foreignKeyName: "student_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_interests: {
        Row: {
          created_at: string
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: number
          name?: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      university: {
        Row: {
          accent_color: string | null
          created_at: string
          dark_color: string | null
          domain: string | null
          id: number
          light_color: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          secondary_text_color: string | null
          subdomain: string
          text_color: string | null
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          dark_color?: string | null
          domain?: string | null
          id?: number
          light_color?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          secondary_text_color?: string | null
          subdomain?: string
          text_color?: string | null
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          dark_color?: string | null
          domain?: string | null
          id?: number
          light_color?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          secondary_text_color?: string | null
          subdomain?: string
          text_color?: string | null
        }
        Relationships: []
      }
      user_courses: {
        Row: {
          courses: Json | null
          id: string
          inserted_at: string
          user_id: string
        }
        Insert: {
          courses?: Json | null
          id?: string
          inserted_at?: string
          user_id: string
        }
        Update: {
          courses?: Json | null
          id?: string
          inserted_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_advisor: { Args: never; Returns: boolean }
    }
    Enums: {
      "Program Types":
        | "major"
        | "minor"
        | "emphasis"
        | "gen_ed"
        | "graduate_no_gen_ed"
      Roles: "undergraduate" | "graduate" | "advisor" | "admin" | "superadmin"
      "Year In School": "Freshman" | "Sophomore" | "Junior" | "Senior"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      "Program Types": [
        "major",
        "minor",
        "emphasis",
        "gen_ed",
        "graduate_no_gen_ed",
      ],
      Roles: ["undergraduate", "graduate", "advisor", "admin", "superadmin"],
      "Year In School": ["Freshman", "Sophomore", "Junior", "Senior"],
    },
  },
} as const
