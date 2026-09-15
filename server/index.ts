import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { createContentStore } from "./store.ts";
const store = createContentStore("data/content.json");
await store.load();
const server = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Expose-Headers", "X-Content-Stale");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Type", "application/json");
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    res.end('{"error":"Method not allowed"}');
    return;
  }
  if (req.url === "/health") {
    res.writeHead(store.current ? 200 : 503);
    res.end(
      JSON.stringify({
        ready: Boolean(store.current),
        stale: store.stale,
        fetchedAt: store.current?.fetchedAt,
      }),
    );
    return;
  }
  if (req.url !== "/v1/content") {
    res.writeHead(404);
    res.end('{"error":"Not found"}');
    return;
  }
  if (!store.current) {
    res.writeHead(503, { "Retry-After": "60" });
    res.end('{"error":"Content is being refreshed. Try again shortly."}');
    return;
  }
  const body = JSON.stringify(store.current);
  const etag = `"${createHash("sha256").update(body).digest("hex")}"`;
  res.setHeader("ETag", etag);
  res.setHeader("Cache-Control", "public, max-age=60");
  res.setHeader("X-Content-Stale", String(store.stale));
  if (req.headers["if-none-match"] === etag) {
    res.writeHead(304);
    res.end();
    return;
  }
  res.end(req.method === "HEAD" ? undefined : body);
});
server.listen(Number(process.env.PORT || 8787), "0.0.0.0", () =>
  console.log(
    "FWCC content server listening on port " + (process.env.PORT || 8787),
  ),
);
void store.refresh();
const timer = setInterval(() => void store.refresh(), 15 * 60_000);
function stop() {
  clearInterval(timer);
  server.close();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
