import { collectContent, writeSnapshot } from "./store.ts";
const content = await collectContent();
await writeSnapshot("data/content.json", content);
await writeSnapshot("mobile/src/content/bundled.json", content);
console.log(
  `Synced ${content.messages.length} messages, ${content.events.length} events, ${content.announcements.length} announcements.`,
);
