import { auth } from "@/backend/lib/auth";
import { sseManager } from "@/backend/lib/sse";
import { v4 as uuid } from "uuid";

export async function GET() {
  const session = await auth();
  if (!session?.user?.cafeId && session?.user?.role !== "SUPER_ADMIN") {
    return new Response("Unauthorized", { status: 401 });
  }

  const cafeId = session.user.cafeId || "all";
  const clientId = uuid();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection message
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`)
      );

      // Register SSE client on the orders channel
      sseManager.addClient("orders", { id: clientId, cafeId, controller });

      // Heartbeat every 30s
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);
    },
    cancel() {
      sseManager.removeClient("orders", clientId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
