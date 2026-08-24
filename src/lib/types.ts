export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          assignee_name: string | null
          assignee_status: 'pending' | 'invited' | null
          parent_task_id: string | null
          position: number
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
          assignee_name?: string | null
          assignee_status?: 'pending' | 'invited' | null
          parent_task_id?: string | null
          position?: number
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
          assignee_name?: string | null
          assignee_status?: "pending" | "invited" | null
          parent_task_id?: string | null
          position?: number
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
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          id: string
          task_id: string
          user_id: string | null
          user_name: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id?: string | null
          user_name: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string | null
          user_name?: string
          content?: string
          created_at?: string
        }
        Relationships: []
      }
      task_attachments: {
        Row: {
          id: string
          task_id: string
          user_id: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          uploaded_at: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id?: string | null
          file_name: string
          file_size?: number
          file_type?: string
          file_url: string
          uploaded_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          uploaded_at?: string
        }
        Relationships: []
      }
      invite_tokens: {
        Row: {
          id: string
          workspace_id: string
          email: string
          role: string
          token: string
          created_by: string
          expires_at: string
          accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          email: string
          role?: string
          token: string
          created_by: string
          expires_at: string
          accepted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          email?: string
          role?: string
          token?: string
          created_by?: string
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      is_workspace_member: {
        Args: {
          p_workspace_id: string
          p_user_id: string
        }
        Returns: boolean
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T]

export type CompositeTypes<T extends keyof Database["public"]["CompositeTypes"]> =
  Database["public"]["CompositeTypes"][T]

export const Constants = {
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
