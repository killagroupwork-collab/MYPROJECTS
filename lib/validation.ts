import { z } from "zod";
export const entrySchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid().optional(),
  client_task: z.boolean().optional(),
  client_modified_at: z.string().datetime().optional(),
  client_owner_id: z.string().uuid().optional(),
  client_created_at: z.string().datetime().optional(),
  type: z.enum([
    "text",
    "meal",
    "voice",
    "photo",
    "achievement",
    "mood",
    "reflection",
  ]),
  title: z.string().trim().min(1).max(160),
  body: z.string().max(20000).default(""),
  entry_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (v) =>
        !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
      "Invalid date",
    ),
  space_id: z.string().uuid().nullable().default(null),
  metadata: z.record(z.string().max(40), z.string().max(500)).default({}),
  media_path: z.string().max(500).nullable().default(null),
});
export const profileSchema = z.object({
  avatar_path:z.string().max(150000).regex(/^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/).nullable().optional(),
  display_name: z.string().trim().min(1).max(60),
  username: z.string().regex(/^[a-z0-9_]{3,24}$/),
  timezone: z.string().refine((v) => {
    try {
      Intl.DateTimeFormat("en", { timeZone: v });
      return true;
    } catch {
      return false;
    }
  }, "Invalid timezone"),
  notifications_enabled: z.boolean().optional(),
});
export function validMedia(type: string, size: number) {
  return (
    [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "audio/webm",
      "audio/ogg",
      "audio/mp4",
      "audio/mpeg",
      "audio/wav",
    ].includes(type.split(";")[0]) &&
    size > 0 &&
    size <= 20 * 1024 * 1024
  );
}
