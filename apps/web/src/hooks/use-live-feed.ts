"use client";

import { useEffect, useState, useCallback } from "react";

interface LiveFeedEvent {
  type: "connected" | "new_task";
  task?: {
    id: string;
    developer_alias: string;
    project_slug: string;
    cost_usd: string;
    input_tokens: number;
    output_tokens: number;
    created_at: string;
  };
}

interface UseLiveFeedOptions {
  onNewTask?: (task: LiveFeedEvent["task"]) => void;
  enabled?: boolean;
}

export function useLiveFeed(options: UseLiveFeedOptions = {}) {
  const { onNewTask, enabled = true } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;

    const eventSource = new EventSource("/api/v1/stream");

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const data: LiveFeedEvent = JSON.parse(event.data);

        if (data.type === "connected") {
          setIsConnected(true);
        } else if (data.type === "new_task" && data.task) {
          onNewTask?.(data.task);
        }
      } catch (e) {
        console.error("Failed to parse SSE message:", e);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setError(new Error("Connection lost"));

      // Close and attempt reconnect after delay
      eventSource.close();
      setTimeout(connect, 5000);
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [enabled, onNewTask]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  return {
    isConnected,
    error,
  };
}
