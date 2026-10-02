import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import type { Connection } from "./auth";
import { buildDigest } from "./digest";
import { HttpError } from "./errors";
import { snapshotKey } from "./ingestion";
import { hash } from "./security";
import { load, save } from "./store";
import type { Snapshot } from "./types";

export type ProviderView = {
  providerName: string;
  patientName: string;
  publishedAt: string;
  status?: { stage: string; caseStatus: string; lastActivity: string; note: string };
  coverage?: string;
  message?: string;
  charges?: { date: string; label: string; amount: number }[];
  documents?: { id: string; name: string; category: string; date: string }[];
  requests?: { title: string; due: string; overdue: boolean }[];
  appointments?: { date: string; title: string }[];
};
export type Share = { id: string; providerId: string; providerName: string; createdAt: string; revokedAt?: string; views: number; lastViewedAt?: string; content: ProviderView };
export type ShareRequest = {
  providerId: string;
  status: boolean; statusNote?: string;
  coverage: boolean; coverageText?: string;
  message?: string;
  charges: boolean;
  documents: string[]; requests: string[]; appointments: string[];
};
type TokenIndex = { connectionId: string; id: string };

const sharesKey = (conn: Connection) => "shares:" + conn.id;
const tokenKey = (token: string) => "sharetoken:" + hash(token);
const clip = (value: unknown, max = 1000) => typeof value === "string" ? value.trim().slice(0, max) : "";
const ids = (value: unknown) => Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").slice(0, 500) : [];

export function listShares(conn: Connection) { return load<Share[]>(sharesKey(conn)) ?? []; }

export function parseShareRequest(body: unknown): ShareRequest {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const providerId = clip(b.providerId, 30);
  if (!/^\d+$/.test(providerId)) throw new HttpError("Choose a provider to share with.", 400);
  return {
    providerId, status: b.status === true, statusNote: clip(b.statusNote), coverage: b.coverage === true, coverageText: clip(b.coverageText),
    message: clip(b.message, 2000), charges: b.charges === true, documents: ids(b.documents), requests: ids(b.requests), appointments: ids(b.appointments)
  };
}

export function buildProviderView(snapshot: Snapshot, request: ShareRequest, now = Date.now()): ProviderView {
  const digest = buildDigest(snapshot, now);
  const provider = digest.providers.find(p => p.id === request.providerId);
  if (!provider) throw new HttpError("That provider is not on the imported matter.", 400);
  const allDocs = digest.documents.flatMap(g => g.items.map(d => ({ ...d, category: g.category })));
  const pick = <T,>(items: T[], key: (item: T) => string, wanted: string[]) => items.filter(item => wanted.includes(key(item)));
  const view: ProviderView = { providerName: provider.name, patientName: digest.client?.name ?? "", publishedAt: new Date(now).toISOString() };
  if (request.status) view.status = { stage: digest.matter.stage, caseStatus: digest.matter.status, lastActivity: digest.matter.lastActivity, note: request.statusNote ?? "" };
  if (request.coverage && request.coverageText) view.coverage = request.coverageText;
  if (request.message) view.message = request.message;
  if (request.charges && provider.charges.length) view.charges = provider.charges.map(c => ({ date: c.date, label: c.label, amount: c.amount }));
  const documents = pick(allDocs, d => d.id, request.documents);
  if (documents.length) view.documents = documents;
  const requests = pick(provider.openRequests, t => t.source.id, request.requests);
  if (requests.length) view.requests = requests.map(t => ({ title: t.title, due: t.date, overdue: t.overdue }));
  const appointments = pick(provider.appointments, e => e.source.id, request.appointments);
  if (appointments.length) view.appointments = appointments.map(e => ({ date: e.date, title: e.title }));
  return view;
}

export function createShare(conn: Connection, body: unknown) {
  const snapshot = load<Snapshot>(snapshotKey(conn));
  if (!snapshot) throw new HttpError("Import the case before sharing.", 409);
  const request = parseShareRequest(body);
  const content = buildProviderView(snapshot, request);
  const token = randomBytes(24).toString("base64url");
  const share: Share = { id: randomUUID(), providerId: request.providerId, providerName: content.providerName, createdAt: content.publishedAt, views: 0, content };
  save(sharesKey(conn), [share, ...listShares(conn)]);
  save(tokenKey(token), { connectionId: conn.id, id: share.id } satisfies TokenIndex);
  return { share, token };
}

export function revokeShare(conn: Connection, id: string) {
  const shares = listShares(conn);
  const share = shares.find(s => s.id === id);
  if (!share) throw new HttpError("Share not found.", 404);
  share.revokedAt ??= new Date().toISOString();
  save(sharesKey(conn), shares);
  return share;
}

/** Resolves a provider link. Records a view when `track` is set. Never consults the firm session. */
export function openShare(token: string, track = false): { share: Share; connectionId: string } | null {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const index = load<TokenIndex>(tokenKey(token));
  if (!index) return null;
  const key = "shares:" + index.connectionId;
  const shares = load<Share[]>(key) ?? [];
  const share = shares.find(s => s.id === index.id);
  if (!share || share.revokedAt) return null;
  if (track) {
    share.views += 1;
    share.lastViewedAt = new Date().toISOString();
    save(key, shares);
  }
  return { share, connectionId: index.connectionId };
}
