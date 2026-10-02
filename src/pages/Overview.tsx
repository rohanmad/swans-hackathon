import { caseFile, treatmentSpan } from '../data/case'
import { CaseSignals } from '../components/CaseSignals'
import { CaseStory } from '../components/CaseStory'
import { ClientCard } from '../components/ClientCard'
// import { CriticalNotes } from '../components/CriticalNotes'
import { DemandDocuments } from '../components/DemandDocuments'
import { IncidentCard } from '../components/IncidentCard'
import { Injuries } from '../components/Injuries'
import { MedicalBills } from '../components/MedicalBills'
import { MedicalProviders } from '../components/MedicalProviders'
import { MedicalRecordSummary } from '../components/MedicalRecordSummary'

export function Overview({ onOpenFinancials }: { onOpenFinancials: () => void }) {
  const f = caseFile
  return (
    <div className="mx-auto max-w-[1400px] px-10 pt-7 pb-24">
      {/* <CriticalNotes data={f.criticalNotes} /> */}

      <div>
        <CaseSignals signals={f.case.signals} />
      </div>

      <div className="mt-10 grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-12 max-[1240px]:gap-8">
        <div className="space-y-10">
          <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-8">
            <IncidentCard incident={f.incident} />
            <ClientCard client={f.client} />
          </div>
          <Injuries injuries={f.injuries} />
        </div>

        <div className="space-y-10">
          <MedicalProviders providers={f.medicalProviders} />
          <MedicalBills bills={f.medicalBills} onOpenFinancials={onOpenFinancials} />
        </div>
      </div>

      <div className="mt-14">
        <MedicalRecordSummary sections={f.medicalSummary} />
      </div>

      <div className="mt-14">
        <CaseStory events={f.timeline} treatmentSpan={treatmentSpan} />
      </div>

      <div className="mt-14">
        <DemandDocuments documents={f.demandDocuments} />
      </div>
    </div>
  )
}
