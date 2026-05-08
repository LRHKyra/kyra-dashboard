import { getSftp, exec as sshExec } from "./ssh-client";
import type { SFTPWrapper, Stats } from "ssh2";
import { Readable } from "stream";
import readline from "readline";
import path from "path";
import fs from "fs";
import os from "os";

export async function exists(remotePath: string): Promise<boolean> {
  const sftp = await getSftp();
  return new Promise((resolve) => {
    sftp.stat(remotePath, (err) => resolve(!err));
  });
}

export async function readFile(remotePath: string, encoding: BufferEncoding = "utf-8"): Promise<string> {
  const sftp = await getSftp();
  return new Promise((resolve, reject) => {
    sftp.readFile(remotePath, { encoding }, (err, data) => {
      if (err) return reject(err);
      resolve(data.toString(encoding));
    });
  });
}

export async function readJSON<T = unknown>(remotePath: string): Promise<T | null> {
  try {
    const content = await readFile(remotePath);
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export async function stat(remotePath: string): Promise<Stats> {
  const sftp = await getSftp();
  return new Promise((resolve, reject) => {
    sftp.stat(remotePath, (err, stats) => {
      if (err) return reject(err);
      resolve(stats);
    });
  });
}

export async function readdir(remotePath: string): Promise<string[]> {
  const sftp = await getSftp();
  return new Promise((resolve, reject) => {
    sftp.readdir(remotePath, (err, list) => {
      if (err) return reject(err);
      resolve(list.map((entry) => entry.filename));
    });
  });
}

export interface DirEntry {
  name: string;
  isDirectory: boolean;
}

export async function readdirWithTypes(remotePath: string): Promise<DirEntry[]> {
  const sftp = await getSftp();
  return new Promise((resolve, reject) => {
    sftp.readdir(remotePath, (err, list) => {
      if (err) return reject(err);
      resolve(
        list.map((entry) => ({
          name: entry.filename,
          // attrs.mode & 0o40000 checks for directory bit
          isDirectory: !!(entry.attrs.mode & 0o40000),
        }))
      );
    });
  });
}

export function createReadStream(sftp: SFTPWrapper, remotePath: string): Readable {
  return sftp.createReadStream(remotePath, { encoding: "utf-8" });
}

export async function downloadFile(remotePath: string, localPath: string): Promise<void> {
  const sftp = await getSftp();
  return new Promise((resolve, reject) => {
    sftp.fastGet(remotePath, localPath, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export async function listFilesRecursive(dir: string, prefix = ""): Promise<string[]> {
  const results: string[] = [];
  let entries: DirEntry[];
  try {
    entries = await readdirWithTypes(dir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory) {
      results.push(...(await listFilesRecursive(path.join(dir, entry.name), rel)));
    } else {
      results.push(rel);
    }
  }
  return results;
}

/** Run async tasks with bounded concurrency */
export async function parallel<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency = 20
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

export async function writeFile(remotePath: string, content: string): Promise<void> {
  const sftp = await getSftp();
  return new Promise((resolve, reject) => {
    const stream = sftp.createWriteStream(remotePath);
    stream.on("close", resolve);
    stream.on("error", reject);
    stream.end(content, "utf-8");
  });
}

export async function deleteFile(remotePath: string): Promise<void> {
  const sftp = await getSftp();
  return new Promise((resolve, reject) => {
    sftp.unlink(remotePath, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export { sshExec as exec };
