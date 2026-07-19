import { auth } from "@/backend/lib/auth";
import { sseManager } from "@/backend/lib/sse";
import { v4 as uuid } from "uuid";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return new Response("Unauthorized", { status: 401 });
  }

  const clientId = uuid();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`)
      );

      // "all" makes sseManager forward every cafe's events to this client
      sseManager.addClient("orders", { id: clientId, cafeId: "all", controller });

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
