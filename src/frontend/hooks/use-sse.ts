"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseSSEOptions {
  url: string;
  /** Event names to listen for */
  events: string[];
  onMessage: (event: string, data: unknown) => void;
  enabled?: boolean;
}

export function useSSE({ url, events, onMessage, enabled = true }: UseSSEOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const connect = useCallback(() => {
    if (!enabled) return;

    const es = new EventSource(url);
    eventSourceRef.current = es;

    for (const eventName of events) {
      es.addEventListener(eventName, (e) => {
        try {
          onMessageRef.current(eventName, JSON.parse(e.data));
        } catch {}
      });
    }

    es.addEventListener("connected", () => {
      console.log("SSE connected:", url);
    });

    es.onerror = () => {
      es.close();
      // eslint-disable-next-line react-hooks/immutability
      reconnectTimeout.current = setTimeout(connect, 3000);
    };
  }, [url, enabled, events]);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, [connect]);
}
