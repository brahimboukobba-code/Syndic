import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { formatMAD } from '../lib/format'
import { generateReceipt } from '../lib/receipt'
import { notifyUser } from '../lib/notify'
import ProofLink from './ProofLink'

// Grille mensuelle des cotisations : logements en lignes, 12 mois en colonnes.
// Statuts d'une case :
//   (vide)    = pas encore déclarée  -> bouton pour déclarer
//   declaree  = déclarée par syndic  -> en attente validation trésorier
//   paye      = validée par trésorier
const MOIS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
const MOIS_AR = ['ينا','فبر','مار','أبر','ماي','يون','يول','غشت','شت','أكت','نون','دجن']

export default function ContributionGrid({ exercice, building, logements, contributions, onChanged }) {
  const { t, i18n } = useTranslation()
  const { roleNames, profile, session } = useAuth()
  const lang = i18n.language
  const mois = lang === 'ar' ? MOIS_AR : MOIS_FR
  const [busy, setBusy] = useState(null) // clé "logId-month"
  const [montant, setMontant] = useState(building?.montant_cotisation_defaut || 1500)
  const [mesRecus, setMesRecus] = useState([])

  const isTresorier = roleNames.includes('tresorier') || roleNames.includes('admin')
  const isSyndic = roleNames.some((r) => ['syndic','vice_syndic'].includes(r))
  const canManage = isTresorier || isSyndic
  const uid = session?.user?.id

  // Pour un propriétaire (lecture seule) : charger SES cotisations payées
  // (de son/ses logement(s)) avec le reçu PDF associé.
  useEffect(() => {
    if (canManage || !uid || !exercice?.id) return
    let cancel = false
    ;(async () => {
      // Trouver les logements de l'utilisateur
      const { data: occ } = await supabase
        .from('occupations')
        .select('logement_id')
        .eq('user_id', uid)
        .is('date_fin', null)
      const logIds = (occ || []).map((o) => o.logement_id)
      if (logIds.length === 0) { if (!cancel) setMesRecus([]); return }
      const { data: cots } = await supabase
        .from('cotisations')
        .select('id, periode, montant, statut, recu_url, recu_numero, date_paiement, logement:logements(numero)')
        .eq('exercice_id', exercice.id)
        .in('logement_id', logIds)
        .eq('statut', 'paye')
        .order('periode', { ascending: false })
      if (!cancel) setMesRecus(cots || [])
    })()
    return () => { cancel = true }
  }, [canManage, uid, exercice?.id, contributions])

  const annee = useMemo(() => {
    if (exercice?.date_debut) return new Date(exercice.date_debut).getFullYear()
    return new Date().getFullYear()
  }, [exercice])

  // Index des cotisations par "logementId-period" (period = "YYYY-MM")
  const byCell = useMemo(() => {
    const map = {}
    for (const c of contributions) {
      map[`${c.logement_id}-${c.periode}`] = c
    }
    return map
  }, [contributions])

  function periodFor(monthIndex) {
    const mm = String(monthIndex + 1).padStart(2, '0')
    return `${annee}-${mm}`
  }

  // Déclarer une cotisation comme payée (statut declaree)
  async function declarer(logement, monthIndex) {
    const periode = periodFor(monthIndex)
    const key = `${logement.id}-${periode}`
    setBusy(key)
    try {
      const echeance = `${periode}-28`
      const { error } = await supabase.from('cotisations').upsert({
        exercice_id: exercice.id,
        logement_id: logement.id,
        periode,
        montant: Number(montant) || 0,
        date_echeance: echeance,
        statut: 'declaree',
        declaree_par: profile?.id,
        declaree_le: new Date().toISOString(),
      }, { onConflict: 'exercice_id,logement_id,periode' })
      if (error) throw error
      onChanged?.()
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy(null)
    }
  }

  // Valider une cotisation déclarée (trésorier) -> paye
  async function valider(cotisation) {
    setBusy(`${cotisation.logement_id}-${cotisation.periode}`)
    try {
      const { error } = await supabase.from('cotisations').update({
        statut: 'paye',
        date_paiement: new Date().toISOString().slice(0, 10),
        validee_par: profile?.id,
        validee_le: new Date().toISOString(),
      }).eq('id', cotisation.id)
      if (error) throw error

      // Relire pour récupérer le numéro de reçu généré par le trigger
      const { data: fresh } = await supabase.from('cotisations')
        .select('*, logement:logements(numero)')
        .eq('id', cotisation.id)
        .single()

      // Générer le PDF du reçu, le stocker, et notifier le propriétaire
      if (fresh) {
        try {
          const recuPath = await generateReceipt({
            cotisation: fresh,
            immeuble: building,
            logementNumero: fresh.logement?.numero,
            recuNumero: fresh.recu_numero,
          })
          await supabase.from('cotisations').update({ recu_url: recuPath }).eq('id', cotisation.id)

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
              entiteType: 'cotisation', entiteId: cotisation.id,
            })
          }
        } catch (pdfErr) {
          // Le paiement est validé même si le PDF échoue
          console.warn('Reçu non généré :', pdfErr?.message)
        }
      }
      onChanged?.()
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy(null)
    }
  }

  // Annuler une déclaration (revenir à vide) — syndic/trésorier
  async function annuler(cotisation) {
    if (!confirm(t('contrib.confirmCancel'))) return
    setBusy(`${cotisation.logement_id}-${cotisation.periode}`)
    try {
      const { error } = await supabase.from('cotisations').delete().eq('id', cotisation.id)
      if (error) throw error
      onChanged?.()
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy(null)
    }
  }

  function cellContent(logement, monthIndex) {
    const periode = periodFor(monthIndex)
    const c = byCell[`${logement.id}-${periode}`]
    const key = `${logement.id}-${periode}`
    const isBusy = busy === key

    // Payée (validée)
    if (c && c.statut === 'paye') {
      return (
        <button
          onClick={() => canManage && annuler(c)}
          disabled={isBusy}
          title={t('contrib.paid')}
          className="h-8 w-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center mx-auto hover:bg-emerald-600 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
        </button>
      )
    }
    // Déclarée (en attente trésorier)
    if (c && c.statut === 'declaree') {
      if (isTresorier) {
        return (
          <button
            onClick={() => valider(c)}
            disabled={isBusy}
            title={t('contrib.declaredValidate')}
            className="h-8 px-2 rounded-lg bg-amber-400 text-amber-900 text-[10px] font-semibold flex items-center justify-center mx-auto hover:bg-amber-500 disabled:opacity-50"
          >
            {t('contrib.validate')}
          </button>
        )
      }
      // Syndic voit "déclarée, en attente"
      return (
        <button
          onClick={() => annuler(c)}
          disabled={isBusy}
          title={t('contrib.declaredWaiting')}
          className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 border border-amber-300 flex items-center justify-center mx-auto"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" strokeLinecap="round"/></svg>
        </button>
      )
    }
    // Vide -> déclarer
    if (canManage) {
      return (
        <button
          onClick={() => declarer(logement, monthIndex)}
          disabled={isBusy}
          title={t('contrib.declare')}
          className="h-8 w-8 rounded-lg border-2 border-dashed border-black/15 dark:border-white/20 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 flex items-center justify-center mx-auto disabled:opacity-50"
        >
          <span className="opacity-30 text-lg leading-none">+</span>
        </button>
      )
    }
    // Lecture seule : case vide
    return <span className="opacity-20">—</span>
  }

  return (
    <div>
      {/* Barre montant (gestionnaires) */}
      {canManage ? (
        <div className="card mb-4 flex items-center gap-3 flex-wrap">
          <label className="text-sm font-medium">{t('contrib.amount')} :</label>
          <input
            type="number"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            className="input w-32"
            dir="ltr"
          />
          <span className="text-sm opacity-60">MAD / {t('contrib.perMonth')}</span>
          <span className="text-xs opacity-50 ms-auto">{t('contrib.gridHint')}</span>
        </div>
      ) : (
        <p className="text-xs opacity-50 mb-3">{t('contrib.readOnlyHint')}</p>
      )}

      {/* Légende */}
      <div className="flex gap-4 mb-3 text-xs flex-wrap">
        <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded bg-emerald-500"></span>{t('contrib.paid')}</span>
        <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded bg-amber-300"></span>{t('contrib.declared')}</span>
        <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded border-2 border-dashed border-black/20"></span>{t('contrib.none')}</span>
      </div>

      {/* Grille scrollable */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/5 dark:border-white/10">
              <th className="sticky start-0 bg-white dark:bg-brand-700 p-2 text-start font-semibold z-10 min-w-20">{t('contrib.apartment')}</th>
              {mois.map((m, i) => (
                <th key={i} className="p-1.5 font-medium opacity-70 min-w-12">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logements.map((log) => (
              <tr key={log.id} className="border-b border-black/5 dark:border-white/10 last:border-0">
                <td className="sticky start-0 bg-white dark:bg-brand-700 p-2 font-medium whitespace-nowrap z-10">{log.numero}</td>
                {mois.map((_, i) => (
                  <td key={i} className="p-1 text-center">{cellContent(log, i)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {logements.length === 0 && (
        <p className="text-sm opacity-60 py-8 text-center">{t('contrib.noLogements')}</p>
      )}

      {/* Section "Mes reçus" — propriétaires en lecture seule */}
      {!canManage && (
        <div className="mt-6">
          <h3 className="font-semibold mb-1">{t('contrib.myReceipts')}</h3>
          <p className="text-xs opacity-50 mb-3">{t('contrib.myReceiptsHint')}</p>
          {mesRecus.length === 0 ? (
            <p className="text-sm opacity-60 py-6 text-center card">{t('contrib.noReceipts')}</p>
          ) : (
            <div className="space-y-2">
              {mesRecus.map((c) => (
                <div key={c.id} className="card flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{t('contrib.apartment')} {c.logement?.numero} · {c.periode}</p>
                    <p className="text-xs opacity-60">
                      {formatMAD(c.montant)}
                      {c.date_paiement ? ` · ${t('contrib.paidOn')} ${c.date_paiement}` : ''}
                      {c.recu_numero ? ` · ${c.recu_numero}` : ''}
                    </p>
                  </div>
                  {c.recu_url
                    ? <ProofLink path={c.recu_url} label={t('contrib.receipt')} />
                    : <span className="text-xs opacity-40 shrink-0">{t('contrib.receiptPending')}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
