import "server-only";
import { clio } from "./clio";
import type { Connection } from "./auth";
import { HttpError } from "./errors";
import { load, save } from "./store";
import { COLLECTIONS, type ClioRecord, type Collection, type CollectionResult, type Snapshot, type SyncJob } from "./types";

const matterFields = "id,etag,display_number,description,status,open_date,close_date,created_at,updated_at,last_activity_date,client{id,name,date_of_birth},matter_stage{id,name},currency{code},custom_field_values{id,field_name,field_type,value}";
const specifications: Record<Collection, { path: string; fields: string; extra?: Record<string, string> }> = {
  contacts: { path: "contacts", fields: "id,name,type,is_client,relationship_name,description,primary_email_address,primary_phone_number,updated_at" },
  notes: { path: "notes", fields: "id,etag,subject,detail,date,created_at,updated_at,author{id,name}", extra: { type: "Matter" } },
  communications: { path: "communications", fields: "id,etag,subject,body,type,date,received_at,created_at,updated_at,senders,receivers" },
  tasks: { path: "tasks", fields: "id,etag,name,description,status,priority,due_at,completed_at,statute_of_limitations,created_at,updated_at,assignee{id,name}" },
  calendar: { path: "calendar_entries", fields: "id,etag,summary,description,start_at,end_at,all_day,location,created_at,updated_at" },
  activities: { path: "activities", fields: "id,etag,type,date,note,total,quantity,price,created_at,updated_at,currency{code}" },
  documents: { path: "documents", fields: "id,etag,name,filename,size,content_type,received_at,created_at,updated_at,latest_document_version{id,filename,size,content_type}" }
};
export function snapshotKey(conn: Connection) { return "snapshot:" + conn.id; }
export function jobKey(conn: Connection) { return "job:" + conn.id; }
export function getJob(conn: Connection) {
  const job = load<SyncJob>(jobKey(conn));
  if (job?.state === "running" && Date.now() - Date.parse(job.updatedAt) > 10 * 60_000) {
    job.state = "failed";
    job.error = "Import was interrupted. Start a new import.";
    save(jobKey(conn), job);
  }
  return job;
}
export async function listMatters(conn: Connection) {
  return clio(conn).all("matters.json", { fields: "id,display_number,description,status,client{id,name}" });
}
export function startJob(conn: Connection) {
  if (getJob(conn)?.state === "running") throw new HttpError("An import is already running.", 409);
  const now = new Date().toISOString();
  const job: SyncJob = { state: "running", step: "Reading matter details", startedAt: now, updatedAt: now };
  save(jobKey(conn), job);
  return job;
}
export async function importMatter(conn: Connection, matterId: string) {
  const client = clio(conn);
  function progress(step: string, state: SyncJob["state"] = "running", error?: string) {
    const job = load<SyncJob>(jobKey(conn));
    if (job) save(jobKey(conn), { ...job, step, state, error, updatedAt: new Date().toISOString() });
  }
  try {
    const result = await client.get(`matters/${matterId}.json`, { fields: matterFields });
    const matter = result.data as ClioRecord;
    if (!matter || String(matter.id) !== matterId) throw new HttpError("Clio returned an unexpected matter.", 502);
    const collections = {} as Record<Collection, CollectionResult>;
    for (const name of COLLECTIONS) {
      const spec = specifications[name];
      progress(`Reading ${name}`);
      try {
        const path = name === "contacts" ? `matters/${matterId}/contacts.json` : `${spec.path}.json`;
        const params = { fields: spec.fields, ...(name === "contacts" ? {} : { matter_id: matterId }), ...spec.extra };
        const records = await client.all(path, params, count => progress(`Reading ${name}: ${count} records`));
        collections[name] = { records, status: "complete" };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Import failed.";
        collections[name] = { records: [], status: "failed", error: message };
        // A revoked connection cannot yield a reliable partial import.
        if (error instanceof HttpError && error.status === 401) throw error;
      }
    }
    const partial = COLLECTIONS.some(name => collections[name].status === "failed");
    const snapshot: Snapshot = { matter, collections, status: partial ? "partial" : "complete", syncedAt: new Date().toISOString() };
    save(snapshotKey(conn), snapshot);
    progress(partial ? "Import finished with missing collections" : "Case records imported", partial ? "partial" : "complete");
  } catch (error) {
    progress("Import failed; previous saved case preserved", "failed", error instanceof Error ? error.message : "Could not import the case.");
  }
}
