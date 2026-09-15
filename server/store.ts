import { mkdir, readFile, rename, writeFile, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname } from "node:path";
import { contentSchema, type Content } from "../mobile/src/content/schema.ts";
import { scrapeWebsite } from "./scraper.ts";

export async function readSnapshot(path: string): Promise<Content | undefined> {
  try {
    return contentSchema.parse(JSON.parse(await readFile(path, "utf8")));
  } catch {
    return;
  }
}
export async function writeSnapshot(path: string, content: Content) {
  const valid = contentSchema.parse(content);
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(valid, null, 2));
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}
export async function collectContent(): Promise<Content> {
  if (process.env.CONTENT_API_URL) {
    try {
      const url = new URL(process.env.CONTENT_API_URL);
      if (url.protocol !== "https:") throw new Error("API must use HTTPS");
      const headers: Record<string, string> = {};
      if (process.env.CONTENT_API_TOKEN)
        headers.Authorization = `Bearer ${process.env.CONTENT_API_TOKEN}`;
      const response = await fetch(url, {
        headers,
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`API status ${response.status}`);
      return contentSchema.parse({ ...(await response.json()), source: "api" });
    } catch {
      console.warn(
        "Configured API unavailable or invalid; falling back to public website.",
      );
    }
  }
  return scrapeWebsite();
}
export function createContentStore(path: string, collect = collectContent) {
  let current: Content | undefined;
  let pending: Promise<Content | undefined> | undefined;
  let failed = false;
  return {
    get current() {
      return current;
    },
    get stale() {
      return (
        failed ||
        !current ||
        Date.now() - Date.parse(current.fetchedAt) > 30 * 60_000
      );
    },
    async load() {
      current = await readSnapshot(path);
    },
    refresh() {
      if (pending) return pending;
      pending = (async () => {
        try {
          const next = contentSchema.parse(await collect());
          await writeSnapshot(path, next);
          current = next;
          failed = false;
        } catch (error) {
          failed = true;
          console.error(
            "Content refresh failed; retaining last valid snapshot.",
            error instanceof Error ? error.message : "Unknown error",
          );
        } finally {
          pending = undefined;
        }
        return current;
      })();
      return pending;
    },
  };
}
