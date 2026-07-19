import { sseManager } from "@/backend/lib/sse";
import { menuRepository } from "@/backend/repositories/menu.repository";
import { v4 as uuid } from "uuid";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Resolve slug → cafeId
  const cafe = await menuRepository.getCafeBySlug(slug);
  if (!cafe) {
    return new Response("Cafe not found", { status: 404 });
  }

  const clientId = uuid();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`)
      );

      // Register on the menu channel for this cafe
      sseManager.addClient("menu", { id: clientId, cafeId: cafe.id, controller });

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
      sseManager.removeClient("menu", clientId);
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
