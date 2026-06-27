import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { formatMAD, formatDate } from '../lib/format'
import { Badge } from './ui'

const statusTone = { a_payer: 'amber', paye: 'green', retard: 'red' }

export default function ContributionList({ contributions, onChanged }) {
  const { t } = useTranslation()
  const { canEditExpenses } = useAuth()
  const lang = localStorage.getItem('lang') || 'fr'

  async function markPaid(c) {
    const { error } = await supabase.from('cotisations')
      .update({ statut: 'paye', date_paiement: new Date().toISOString().slice(0, 10) })
      .eq('id', c.id)
    if (error) alert(error.message)
    else onChanged?.()
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
          <div className="mt-3 flex items-center gap-2">
            <Badge tone={statusTone[c.statut]}>{t(`finances.contributionStatus.${c.statut}`)}</Badge>
            {canEditExpenses && c.statut !== 'paye' && (
              <button onClick={() => markPaid(c)} className="btn-primary py-1.5 px-3 text-sm ms-auto">
                {t('finances.markPaid')}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
