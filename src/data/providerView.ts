import type { CaseFile, ProviderView, Source } from '../types'
import { caseFile } from './case'
import { sourceById } from './sources'

// Runs on the firm side. The provider portal only ever receives the returned
// ProviderView; it must never import `caseFile` or the global source registry.
export function deriveProviderView(file: CaseFile, providerId: string): ProviderView {
  const provider = file.medicalProviders.find((p) => p.id === providerId)
  const bill = file.medicalBills.find((b) => b.providerId === providerId)
  if (!provider || !bill) throw new Error(`No provider relationship for ${providerId}`)

  const shares = file.providerShares[providerId] ?? []
  const sources: Record<string, Source> = {}
  for (const share of shares) {
    const src = sourceById[share.sourceId]
    sources[src.id] = {
      ...src,
      origin: `Shared by ${file.schedulingContact.firm}`,
      usedIn: [],
    }
  }

  const lienShare = shares.find((s) => sourceById[s.sourceId].docType.includes('Lien'))

  return {
    office: { name: provider.office, clinician: provider.name, specialty: provider.specialty },
    patient: { name: file.client.name, dateOfInjury: file.incident.date },
    caseStatus: {
      label: file.case.status === 'active' ? 'Active' : 'Closed',
      active: file.case.status === 'active',
      lastUpdate: file.providerUpdates[0]?.date ?? file.case.lastUpdated,
    },
    schedulingContact: { ...file.schedulingContact },
    sharedRecords: shares
      .map((s) => {
        const src = sourceById[s.sourceId]
        return { sourceId: src.id, title: src.title, docType: src.docType, date: src.date, sharedOn: s.sharedOn, group: s.group }
      })
      .sort((a, b) => b.sharedOn.localeCompare(a.sharedOn)),
    providerBills: { amount: bill.amount, status: bill.status, sourceId: bill.sourceId },
    providerLien: {
      status: bill.status === 'paid' ? 'Released' : 'Active',
      filed: lienShare?.sharedOn ?? '',
      sourceId: lienShare?.sourceId,
    },
    limitedUpdates: file.providerUpdates.map((u) => ({ ...u })),
    sources,
  }
}

export const providerView = deriveProviderView(caseFile, 'westbrook-ortho')
