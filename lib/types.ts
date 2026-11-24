export type EntryType =
  | "text"
  | "meal"
  | "voice"
  | "photo"
  | "achievement"
  | "mood"
  | "reflection";
export type Entry = {
  id: string;
  owner_id: string;
  type: EntryType;
  title: string;
  body: string;
  entry_date: string;
  created_at: string;
  space_id: string | null;
  metadata: Record<string, string>;
  media_path: string | null;
  media_url?: string;
};
export type Space = {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
};
export type Profile = {
  id: string;
  display_name: string;
  username: string;
  timezone: string;
  avatar_path?: string | null;
  notifications_enabled?: boolean;
};
export const entryTypes: EntryType[] = [
  "text",
  "meal",
  "voice",
  "photo",
  "achievement",
  "mood",
  "reflection",
];
export function localDate(date = new Date(), zone?: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
