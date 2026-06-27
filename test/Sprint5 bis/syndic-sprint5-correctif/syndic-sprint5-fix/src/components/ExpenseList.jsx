import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { formatMAD, formatDate } from '../lib/format'
import { Badge } from './ui'
import ProofLink from './ProofLink'

const statusTone = {
  en_attente_validation: 'amber',
  valide: 'green',
  rejete: 'red',
  supprime: 'gray',
}

// Carte d'une dépense, avec actions de validation si applicable
export default function ExpenseList({ expenses, onChanged }) {
  const { t } = useTranslation()
  const { isManager, hasRole, profile } = useAuth()
  const lang = localStorage.getItem('lang') || 'fr'

  async function sign(expense, which) {
    const { data: { user } } = await supabase.auth.getUser()
    const patch = which === 'syndic'
      ? { valide_par_syndic: user.id }
      : { valide_par_vice_syndic: user.id }

    // Si les deux signatures seront présentes, on passe à 'valide'
    const willHaveBoth =
      (which === 'syndic' ? user.id : expense.valide_par_syndic) &&
      (which === 'vice' ? user.id : expense.valide_par_vice_syndic)
    if (willHaveBoth) patch.statut = 'valide'

    const { error } = await supabase.from('depenses').update(patch).eq('id', expense.id)
    if (error) alert(error.message)
    else onChanged?.()
  }

  if (!expenses.length) {
    return <p className="text-sm opacity-60 py-8 text-center">{t('finances.noExpenses')}</p>
  }

  return (
    <div className="space-y-3">
      {expenses.map((e) => {
        const deleted = e.statut === 'supprime'
        const canSignSyndic = hasRole('syndic') && e.statut === 'en_attente_validation' && !e.valide_par_syndic
        const canSignVice = hasRole('vice_syndic') && e.statut === 'en_attente_validation' && !e.valide_par_vice_syndic
        return (
          <div key={e.id} className={`card ${deleted ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`font-medium ${deleted ? 'line-through' : ''}`}>{e.intitule}</p>
                <p className="text-sm opacity-60 mt-0.5">
                  {e.beneficiaire} · {formatDate(e.date_depense, lang)}
                </p>
              </div>
              <p className={`text-lg font-semibold whitespace-nowrap ${deleted ? 'line-through' : ''}`}>
                {formatMAD(e.montant)}
              </p>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone={statusTone[e.statut]}>{t(`finances.expenseStatus.${e.statut}`)}</Badge>
              <Badge tone="blue">{t(`finances.expenseTypes.${e.type_depense}`)}</Badge>
              {e.categorie && (
                <Badge tone="gray">{lang === 'ar' && e.categorie.nom_ar ? e.categorie.nom_ar : e.categorie.nom_fr}</Badge>
              )}
              <ProofLink path={e.justificatif_url} className="ms-auto" />
            </div>

            {/* État de la double validation */}
            {e.requiert_validation && e.statut === 'en_attente_validation' && (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-black/5 dark:border-white/10 pt-3">
                <Badge tone={e.valide_par_syndic ? 'green' : 'amber'}>
                  {e.valide_par_syndic ? '✓ ' : ''}{t('finances.awaitingSyndic')}
                </Badge>
                <Badge tone={e.valide_par_vice_syndic ? 'green' : 'amber'}>
                  {e.valide_par_vice_syndic ? '✓ ' : ''}{t('finances.awaitingVice')}
                </Badge>
                {canSignSyndic && (
                  <button onClick={() => sign(e, 'syndic')} className="btn-primary py-1.5 px-3 text-sm ms-auto">
                    {t('finances.validate')}
                  </button>
                )}
                {canSignVice && (
                  <button onClick={() => sign(e, 'vice')} className="btn-primary py-1.5 px-3 text-sm ms-auto">
                    {t('finances.validate')}
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
