export type ClioRecord = { id: number | string; [key: string]: unknown };
export const COLLECTIONS = ["contacts", "notes", "communications", "tasks", "calendar", "activities", "documents"] as const;
export type Collection = typeof COLLECTIONS[number];
export type CollectionResult = { records: ClioRecord[]; status: "complete" | "failed"; error?: string };
export type Snapshot = {
  matter: ClioRecord;
  collections: Record<Collection, CollectionResult>;
  syncedAt: string;
  status: "complete" | "partial";
};
export type SyncJob = { state: "running" | "complete" | "partial" | "failed"; step: string; startedAt: string; updatedAt: string; error?: string };
export type AppStatus = {
  configured: boolean;
  configError: string | null;
  redirectUri: string;
  connected: boolean;
  hasSavedConnection: boolean;
  userName: string | null;
  snapshot: Snapshot | null;
  digest: import("./digest").Digest | null;
  job: SyncJob | null;
};
export function text(record: ClioRecord, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : "";
}
export function nested(record: ClioRecord, key: string): ClioRecord | null {
  const value = record[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value as ClioRecord : null;
}
export function plainText(value: string): string {
  // Render text only. Never inject imported HTML into the page.
  return value.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').trim();
}
