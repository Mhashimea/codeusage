import fs from "fs/promises";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import type { TelemetryPayload } from "@afterburn/shared";

const BUFFER_DIR = path.join(os.homedir(), ".afterburn", "buffer");
const MAX_BUFFER = 50;
const WARN_THRESHOLD = 40;

export async function bufferTask(payload: TelemetryPayload): Promise<void> {
  await fs.mkdir(BUFFER_DIR, { recursive: true });

  const files = await getBufferedFiles();

  // Enforce cap
  if (files.length >= MAX_BUFFER) {
    console.warn(`Buffer full (${MAX_BUFFER} tasks). Dropping oldest.`);
    await fs.unlink(path.join(BUFFER_DIR, files[0]));
  } else if (files.length >= WARN_THRESHOLD) {
    console.warn(`Buffer nearly full: ${files.length}/${MAX_BUFFER} tasks`);
  }

  const taskId = randomUUID();
  const filePath = path.join(BUFFER_DIR, `${Date.now()}-${taskId}.json`);
  await fs.writeFile(filePath, JSON.stringify(payload));
}

export async function getBufferedFiles(): Promise<string[]> {
  try {
    const files = await fs.readdir(BUFFER_DIR);
    return files.filter((f) => f.endsWith(".json")).sort(); // Sort by timestamp prefix
  } catch {
    return [];
  }
}

export async function getBufferedTasks(): Promise<
  { file: string; payload: TelemetryPayload }[]
> {
  const files = await getBufferedFiles();
  const tasks: { file: string; payload: TelemetryPayload }[] = [];

  for (const file of files) {
    try {
      const content = await fs.readFile(path.join(BUFFER_DIR, file), "utf-8");
      tasks.push({ file, payload: JSON.parse(content) });
    } catch {
      // Skip corrupted files
    }
  }

  return tasks;
}

export async function removeBufferedTask(file: string): Promise<void> {
  try {
    await fs.unlink(path.join(BUFFER_DIR, file));
  } catch {
    // Already deleted
  }
}

export async function getBufferCount(): Promise<number> {
  const files = await getBufferedFiles();
  return files.length;
}

export async function clearBuffer(): Promise<number> {
  const files = await getBufferedFiles();
  let cleared = 0;

  for (const file of files) {
    try {
      await fs.unlink(path.join(BUFFER_DIR, file));
      cleared++;
    } catch {
      // Skip if already deleted
    }
  }

  return cleared;
}
