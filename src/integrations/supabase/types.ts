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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_call_logs: {
        Row: {
          created_at: string
          document_id: string | null
          id: string
          model: string | null
          pii_findings: Json | null
          prompt_text: string
          response_text: string | null
          status: string
          task: string
          truncated: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          id?: string
          model?: string | null
          pii_findings?: Json | null
          prompt_text: string
          response_text?: string | null
          status?: string
          task: string
          truncated?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          document_id?: string | null
          id?: string
          model?: string | null
          pii_findings?: Json | null
          prompt_text?: string
          response_text?: string | null
          status?: string
          task?: string
          truncated?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_call_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          created_at: string
          document_id: string | null
          id: string
          meta: Json
          prev_hash: string | null
          resource_cid: string | null
          result: string
          row_hash: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          document_id?: string | null
          id?: string
          meta?: Json
          prev_hash?: string | null
          resource_cid?: string | null
          result?: string
          row_hash?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          document_id?: string | null
          id?: string
          meta?: Json
          prev_hash?: string | null
          resource_cid?: string | null
          result?: string
          row_hash?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      client_assignments: {
        Row: {
          client_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          cid: string
          classification: Database["public"]["Enums"]["classification_tag"]
          client_id: string | null
          content_type: string
          created_at: string
          filename: string
          id: string
          owner_id: string
          size_bytes: number
          storage_path: string
          updated_at: string
        }
        Insert: {
          cid: string
          classification: Database["public"]["Enums"]["classification_tag"]
          client_id?: string | null
          content_type?: string
          created_at?: string
          filename: string
          id?: string
          owner_id: string
          size_bytes?: number
          storage_path: string
          updated_at?: string
        }
        Update: {
          cid?: string
          classification?: Database["public"]["Enums"]["classification_tag"]
          client_id?: string | null
          content_type?: string
          created_at?: string
          filename?: string
          id?: string
          owner_id?: string
          size_bytes?: number
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      tokens: {
        Row: {
          created_at: string
          created_by: string
          document_id: string | null
          expires_at: string
          id: string
          permissions: string[]
          revoked: boolean
          scope_cid: string
          token_hash: string
          token_preview: string
        }
        Insert: {
          created_at?: string
          created_by: string
          document_id?: string | null
          expires_at: string
          id?: string
          permissions?: string[]
          revoked?: boolean
          scope_cid: string
          token_hash: string
          token_preview: string
        }
        Update: {
          created_at?: string
          created_by?: string
          document_id?: string | null
          expires_at?: string
          id?: string
          permissions?: string[]
          revoked?: boolean
          scope_cid?: string
          token_hash?: string
          token_preview?: string
        }
        Relationships: [
          {
            foreignKeyName: "tokens_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      tokens_safe: {
        Row: {
          created_at: string | null
          created_by: string | null
          document_id: string | null
          expires_at: string | null
          id: string | null
          permissions: string[] | null
          revoked: boolean | null
          scope_cid: string | null
          token_preview: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          document_id?: string | null
          expires_at?: string | null
          id?: string | null
          permissions?: string[] | null
          revoked?: boolean | null
          scope_cid?: string | null
          token_preview?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          document_id?: string | null
          expires_at?: string | null
          id?: string | null
          permissions?: string[] | null
          revoked?: boolean | null
          scope_cid?: string | null
          token_preview?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tokens_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      assign_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target_user: string
        }
        Returns: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_roles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      remove_user_role: { Args: { _role_id: string }; Returns: undefined }
      user_assigned_to_client: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_view_doc_v2: {
        Args: {
          _classification: Database["public"]["Enums"]["classification_tag"]
          _client_id: string
          _user_id: string
        }
        Returns: boolean
      }
      verify_audit_chain: {
        Args: never
        Returns: {
          first_break_at: string
          first_break_id: string
          intact: boolean
          total_rows: number
          verified_rows: number
        }[]
      }
    }
    Enums: {
      app_role: "support" | "ops" | "compliance" | "manager" | "admin"
      classification_tag: "support" | "ops" | "compliance"
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
      app_role: ["support", "ops", "compliance", "manager", "admin"],
      classification_tag: ["support", "ops", "compliance"],
    },
  },
} as const
