import readline from "readline";
import { getSftp } from "./ssh-client";
import * as rfs from "./remote-fs";
import type { JournalRecord, MessageRecord } from "./types";

/** Parse all records from a remote JSONL file */
export async function parseJsonlFile(filePath: string): Promise<JournalRecord[]> {
  const records: JournalRecord[] = [];
  try {
    const sftp = await getSftp();
    const stream = rfs.createReadStream(sftp, filePath);
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        records.push(JSON.parse(line));
      } catch {
        // skip malformed lines
      }
    }
  } catch {
    // file doesn't exist or read error
  }
  return records;
}

/** Parse JSONL file with pagination - returns records at [offset, offset+limit) */
export async function parseJsonlPaginated(
  filePath: string,
  offset: number = 0,
  limit: number = 50
): Promise<{ records: JournalRecord[]; total: number }> {
  try {
    const sftp = await getSftp();
    const stream = rfs.createReadStream(sftp, filePath);
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    const records: JournalRecord[] = [];
    let lineNum = 0;
    let total = 0;

    for await (const line of rl) {
      if (!line.trim()) continue;
      total++;
      if (lineNum >= offset && lineNum < offset + limit) {
        try {
          const record = JSON.parse(line) as JournalRecord;
          // Strip thinking signatures (large base64 blobs)
          if (record.type === "message") {
            const msg = record as MessageRecord;
            if (msg.message?.content) {
              msg.message.content = msg.message.content.map((block) => {
                if (block.type === "thinking" && "thinkingSignature" in block) {
                  const { thinkingSignature: _, ...rest } = block as Record<string, unknown>;
                  return rest as typeof block;
                }
                return block;
              });
            }
          }
          records.push(record);
        } catch {
          // skip
        }
      }
      lineNum++;
    }

    return { records, total };
  } catch {
    return { records: [], total: 0 };
  }
}

/** Extract message records from a JSONL file */
export async function extractMessages(filePath: string): Promise<MessageRecord[]> {
  const records = await parseJsonlFile(filePath);
  return records.filter((r): r is MessageRecord => r.type === "message");
}
