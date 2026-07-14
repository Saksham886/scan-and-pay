import Redis from "ioredis";

type SSEClient = {
  id: string;
  cafeId: string;
  controller: ReadableStreamDefaultController;
};

type SSEChannel = "orders" | "menu";

type BroadcastMessage = {
  channel: SSEChannel;
  cafeId: string;
  event: string;
  data: unknown;
};

// All instances publish to and subscribe from this single Redis channel so
// that an order paid on one serverless instance reaches dashboard clients
// connected to any other instance.
const REDIS_CHANNEL = "sse:broadcast";

class SSEManager {
  private clients: Map<SSEChannel, SSEClient[]> = new Map([
    ["orders", []],
    ["menu", []],
  ]);

  // Pub/sub requires two separate connections: a subscribed connection can
  // only issue pub/sub commands, so publishing needs its own client.
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;

  constructor() {
    const url = process.env.REDIS_URL;
    if (!url) return; // No Redis configured: falls back to single-process, in-memory delivery.

    this.publisher = new Redis(url);
    this.subscriber = new Redis(url);

    this.publisher.on("error", (err) => console.error("[sse] Redis publisher error:", err));
    this.subscriber.on("error", (err) => console.error("[sse] Redis subscriber error:", err));

    this.subscriber.subscribe(REDIS_CHANNEL).catch((err) => {
      console.error("[sse] Redis subscribe failed:", err);
    });

    this.subscriber.on("message", (_channel, raw) => {
      try {
        const msg: BroadcastMessage = JSON.parse(raw);
        this.deliverLocal(msg.channel, msg.cafeId, msg.event, msg.data);
      } catch (err) {
        console.error("[sse] Failed to parse Redis SSE message:", err);
      }
    });
  }

  addClient(channel: SSEChannel, client: SSEClient) {
    const list = this.clients.get(channel) ?? [];
    list.push(client);
    this.clients.set(channel, list);
  }

  removeClient(channel: SSEChannel, clientId: string) {
    const list = this.clients.get(channel) ?? [];
    this.clients.set(
      channel,
      list.filter((c) => c.id !== clientId)
    );
  }

  sendToCafe(cafeId: string, event: string, data: unknown, channel: SSEChannel = "orders") {
    if (this.publisher) {
      this.publisher
        .publish(REDIS_CHANNEL, JSON.stringify({ channel, cafeId, event, data }))
        .catch((err) => console.error("[sse] Redis publish failed:", err));
      return;
    }
    this.deliverLocal(channel, cafeId, event, data);
  }

  /** Broadcast a menu change to all customers watching a specific cafe */
  broadcastMenuUpdate(cafeId: string) {
    this.sendToCafe(cafeId, "menu_updated", { cafeId, timestamp: Date.now() }, "menu");
  }

  getClientCount(channel?: SSEChannel, cafeId?: string): number {
    if (channel) {
      const list = this.clients.get(channel) ?? [];
      return cafeId ? list.filter((c) => c.cafeId === cafeId).length : list.length;
    }
    let total = 0;
    for (const list of this.clients.values()) {
      total += cafeId ? list.filter((c) => c.cafeId === cafeId).length : list.length;
    }
    return total;
  }

  /** Delivers to clients connected to this process only. */
  private deliverLocal(channel: SSEChannel, cafeId: string, event: string, data: unknown) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();

    const list = this.clients.get(channel) ?? [];
    list
      .filter((c) => c.cafeId === cafeId || c.cafeId === "all")
      .forEach((client) => {
        try {
          client.controller.enqueue(encoder.encode(message));
        } catch {
          this.removeClient(channel, client.id);
        }
      });
  }
}

const globalForSSE = globalThis as unknown as { sseManager: SSEManager | undefined };
export const sseManager = globalForSSE.sseManager ?? new SSEManager();
if (process.env.NODE_ENV !== "production") globalForSSE.sseManager = sseManager;
