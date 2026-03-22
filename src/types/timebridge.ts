export type AvailabilityRow = {
  id: string;
  user_name: string;
  utc_time_slot: string;
  is_admin_blocked: boolean;
  created_at: string;
  week_year?: number | null;
  week_number?: number | null;
};

export type DiaryRow = {
  id: string;
  title: string | null;
  content: string | null;
  image_url: string | null;
  event_date: string | null;
  created_at: string;
};

export const ADMIN_BLOCK_USER = "__admin_busy__";
export const NICKNAME_STORAGE_KEY = "timebridge_nickname";
