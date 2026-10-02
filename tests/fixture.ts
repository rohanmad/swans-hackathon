import type { Snapshot } from "../src/lib/types";

const done = (records: Snapshot["collections"][keyof Snapshot["collections"]]["records"]) => ({ records, status: "complete" as const });

export const NOW = Date.parse("2030-06-15T12:00:00Z");

export function fixture(): Snapshot {
  return {
    syncedAt: "2030-06-15T11:00:00Z",
    status: "complete",
    matter: {
      id: 100, display_number: "0042-Doe", description: "Doe — slip and fall", status: "Open", open_date: "2029-01-10", last_activity_date: "2030-06-01",
      client: { id: 1, name: "Jane Doe", date_of_birth: "1980-02-01" }, matter_stage: { id: 5, name: "Pre-litigation" },
      custom_field_values: [
        { id: "a", field_name: "Date of Incident", field_type: "date", value: "2029-01-01" },
        { id: "b", field_name: "Policy Limits", field_type: "text_area", value: "$50,000 / $100,000" },
        { id: "c", field_name: "Estimated Case Value", field_type: "currency", value: 90000 },
        { id: "d", field_name: "Medical Specials To Date", field_type: "currency", value: 1200 },
        { id: "e", field_name: "Lien Holder", field_type: "text_area", value: "Medicare <b>$400</b>" },
        { id: "f", field_name: "Coverage Confirmed", field_type: "checkbox", value: true },
        { id: "g", field_name: "Empty Field", field_type: "text_line", value: null }
      ]
    },
    collections: {
      contacts: done([
        { id: 1, name: "Jane Doe", is_client: true, relationship_name: "Client" },
        { id: 2, name: "Northside Physical Therapy", is_client: false, relationship_name: "Treating provider, physical therapy" },
        { id: 3, name: "Acme Insurance", is_client: false, relationship_name: "Adverse carrier" }
      ]),
      notes: done([
        { id: 10, subject: "Lunch order", detail: "Sandwiches.", date: "2030-06-10" },
        { id: 11, subject: "Coverage and policy limits", detail: "Carrier confirmed limits; demand to follow. Surgery is an open question.", date: "2030-06-01" },
        { id: 12, subject: "Strategy: settle low", detail: "Privileged settlement strategy.", date: "2030-05-01" }
      ]),
      communications: done([
        { id: 20, subject: "Checking in", body: "How is my case?", type: "EmailCommunication", date: "2030-06-05", senders: [{ id: 1, name: "Jane Doe" }], receivers: [{ id: 99, name: "Attorney" }] },
        { id: 21, subject: "Called client", type: "PhoneCommunication", date: "2030-06-12", senders: [{ id: 99, name: "Attorney" }], receivers: [{ id: 1, name: "Jane Doe" }] },
        { id: 22, subject: "Records enclosed", type: "EmailCommunication", date: "2030-03-01", senders: [{ id: 2, name: "Northside Physical Therapy" }], receivers: [{ id: 99 }] }
      ]),
      tasks: done([
        { id: 30, name: "By medical provider: Northside Physical Therapy - Updated bill", status: "pending", due_at: "2030-06-01" },
        { id: 31, name: "Obtain pay stubs from client", status: "pending", due_at: "2030-06-20" },
        { id: 32, name: "Draft demand", status: "pending", due_at: "2030-09-01" },
        { id: 33, name: "Limitations Date", status: "pending", due_at: "2032-01-01", statute_of_limitations: true },
        { id: 34, name: "Send retainer", status: "complete", due_at: "2029-01-11", completed_at: "2029-01-11" }
      ]),
      calendar: done([
        { id: 40, summary: "PT session, Northside Physical Therapy", start_at: "2030-06-18T15:00:00Z" },
        { id: 41, summary: "Intake meeting", start_at: "2029-01-10T15:00:00Z" }
      ]),
      activities: done([
        { id: 50, type: "ExpenseEntry", date: "2029-02-01", note: "Records copy fee. Paid by the firm.", total: 25, quantity: 1, price: 25 },
        { id: 51, type: "ExpenseEntry", date: "2029-03-01", note: "Medical treatment charges: Northside Physical Therapy; services 2029-01-05 to 2029-03-01", total: null, quantity: 1, price: 1200 },
        { id: 52, type: "TimeEntry", date: "2029-03-02", note: "Review file", total: 300 }
      ]),
      documents: done([
        { id: 60, name: "04-medical-records__created__northside-physical-records.pdf", received_at: "2029-03-01T00:00:00Z" },
        { id: 61, name: "02-pleadings__doc-01__complaint.pdf", received_at: "2029-04-01T00:00:00Z" },
        { id: 62, name: "loose-file.pdf", created_at: "2029-05-01T00:00:00Z" }
      ])
    }
  };
}
