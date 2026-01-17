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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bundle_subjects: {
        Row: {
          bundle_id: string
          id: string
          subject_id: string
        }
        Insert: {
          bundle_id: string
          id?: string
          subject_id: string
        }
        Update: {
          bundle_id?: string
          id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_subjects_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "course_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          chapter_number: string
          content_extracted: string | null
          created_at: string
          id: string
          name: string
          name_kannada: string
          pdf_storage_path: string
          pdf_url: string
          subject_id: string
          updated_at: string
        }
        Insert: {
          chapter_number: string
          content_extracted?: string | null
          created_at?: string
          id?: string
          name: string
          name_kannada: string
          pdf_storage_path: string
          pdf_url: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          chapter_number?: string
          content_extracted?: string | null
          created_at?: string
          id?: string
          name?: string
          name_kannada?: string
          pdf_storage_path?: string
          pdf_url?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          chapter_id: string
          content: string
          created_at: string
          id: string
          role: string
          student_id: string
        }
        Insert: {
          chapter_id: string
          content: string
          created_at?: string
          id?: string
          role: string
          student_id: string
        }
        Update: {
          chapter_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      course_bundles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          name_kannada: string | null
          price_inr: number
          validity_days: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          name_kannada?: string | null
          price_inr: number
          validity_days?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          name_kannada?: string | null
          price_inr?: number
          validity_days?: number
        }
        Relationships: []
      }
      email_verification_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          answer: string
          chapter_id: string
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          question: string
        }
        Insert: {
          answer: string
          chapter_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          question: string
        }
        Update: {
          answer?: string
          chapter_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      infographics: {
        Row: {
          chapter_id: string
          created_at: string
          id: string
          image_url: string
          image_urls: Json | null
          images_pending: boolean | null
          pages_data: Json | null
        }
        Insert: {
          chapter_id: string
          created_at?: string
          id?: string
          image_url: string
          image_urls?: Json | null
          images_pending?: boolean | null
          pages_data?: Json | null
        }
        Update: {
          chapter_id?: string
          created_at?: string
          id?: string
          image_url?: string
          image_urls?: Json | null
          images_pending?: boolean | null
          pages_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "infographics_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: true
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      mindmaps: {
        Row: {
          chapter_id: string
          created_at: string
          id: string
          mindmap_data: Json
          updated_at: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          id?: string
          mindmap_data: Json
          updated_at?: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          id?: string
          mindmap_data?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mindmaps_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json
          attempted_at: string
          id: string
          quiz_id: string
          score: number
          started_at: string | null
          student_id: string
          total_questions: number
        }
        Insert: {
          answers: Json
          attempted_at?: string
          id?: string
          quiz_id: string
          score: number
          started_at?: string | null
          student_id: string
          total_questions: number
        }
        Update: {
          answers?: Json
          attempted_at?: string
          id?: string
          quiz_id?: string
          score?: number
          started_at?: string | null
          student_id?: string
          total_questions?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          chapter_id: string
          created_at: string
          created_by: string | null
          id: string
          questions: Json
          title: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          questions: Json
          title: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          questions?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      student_activity_logs: {
        Row: {
          activity_type: string
          chapter_id: string | null
          created_at: string | null
          duration_seconds: number | null
          id: string
          student_id: string
          subject_id: string | null
        }
        Insert: {
          activity_type: string
          chapter_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          student_id: string
          subject_id?: string | null
        }
        Update: {
          activity_type?: string
          chapter_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          student_id?: string
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_activity_logs_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_activity_logs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          active_session_id: string | null
          city: string
          created_at: string
          date_of_birth: string
          email_verified: boolean
          first_name: string
          id: string
          is_verified: boolean
          medium: string
          parent_email: string
          parent_mobile: string
          personal_email: string
          school_name: string
          session_updated_at: string | null
          surname: string
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          active_session_id?: string | null
          city: string
          created_at?: string
          date_of_birth: string
          email_verified?: boolean
          first_name: string
          id?: string
          is_verified?: boolean
          medium: string
          parent_email: string
          parent_mobile: string
          personal_email: string
          school_name: string
          session_updated_at?: string | null
          surname: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          active_session_id?: string | null
          city?: string
          created_at?: string
          date_of_birth?: string
          email_verified?: boolean
          first_name?: string
          id?: string
          is_verified?: boolean
          medium?: string
          parent_email?: string
          parent_mobile?: string
          personal_email?: string
          school_name?: string
          session_updated_at?: string | null
          surname?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      student_purchases: {
        Row: {
          amount_paid: number
          bundle_id: string
          expires_at: string
          id: string
          payment_method: string
          payment_status: string
          purchased_at: string
          stripe_payment_id: string | null
          stripe_session_id: string | null
          student_id: string
        }
        Insert: {
          amount_paid: number
          bundle_id: string
          expires_at: string
          id?: string
          payment_method?: string
          payment_status?: string
          purchased_at?: string
          stripe_payment_id?: string | null
          stripe_session_id?: string | null
          student_id: string
        }
        Update: {
          amount_paid?: number
          bundle_id?: string
          expires_at?: string
          id?: string
          payment_method?: string
          payment_status?: string
          purchased_at?: string
          stripe_payment_id?: string | null
          stripe_session_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_purchases_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "course_bundles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_subject_access: {
        Row: {
          granted_at: string
          id: string
          student_id: string
          subject_id: string
        }
        Insert: {
          granted_at?: string
          id?: string
          student_id: string
          subject_id: string
        }
        Update: {
          granted_at?: string
          id?: string
          student_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_subject_access_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          medium: string
          name: string
          name_kannada: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          medium?: string
          name: string
          name_kannada: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          medium?: string
          name?: string
          name_kannada?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          chapter_id: string | null
          created_at: string
          description: string | null
          id: string
          storage_path: string | null
          timestamps: Json | null
          title: string
          title_kannada: string | null
          updated_at: string
          video_type: string
          video_url: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          storage_path?: string | null
          timestamps?: Json | null
          title: string
          title_kannada?: string | null
          updated_at?: string
          video_type: string
          video_url: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          storage_path?: string | null
          timestamps?: Json | null
          title?: string
          title_kannada?: string | null
          updated_at?: string
          video_type?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student"
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
      app_role: ["admin", "student"],
    },
  },
} as const
