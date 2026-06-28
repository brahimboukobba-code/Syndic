import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { formatMAD, formatDate } from '../lib/format'
import { generateReceipt } from '../lib/receipt'
import { notifyUser } from '../lib/notify'
import { Badge } from './ui'
import ProofLink from './ProofLink'

const statusTone = { a_payer: 'amber', paye: 'green', retard: 'red' }

export default function ContributionList({ contributions, onChanged }) {
  const { t } = useTranslation()
  const { canEditExpenses, building } = useAuth()
  const lang = localStorage.getItem('lang') || 'fr'
  const [busyId, setBusyId] = useState(null)

  async function markPaid(c) {
    setBusyId(c.id)
    try {
      const datePaiement = new Date().toISOString().slice(0, 10)
      // 1. Marquer payée (le trigger SQL génère le numéro de reçu)
      const { error } = await supabase.from('cotisations')
        .update({ statut: 'paye', date_paiement: datePaiement })
        .eq('id', c.id)
      if (error) throw error

      // 2. Relire pour récupérer le numéro de reçu généré par le trigger
      const { data: fresh } = await supabase.from('cotisations')
        .select('*, logement:logements(numero)')
        .eq('id', c.id)
        .single()

      // 3. Générer le PDF du reçu et le stocker
      if (fresh) {
        try {
          const recuPath = await generateReceipt({
            cotisation: fresh,
            immeuble: building,
            logementNumero: fresh.logement?.numero,
            recuNumero: fresh.recu_numero,
          })
          await supabase.from('cotisations').update({ recu_url: recuPath }).eq('id', c.id)

          // 4. Notifier le(s) propriétaire(s) du logement que le reçu est dispo
          const { data: occ } = await supabase
            .from('occupations')
            .select('user_id')
            .eq('logement_id', fresh.logement_id)
            .eq('type', 'proprietaire')
            .is('date_fin', null)
          for (const o of occ || []) {
            await notifyUser(o.user_id, {
              type: 'recu_disponible',
              titre: t('finances.recuReady'),
              message: `${fresh.periode} · ${formatMAD(fresh.montant)}`,
              entiteType: 'cotisation', entiteId: c.id,
            })
          }
        } catch (pdfErr) {
          // Le paiement est enregistré même si le PDF échoue
          console.warn('Reçu non généré :', pdfErr?.message)
        }
      }
      onChanged?.()
    } catch (e) {
      alert(e.message)
    } finally {
      setBusyId(null)
    }
  }

  if (!contributions.length) {
    return <p className="text-sm opacity-60 py-8 text-center">{t('finances.noContributions')}</p>
  }

  return (
    <div className="space-y-3">
      {contributions.map((c) => (
        <div key={c.id} className="card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">
                {c.logement?.numero || t('finances.apartment')} · {c.periode}
              </p>
              <p className="text-sm opacity-60 mt-0.5">
                {t('finances.dueDate')} : {formatDate(c.date_echeance, lang)}
                {c.statut === 'paye' && c.date_paiement && (
                  <> · {t('finances.paidOn')} {formatDate(c.date_paiement, lang)}</>
                )}
              </p>
            </div>
            <p className="text-lg font-semibold whitespace-nowrap">{formatMAD(c.montant)}</p>
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Badge tone={statusTone[c.statut]}>{t(`finances.contributionStatus.${c.statut}`)}</Badge>
            {/* Reçu téléchargeable si disponible */}
            {c.statut === 'paye' && c.recu_url && (
              <ProofLink path={c.recu_url} />
            )}
            {canEditExpenses && c.statut !== 'paye' && (
              <button onClick={() => markPaid(c)} disabled={busyId === c.id} className="btn-primary py-1.5 px-3 text-sm ms-auto">
                {busyId === c.id ? t('finances.saving') : t('finances.markPaid')}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
