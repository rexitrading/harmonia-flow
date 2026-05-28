export type EventStatus = "draft" | "ready" | "live" | "finished" | "archived";
export type EventTrackStatus = "pending" | "ready" | "playing" | "played" | "skipped" | "canceled";

export type CreateEventInput = {
  title: string;
  event_date: string;
  location?: string;
  notes?: string;
};

export type CreateEventFromTemplateInput = {
  template_id: string;
  title: string;
  event_date: string;
  location?: string;
  notes?: string;
};

export type UpdateEventTrackInput = {
  moment_id?: string;
  order_index?: number;
  note?: string;
  cue_start_ms?: number;
  cue_end_ms?: number;
  status?: EventTrackStatus;
  is_backup?: boolean;
};

export type RunSheetItem = {
  event_track_id: string;
  moment: string;
  display_order: number;
  track_name: string;
  artists: string[];
  note?: string;
  status: EventTrackStatus;
  cue_start_ms?: number;
  cue_end_ms?: number;
  is_backup: boolean;
};
