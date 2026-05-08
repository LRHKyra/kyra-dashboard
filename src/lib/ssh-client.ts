import { Client, type SFTPWrapper } from "ssh2";
import fs from "fs";
import path from "path";

const SSH_HOST = process.env.SSH_HOST || "mac-mini";
const SSH_PORT = parseInt(process.env.SSH_PORT || "22", 10);
const SSH_USER = process.env.SSH_USER || "lucas";
const SSH_KEY_PATH = process.env.SSH_KEY_PATH || path.join(process.env.HOME || "", ".ssh/id_ed25519");

let client: Client | null = null;
let sftp: SFTPWrapper | null = null;
let connectPromise: Promise<void> | null = null;

function cleanup() {
  sftp = null;
  if (client) {
    client.removeAllListeners();
    client.end();
    client = null;
  }
  connectPromise = null;
}

function doConnect(): Promise<void> {
  if (connectPromise) return connectPromise;

  connectPromise = new Promise<void>((resolve, reject) => {
    cleanup();
    const c = new Client();
    client = c;

    c.on("ready", () => {
      c.sftp((err, sftpSession) => {
        if (err) {
          cleanup();
          return reject(err);
        }
        sftp = sftpSession;
        resolve();
      });
    });

    c.on("error", (err) => {
      cleanup();
      reject(err);
    });

    c.on("end", () => {
      sftp = null;
      client = null;
      connectPromise = null;
    });

    c.on("close", () => {
      sftp = null;
      client = null;
      connectPromise = null;
    });

    c.connect({
      host: SSH_HOST,
      port: SSH_PORT,
      username: SSH_USER,
      privateKey: fs.readFileSync(SSH_KEY_PATH),
    });
  });

  return connectPromise;
}

export async function getSftp(): Promise<SFTPWrapper> {
  if (sftp) return sftp;
  await doConnect();
  return sftp!;
}

export async function exec(command: string): Promise<string> {
  if (!client) await doConnect();
  const c = client;
  if (!c) throw new Error("SSH client not connected");
  return new Promise((resolve, reject) => {
    c.exec(command, (err, stream) => {
      if (err) return reject(err);
      let stdout = "";
      let stderr = "";
      stream.on("data", (data: Buffer) => { stdout += data.toString(); });
      stream.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });
      stream.on("close", (code: number) => {
        if (code !== 0 && !stdout) {
          reject(new Error(`Command exited with code ${code}: ${stderr}`));
        } else {
          resolve(stdout);
        }
      });
    });
  });
}
