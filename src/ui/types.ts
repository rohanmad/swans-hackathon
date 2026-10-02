export type SourceKind =
  | 'medical'
  | 'insurance'
  | 'legal'
  | 'communication'
  | 'financial'
  | 'internal'

export interface SourceSection {
  heading: string
  body: string
}

export interface Source {
  id: string
  title: string
  kind: SourceKind
  docType: string
  date: string
  author?: string
  origin: string
  sections: SourceSection[]
  excerpt: string
  usedIn: string[]
  href?: string
}

export type StageStatus = 'complete' | 'current' | 'upcoming'

export interface CaseStage {
  id: string
  label: string
  detail: string
  date?: string
  status: StageStatus
}

export interface CaseSignal {
  id: string
  label: string
  value: string
  qualifier: string
  sub?: string
  tone?: 'default' | 'ok' | 'warn' | 'high'
  sourceId: string
}

export type FactKind =
  | 'client'
  | 'incident'
  | 'liability'
  | 'treatment'
  | 'injury'
  | 'coverage'
  | 'money'
  | 'status'
  | 'activity'

export type BriefSegment =
  | string
  | { text: string; kind: FactKind; sourceId: string }

export interface CaseData {
  id: string
  title: string
  status: 'active' | 'closed'
  clientName: string
  defendantName: string
  lastUpdated: string
  stages: CaseStage[]
  signals: CaseSignal[]
}

export interface StoryEvent {
  id: string
  date: string
  category: string
  title: string
  summary: string
  sourceId: string
  isNow?: boolean
}

export interface Client {
  name: string
  initials: string
  age: number | null
  phone?: string
  email?: string
  address?: string
  representedSince: string
  lastContact: { date: string; channel: string; sourceId: string }
}

export interface Incident {
  date: string
  type: string
  location: string
  description: BriefSegment[]
  sourceId: string
}

export interface MedicalSummarySection {
  id: string
  label: string
  body: BriefSegment[]
  sourceIds: string[]
}

export type TreatmentStatus = 'active' | 'complete' | 'referred'

export interface MedicalProvider {
  id: string
  name: string
  office: string
  specialty: string
  phone?: string
  email?: string
  treatment: TreatmentStatus
  treatmentDetail: string
  recordIds: string[]
  billSourceId?: string
}

export type BillStatus = 'lien' | 'balance' | 'pending' | 'paid' | 'unknown'

export interface MedicalBill {
  id: string
  providerId: string
  payee: string
  amount: number
  status: BillStatus
  sourceId: string
  serviceFrom?: string
  serviceTo?: string
}

export interface TreatmentSpan {
  from: string
  to: string
  amount: number
  sourceId: string
}

export interface TreatmentMark {
  date: string
  label: string
  sourceId: string
  kind: 'appointment' | 'event'
}

export interface TreatmentLane {
  id: string
  name: string
  specialty: string
  billed: number
  spans: TreatmentSpan[]
  marks: TreatmentMark[]
}

export type DocCategory = string
export type DocStatus = 'ready' | 'requested' | 'missing' | 'draft'

export interface DemandDocument {
  id: string
  title: string
  category: DocCategory
  group: string
  status: DocStatus
  date?: string
  note?: string
  sourceId?: string
  key?: { label: string }
}

export type Urgency = 'overdue' | 'soon' | 'info'

export interface AttentionItem {
  id: string
  urgency: Urgency
  title: string
  description: string
  dueLabel: string
  owner?: string
  sourceId: string
  sourceLabel: string
  action: string
}

export interface WaitingItem {
  id: string
  party: string
  partyRole: string
  item: string
  requested: string
  sourceId: string
}

export interface SearchEntry {
  id: string
  question: string
  keywords: string[]
  answer: string
  sourceId: string
}

export interface DeskLine {
  text: string
  sourceId: string
  date?: string
  meta?: string
}

export interface SchedulingContact {
  name: string
  role: string
  phone?: string
  email?: string
  sourceId: string
}

export interface LienRow {
  holder: string
  amount: number
  status: string
  isLien: boolean
  sourceId: string
}

export interface ProviderDesk {
  signals: CaseSignal[]
  medicalHistory: DeskLine[]
  priorTreatment: DeskLine[]
  patientProvided: DeskLine[]
  stillNeeded: DeskLine[]
  scheduling: SchedulingContact[]
  appointments: DeskLine[]
  liens: LienRow[]
  lienNotes: DeskLine[]
  payout: LienPayout | null
}

/** When a provider treating on a lien can expect to be paid. Only dated when a Clio record sets a resolution event. */
export interface LienPayout {
  anchor?: { label: string; event: string; date: string; sourceId: string }
  window?: { from: string; to: string }
  basis: string
  unpaidSince?: { date: string; sourceId: string }
  blockers: DeskLine[]
}
