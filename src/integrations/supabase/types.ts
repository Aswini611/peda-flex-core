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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      alert_reads: {
        Row: {
          alert_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          alert_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          alert_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_reads_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "mismatch_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          auditory_score: number | null
          completed_at: string
          id: string
          kinesthetic_score: number | null
          mi_scores: Json | null
          reading_score: number | null
          student_id: string
          visual_score: number | null
          zpd_english: number | null
          zpd_math: number | null
          zpd_science: number | null
        }
        Insert: {
          auditory_score?: number | null
          completed_at?: string
          id?: string
          kinesthetic_score?: number | null
          mi_scores?: Json | null
          reading_score?: number | null
          student_id: string
          visual_score?: number | null
          zpd_english?: number | null
          zpd_math?: number | null
          zpd_science?: number | null
        }
        Update: {
          auditory_score?: number | null
          completed_at?: string
          id?: string
          kinesthetic_score?: number | null
          mi_scores?: Json | null
          reading_score?: number | null
          student_id?: string
          visual_score?: number | null
          zpd_english?: number | null
          zpd_math?: number | null
          zpd_science?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          lesson_id: string
          status: string
          student_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          lesson_id: string
          status?: string
          student_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          lesson_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          ai_generated: boolean | null
          approach: string | null
          content: Json | null
          created_at: string
          curriculum: string | null
          delivery_method: string | null
          duration_minutes: number | null
          id: string
          subject: string | null
          title: string
          vark_target: string | null
        }
        Insert: {
          ai_generated?: boolean | null
          approach?: string | null
          content?: Json | null
          created_at?: string
          curriculum?: string | null
          delivery_method?: string | null
          duration_minutes?: number | null
          id?: string
          subject?: string | null
          title: string
          vark_target?: string | null
        }
        Update: {
          ai_generated?: boolean | null
          approach?: string | null
          content?: Json | null
          created_at?: string
          curriculum?: string | null
          delivery_method?: string | null
          duration_minutes?: number | null
          id?: string
          subject?: string | null
          title?: string
          vark_target?: string | null
        }
        Relationships: []
      }
      mismatch_alerts: {
        Row: {
          created_at: string
          fail_rate: number | null
          id: string
          lesson_type: string | null
          recommendation: string | null
          status: string
          student_group: string | null
          trigger_condition: string | null
        }
        Insert: {
          created_at?: string
          fail_rate?: number | null
          id?: string
          lesson_type?: string | null
          recommendation?: string | null
          status?: string
          student_group?: string | null
          trigger_condition?: string | null
        }
        Update: {
          created_at?: string
          fail_rate?: number | null
          id?: string
          lesson_type?: string | null
          recommendation?: string | null
          status?: string
          student_group?: string | null
          trigger_condition?: string | null
        }
        Relationships: []
      }
      performance_records: {
        Row: {
          effort_score: number | null
          id: string
          lesson_id: string | null
          mastery_score: number | null
          normalized_gain: number | null
          posttest_score: number | null
          pretest_score: number | null
          recorded_at: string
          student_id: string
        }
        Insert: {
          effort_score?: number | null
          id?: string
          lesson_id?: string | null
          mastery_score?: number | null
          normalized_gain?: number | null
          posttest_score?: number | null
          pretest_score?: number | null
          recorded_at?: string
          student_id: string
        }
        Update: {
          effort_score?: number | null
          id?: string
          lesson_id?: string | null
          mastery_score?: number | null
          normalized_gain?: number | null
          posttest_score?: number | null
          pretest_score?: number | null
          recorded_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_records_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          role?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
      student_assessments: {
        Row: {
          age_group: number
          created_at: string
          curriculum: string | null
          id: string
          responses: Json
          section: string | null
          student_age: number
          student_class: string | null
          student_name: string
          submitted_by: string
          teacher_id: string
        }
        Insert: {
          age_group: number
          created_at?: string
          curriculum?: string | null
          id?: string
          responses?: Json
          section?: string | null
          student_age: number
          student_class?: string | null
          student_name: string
          submitted_by?: string
          teacher_id: string
        }
        Update: {
          age_group?: number
          created_at?: string
          curriculum?: string | null
          id?: string
          responses?: Json
          section?: string | null
          student_age?: number
          student_class?: string | null
          student_name?: string
          submitted_by?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_assessments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string
          curriculum: string | null
          dominant_intelligence: string | null
          grade: string | null
          id: string
          profile_id: string
          vark_type: string | null
          zpd_score: number | null
        }
        Insert: {
          created_at?: string
          curriculum?: string | null
          dominant_intelligence?: string | null
          grade?: string | null
          id?: string
          profile_id: string
          vark_type?: string | null
          zpd_score?: number | null
        }
        Update: {
          created_at?: string
          curriculum?: string | null
          dominant_intelligence?: string | null
          grade?: string | null
          id?: string
          profile_id?: string
          vark_type?: string | null
          zpd_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "students_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_assessments: {
        Row: {
          age_group: number
          created_at: string
          id: string
          responses: Json
          student_name: string
          student_profile_id: string
          teacher_id: string
        }
        Insert: {
          age_group: number
          created_at?: string
          id?: string
          responses?: Json
          student_name: string
          student_profile_id: string
          teacher_id: string
        }
        Update: {
          age_group?: number
          created_at?: string
          id?: string
          responses?: Json
          student_name?: string
          student_profile_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_assessments_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assessments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
