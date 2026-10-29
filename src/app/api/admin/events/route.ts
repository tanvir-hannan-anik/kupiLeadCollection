import type { RealtimeChannel } from "@supabase/supabase-js";
import { getAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Server-Sent Events feed for the admin dashboard.
 *
 * Database triggers publish to the PRIVATE Realtime channel "admin-feed"; only
 * the service role can receive it. This route checks the admin's JWT, then
 * relays those tiny { table, op, id } messages to the browser. The browser never
 * talks to Supabase directly, so nobody can listen to or spoof the feed.
 *
 * The connection ends after a few minutes (serverless time limits); the browser's
 * EventSource reconnects automatically, re-checking the JWT each time.
 */
export const maxDuration = 300;

const KEEPALIVE_MS = 25_000;
const MAX_CONNECTION_MS = 280_000;

export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin) return Response.json({ error: "Admin access required." }, { status: 401 });

  const supabase = createServiceClient();
  if (!supabase) return Response.json({ error: "Not configured." }, { status: 503 });

  const encoder = new TextEncoder();
  let channel: RealtimeChannel | null = null;
  let keepalive: ReturnType<typeof setInterval> | undefined;
  let lifetime: ReturnType<typeof setTimeout> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(keepalive);
        clearTimeout(lifetime);
        if (channel) void supabase.removeChannel(channel);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      send("retry: 3000\n\n"); // reconnect delay hint for EventSource
      channel = supabase
        .channel("admin-feed", { config: { private: true } })
        .on("broadcast", { event: "change" }, ({ payload }) => {
          const p = payload as { table?: unknown; op?: unknown; id?: unknown };
          // Forward only the expected, non-sensitive shape.
          if (typeof p.table === "string" && typeof p.op === "string" && typeof p.id === "string") {
            send(`event: change\ndata: ${JSON.stringify({ table: p.table, op: p.op, id: p.id })}\n\n`);
          }
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") send("event: ready\ndata: {}\n\n");
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") close();
        });

      keepalive = setInterval(() => send(": keepalive\n\n"), KEEPALIVE_MS);
      lifetime = setTimeout(close, MAX_CONNECTION_MS);
      request.signal.addEventListener("abort", close);
    },
    cancel() {
      clearInterval(keepalive);
      clearTimeout(lifetime);
      if (channel) void supabase.removeChannel(channel);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
