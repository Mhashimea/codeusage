import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

// Store active connections per workspace
const connections = new Map<string, Set<ReadableStreamDefaultController>>();

// Export for use by task ingestion endpoint
export function broadcastToWorkspace(workspaceId: string, data: unknown) {
  const controllers = connections.get(workspaceId);
  if (controllers) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();
    const encoded = encoder.encode(message);

    controllers.forEach((controller) => {
      try {
        controller.enqueue(encoded);
      } catch {
        // Connection closed, will be cleaned up
      }
    });
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.workspaceId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const workspaceId = session.user.workspaceId;

  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to the workspace's connection set
      if (!connections.has(workspaceId)) {
        connections.set(workspaceId, new Set());
      }
      connections.get(workspaceId)!.add(controller);

      // Send initial connection message
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
      );

      // Keep connection alive with periodic heartbeats
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        const wsConnections = connections.get(workspaceId);
        if (wsConnections) {
          wsConnections.delete(controller);
          if (wsConnections.size === 0) {
            connections.delete(workspaceId);
          }
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
