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

export interface CriticalNote {
  id: string
  text: string
  sourceId?: string
}

export interface CriticalNotes {
  notes: CriticalNote[]
  pinnedBy: string
  updated: string
}

export interface Client {
  name: string
  initials: string
  age: number
  phone: string
  email: string
  address: string
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
  phone: string
  treatment: TreatmentStatus
  treatmentDetail: string
  recordIds: string[]
  billSourceId?: string
}

export type BillStatus = 'lien' | 'balance' | 'pending' | 'paid'

export interface MedicalBill {
  id: string
  providerId: string
  payee: string
  amount: number
  status: BillStatus
  sourceId: string
}

export type DocCategory = 'medical' | 'liability' | 'insurance' | 'demand'
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

export interface ProviderShare {
  sourceId: string
  sharedOn: string
  group: 'Imaging' | 'Evaluations' | 'Treatment records' | 'Billing'
}

export interface ProviderUpdate {
  id: string
  date: string
  text: string
}

export interface CaseFile {
  case: CaseData
  client: Client
  incident: Incident
  criticalNotes: CriticalNotes
  injuries: Injury[]
  medicalSummary: MedicalSummarySection[]
  medicalProviders: MedicalProvider[]
  medicalBills: MedicalBill[]
  demandDocuments: DemandDocument[]
  timeline: StoryEvent[]
  internalNotes: string[]
  schedulingContact: SchedulingContact
  providerShares: Record<string, ProviderShare[]>
  providerUpdates: ProviderUpdate[]
}

export interface SchedulingContact {
  name: string
  role: string
  firm: string
  phone: string
  email: string
  hours: string
}

export interface SharedRecord {
  sourceId: string
  title: string
  docType: string
  date: string
  sharedOn: string
  group: ProviderShare['group']
}

export interface ProviderView {
  office: { name: string; clinician: string; specialty: string }
  patient: { name: string; dateOfInjury: string }
  caseStatus: { label: string; active: boolean; lastUpdate: string }
  schedulingContact: SchedulingContact
  sharedRecords: SharedRecord[]
  providerBills: { amount: number; status: BillStatus; sourceId: string }
  providerLien: { status: 'Active' | 'Released'; filed: string; sourceId?: string }
  limitedUpdates: ProviderUpdate[]
  sources: Record<string, Source>
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

export type Confidence = 'high' | 'medium' | 'low'

export interface Injury {
  id: string
  region: string
  priority: 'primary' | 'secondary'
  finding: string
  confidence: Confidence
  rationale: string
  evidence: string[]
}

export interface SearchEntry {
  id: string
  question: string
  keywords: string[]
  answer: string
  sourceId: string
}
