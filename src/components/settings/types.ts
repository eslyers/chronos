export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  telegram_chat_id: string | null;
  telegram_username: string | null;
  timezone: string;
  notify_by_email: boolean;
  notify_by_telegram: boolean;
}

export interface Subscriber {
  project_id: string;
  telegram_enabled: boolean;
  email_enabled: boolean;
  notify_on_stage_change: boolean;
  notify_on_due_soon: boolean;
  notify_on_overdue: boolean;
  notify_on_assigned: boolean;
  due_soon_hours: number;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}
