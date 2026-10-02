import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

let database: DatabaseSync | undefined;
let encryptionKey: Buffer | undefined;
function directory() {
  const dir = resolve(/*turbopackIgnore: true*/ process.env.CASEBRIEF_DATA_DIR || ".data");
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);
  return dir;
}
function db() {
  if (!database) {
    const path = resolve(directory(), "casebrief.sqlite");
    database = new DatabaseSync(path);
    chmodSync(path, 0o600);
    database.exec("PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);");
  }
  return database;
}
export function load<T>(key: string): T | null {
  const row = db().prepare("SELECT value FROM kv WHERE key = ?").get(key) as { value: string } | undefined;
  return row ? JSON.parse(row.value) as T : null;
}
export function save(key: string, value: unknown) {
  db().prepare("INSERT INTO kv(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(key, JSON.stringify(value));
}
export function remove(key: string) { db().prepare("DELETE FROM kv WHERE key = ?").run(key); }
export function take<T>(key: string): T | null {
  const row = db().prepare("DELETE FROM kv WHERE key = ? RETURNING value").get(key) as { value: string } | undefined;
  return row ? JSON.parse(row.value) as T : null;
}
function key() {
  if (!encryptionKey) {
    const path = resolve(directory(), "encryption.key");
    if (!existsSync(path)) {
      try { writeFileSync(path, randomBytes(32), { flag: "wx", mode: 0o600 }); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
    }
    encryptionKey = readFileSync(path);
    if (encryptionKey.length !== 32) throw new Error("Invalid local encryption key.");
  }
  return encryptionKey;
}
export function encrypt(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}
export function decrypt<T>(value: string): T {
  const bytes = Buffer.from(value, "base64");
  const cipher = createDecipheriv("aes-256-gcm", key(), bytes.subarray(0, 12));
  cipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString()) as T;
}
