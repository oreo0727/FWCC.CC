import { z } from "zod";

export const httpsUrl = z
  .string()
  .url()
  .refine((value) => value.startsWith("https://"), "HTTPS required");
export const messageSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  date: z.iso.date(),
  speaker: z.string(),
  series: z.string(),
  image: httpsUrl.optional(),
  url: httpsUrl,
  youtubeId: z
    .string()
    .regex(/^[\w-]{11}$/)
    .optional(),
});
export const eventSchema = z
  .object({
    id: z.string(),
    title: z.string().min(1),
    description: z.string(),
    start: z.string().datetime({ offset: true }),
    end: z.string().datetime({ offset: true }),
    timezone: z.string().refine((value) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, "Invalid timezone"),
    allDay: z.boolean(),
    location: z.string(),
    featured: z.boolean(),
    url: httpsUrl,
    registrationUrl: httpsUrl.optional(),
  })
  .refine(
    (e) => Date.parse(e.end) > Date.parse(e.start),
    "Event must end after it starts",
  );
export const linkSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: httpsUrl,
});
export const announcementSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  url: httpsUrl,
  image: httpsUrl.optional(),
});
export const contentSchema = z.object({
  version: z.literal(1),
  fetchedAt: z.string().datetime(),
  source: z.enum(["website", "api"]),
  church: z.object({
    name: z.string(),
    address: z.string(),
    phone: z.string(),
    email: z.string(),
    services: z.string(),
    website: httpsUrl,
    givingUrl: httpsUrl,
  }),
  messages: z.array(messageSchema),
  events: z.array(eventSchema),
  announcements: z.array(announcementSchema),
  links: z.array(linkSchema),
});
export type Content = z.infer<typeof contentSchema>;
export type Message = z.infer<typeof messageSchema>;
export type ChurchEvent = z.infer<typeof eventSchema>;
