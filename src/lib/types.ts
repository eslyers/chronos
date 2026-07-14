export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          name: string
          slug: string
          owner_id: string
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          owner_id: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          owner_id?: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          workspace_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member' | 'viewer'
          joined_at: string
        }
        Insert: {
          workspace_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          joined_at?: string
        }
        Update: {
          workspace_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          joined_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          workspace_id: string
          name: string
          description: string | null
          color: string
          status: 'active' | 'on_hold' | 'archived' | 'completed'
          start_date: string | null
          target_date: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          description?: string | null
          color?: string
          status?: 'active' | 'on_hold' | 'archived' | 'completed'
          start_date?: string | null
          target_date?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          description?: string | null
          color?: string
          status?: 'active' | 'on_hold' | 'archived' | 'completed'
          start_date?: string | null
          target_date?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      stages: {
        Row: {
          id: string
          project_id: string
          name: string
          color: string
          sort_order: number
          wip_limit: number | null
          is_done: boolean
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          color?: string
          sort_order?: number
          wip_limit?: number | null
          is_done?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          color?: string
          sort_order?: number
          wip_limit?: number | null
          is_done?: boolean
          created_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          stage_id: string
          project_id: string
          title: string
          description: string | null
          status: 'todo' | 'in_progress' | 'blocked' | 'review' | 'done'
          priority: 'low' | 'medium' | 'high' | 'critical'
          assignee_id: string | null
          start_date: string | null
          due_date: string | null
          progress: number
          estimated_hours: number | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          stage_id: string
          project_id: string
          title: string
          description?: string | null
          status?: 'todo' | 'in_progress' | 'blocked' | 'review' | 'done'
          priority?: 'low' | 'medium' | 'high' | 'critical'
          assignee_id?: string | null
          start_date?: string | null
          due_date?: string | null
          progress?: number
          estimated_hours?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          stage_id?: string
          project_id?: string
          title?: string
          description?: string | null
          status?: 'todo' | 'in_progress' | 'blocked' | 'review' | 'done'
          priority?: 'low' | 'medium' | 'high' | 'critical'
          assignee_id?: string | null
          start_date?: string | null
          due_date?: string | null
          progress?: number
          estimated_hours?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_dependencies: {
        Row: {
          id: string
          task_id: string
          depends_on_task_id: string
          dependency_type: 'FS' | 'SS' | 'FF' | 'SF'
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          depends_on_task_id: string
          dependency_type?: 'FS' | 'SS' | 'FF' | 'SF'
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          depends_on_task_id?: string
          dependency_type?: 'FS' | 'SS' | 'FF' | 'SF'
          created_at?: string
        }
        Relationships: []
      }
      stage_transitions: {
        Row: {
          id: string
          task_id: string
          from_stage_id: string | null
          to_stage_id: string
          moved_by: string
          moved_at: string
          note: string | null
        }
        Insert: {
          id?: string
          task_id: string
          from_stage_id?: string | null
          to_stage_id: string
          moved_by: string
          moved_at?: string
          note?: string | null
        }
        Update: {
          id?: string
          task_id?: string
          from_stage_id?: string | null
          to_stage_id?: string
          moved_by?: string
          moved_at?: string
          note?: string | null
        }
        Relationships: []
      }
      notification_subscribers: {
        Row: {
          id: string
          project_id: string
          user_id: string
          telegram_chat_id: string | null
          email_enabled: boolean
          telegram_enabled: boolean
          notify_on_stage_change: boolean
          notify_on_due_soon: boolean
          notify_on_overdue: boolean
          notify_on_assigned: boolean
          due_soon_hours: number
          quiet_hours_start: string | null
          quiet_hours_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          telegram_chat_id?: string | null
          email_enabled?: boolean
          telegram_enabled?: boolean
          notify_on_stage_change?: boolean
          notify_on_due_soon?: boolean
          notify_on_overdue?: boolean
          notify_on_assigned?: boolean
          due_soon_hours?: number
          quiet_hours_start?: string | null
          quiet_hours_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          telegram_chat_id?: string | null
          email_enabled?: boolean
          telegram_enabled?: boolean
          notify_on_stage_change?: boolean
          notify_on_due_soon?: boolean
          notify_on_overdue?: boolean
          notify_on_assigned?: boolean
          due_soon_hours?: number
          quiet_hours_start?: string | null
          quiet_hours_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          task_id: string | null
          type: 'due_soon' | 'overdue' | 'stage_change' | 'assigned' | 'mention' | 'stale_task'
          payload: Json
          channels: string[]
          status: 'pending' | 'sent' | 'failed' | 'read'
          sent_at: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          task_id?: string | null
          type: 'due_soon' | 'overdue' | 'stage_change' | 'assigned' | 'mention' | 'stale_task'
          payload?: Json
          channels?: string[]
          status?: 'pending' | 'sent' | 'failed' | 'read'
          sent_at?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string | null
          task_id?: string | null
          type?: 'due_soon' | 'overdue' | 'stage_change' | 'assigned' | 'mention' | 'stale_task'
          payload?: Json
          channels?: string[]
          status?: 'pending' | 'sent' | 'failed' | 'read'
          sent_at?: string | null
          read_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          id: string
          workspace_id: string | null
          name: string
          description: string | null
          category: string | null
          icon: string | null
          is_public: boolean
          stages: Json
          tasks_template: Json | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          name: string
          description?: string | null
          category?: string | null
          icon?: string | null
          is_public?: boolean
          stages?: Json
          tasks_template?: Json | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string | null
          name?: string
          description?: string | null
          category?: string | null
          icon?: string | null
          is_public?: boolean
          stages?: Json
          tasks_template?: Json | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_workspace_member: {
        Args: {
          p_workspace_id: string
          p_user_id: string
        }
        Returns: boolean
      }
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
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof (DefaultSchema["CompositeTypes"] | DefaultSchema["Views"])
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
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

// Helper aliases
export type Workspace = Tables<'workspaces'>
export type WorkspaceMember = Tables<'workspace_members'>
export type Project = Tables<'projects'>
export type Stage = Tables<'stages'>
export type Task = Tables<'tasks'>
export type TaskDependency = Tables<'task_dependencies'>
export type StageTransition = Tables<'stage_transitions'>
export type NotificationSubscriber = Tables<'notification_subscribers'>
export type Notification = Tables<'notifications'>
export type Template = Tables<'templates'>
