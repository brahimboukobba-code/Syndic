import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useDashboard } from '../lib/useDashboard'
import { formatMAD, formatDate, formatDateTime, daysUntil } from '../lib/format'
import { Spinner, Badge, AlertBanner } from '../components/ui'
import DonutChart from '../components/DonutChart'
import ProofLink from '../components/ProofLink'

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const { profile, roleNames, building } = useAuth()
  const dash = useDashboard()
  const lang = i18n.language
  const primaryRole = roleNames[0]

  if (dash.loading) {
    return <div className="flex justify-center py-16"><Spinner /></div>
  }

  // --- Calculs mandat ---
  const mandateDays = dash.mandate ? daysUntil(dash.mandate.date_fin_mandat) : null
  const mandateExpired = mandateDays !== null && mandateDays < 0
  const mandateSoon = mandateDays !== null && mandateDays >= 0 && mandateDays <= 60

  // --- Calculs AG ---
  // Prochaine AG attendue : fin d'exercice + 30 jours (Art. 16ter)
  let agDays = null
  if (dash.exercice?.date_fin) {
    const due = new Date(dash.exercice.date_fin)
    due.setDate(due.getDate() + 30)
    agDays = daysUntil(due)
  }
  const agOverdue = agDays !== null && agDays < 0
  const agSoon = agDays !== null && agDays >= 0 && agDays <= 30

  // --- Finances ---
  const validExpenses = dash.expenses.filter((e) => e.statut === 'valide')
  const totalExpenses = validExpenses.reduce((s, e) => s + Number(e.montant), 0)
  const totalPaid = dash.contributions.filter((c) => c.statut === 'paye').reduce((s, c) => s + Number(c.montant), 0)
  const balance = totalPaid - totalExpenses
  const paidCount = dash.contributions.filter((c) => c.statut === 'paye').length
  const totalCount = dash.contributions.length
  const unpaidCount = dash.contributions.filter((c) => c.statut !== 'paye').length
  const monthExpenses = validExpenses
    .filter((e) => (e.date_depense || '').startsWith(dash.monthPrefix))
    .reduce((s, e) => s + Number(e.montant), 0)

  // --- Donut par catégorie ---
  const byCat = {}
  for (const e of validExpenses) {
    const key = e.categorie_id || 'autre'
    if (!byCat[key]) {
      byCat[key] = {
        label: lang === 'ar' && e.categorie?.nom_ar ? e.categorie.nom_ar : (e.categorie?.nom_fr || '—'),
        value: 0,
        color: e.categorie?.couleur || '#94a3b8',
      }
    }
    byCat[key].value += Number(e.montant)
  }
  const donutData = Object.values(byCat).sort((a, b) => b.value - a.value)

  const subjectOf = (log) => {
    const n = log.new_values || log.old_values || {}
    return n.intitule || n.titre || n.periode || n.nom_complet || ''
  }

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold">
          {t('dashboard.welcome')}, {profile?.nom_complet?.split(' ')[0] || ''}
        </h1>
        {building && <p className="text-sm opacity-60">{building.nom} — {building.adresse}</p>}
      </div>

      {/* Alertes légales prioritaires */}
      {mandateExpired && <AlertBanner tone="red">{t('dashboard.mandateExpired')}</AlertBanner>}
      {!mandateExpired && mandateSoon && <AlertBanner tone="amber">{t('dashboard.mandateExpiringSoon', { days: mandateDays })}</AlertBanner>}
      {agOverdue && <AlertBanner tone="red">{t('dashboard.agOverdue', { days: Math.abs(agDays) })}</AlertBanner>}
      {!agOverdue && agSoon && <AlertBanner tone="amber">{t('dashboard.agSoon', { days: agDays })}</AlertBanner>}

      {/* Compteurs légaux : mandat + AG */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Mandat */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-brand-500" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M6 18V9m4 9V9m4 9V9m4 9V9M3 9l9-6 9 6"/></svg>
              {t('dashboard.mandate')}
            </p>
            {dash.mandate && !mandateExpired && (
              <Badge tone={mandateSoon ? 'amber' : 'green'}>{mandateDays} {t('dashboard.days')}</Badge>
            )}
            {mandateExpired && <Badge tone="red">{t('dashboard.mandateExpired').split('.')[0]}</Badge>}
          </div>
          {dash.mandate ? (
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-3">
                <span className="opacity-60 shrink-0">{t('dashboard.lastVote')}</span>
                <span className="font-medium">{formatDate(dash.mandate.date_election, lang)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="opacity-60 shrink-0">{t('dashboard.remaining')}</span>
                <span className="font-medium">
                  {mandateExpired ? '—' : t('dashboard.mandateEndsIn', { days: mandateDays })}
                </span>
              </div>
              {dash.mandate.syndic?.nom_complet && (
                <div className="flex justify-between gap-3">
                  <span className="opacity-60 shrink-0">{t('roles.syndic')}</span>
                  <span className="font-medium">{dash.mandate.syndic.nom_complet}</span>
                </div>
              )}
              {/* Barre de progression du mandat (2 ans = 730 j) */}
              {!mandateExpired && (
                <div className="pt-2">
                  <div className="h-2 rounded-full bg-sand-100 dark:bg-brand-600 overflow-hidden">
                    <div className="h-full bg-brand-500" style={{ width: `${Math.max(0, Math.min(100, 100 - (mandateDays / 730) * 100))}%` }} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm opacity-60">{t('dashboard.noMandate')}</p>
          )}
        </div>

        {/* AG */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-brand-500" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4v3m10-3v3M4 9h16M5 7h14v12H5z"/></svg>
              {t('dashboard.nextAG')}
            </p>
            {agDays !== null && !agOverdue && (
              <Badge tone={agSoon ? 'amber' : 'green'}>{agDays} {t('dashboard.days')}</Badge>
            )}
          </div>
          <div className="space-y-1.5 text-sm">
            {dash.lastAG ? (
              <>
                <div className="flex justify-between gap-3">
                  <span className="opacity-60 shrink-0">{t('dashboard.lastAG')}</span>
                  <span className="font-medium text-end">{formatDate(dash.lastAG.date_prevue, lang)}</span>
                </div>
                {agDays !== null && (
                  <div className="flex justify-between">
                    <span className="opacity-60">{t('dashboard.nextAG')}</span>
                    <span className="font-medium text-end">
                      {agOverdue ? '—' : t('dashboard.agDueIn', { days: agDays })}
                    </span>
                  </div>
                )}
                {dash.lastAG.pv_url && (
                  <div className="pt-2">
                    <ProofLink path={dash.lastAG.pv_url} />
                  </div>
                )}
              </>
            ) : (
              <p className="opacity-60">{t('dashboard.noAG')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Synthèse financière */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card">
          <p className="text-xs opacity-60">{t('dashboard.balance')}</p>
          <p className={`mt-1 text-lg font-semibold ${balance < 0 ? 'text-red-600' : ''}`}>{formatMAD(balance)}</p>
        </div>
        <div className="card">
          <p className="text-xs opacity-60">{t('dashboard.paidRatio')}</p>
          <p className="mt-1 text-lg font-semibold text-emerald-600">{paidCount}<span className="opacity-40 text-sm">/{totalCount}</span></p>
        </div>
        <div className="card">
          <p className="text-xs opacity-60">{t('dashboard.unpaid')}</p>
          <p className={`mt-1 text-lg font-semibold ${unpaidCount > 0 ? 'text-red-600' : ''}`}>{unpaidCount}</p>
        </div>
        <div className="card">
          <p className="text-xs opacity-60">{t('dashboard.monthExpenses')}</p>
          <p className="mt-1 text-lg font-semibold">{formatMAD(monthExpenses)}</p>
        </div>
      </div>

      {/* Graphique + activité */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <p className="font-semibold mb-4">{t('dashboard.byCategory')}</p>
          {donutData.length > 0 ? (
            <DonutChart data={donutData} />
          ) : (
            <p className="text-sm opacity-60 py-8 text-center">{t('dashboard.noCategoryData')}</p>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold">{t('dashboard.recentActivity')}</p>
            <Link to="/history" className="text-sm text-brand-500 hover:underline">{t('dashboard.seeAll')}</Link>
          </div>
          {dash.recentLogs.length > 0 ? (
            <div className="space-y-2.5">
              {dash.recentLogs.map((log) => {
                const subject = subjectOf(log)
                return (
                  <div key={log.id} className="flex items-center gap-2 text-sm">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${log.action === 'insert' ? 'bg-emerald-500' : log.action === 'update' ? 'bg-amber-500' : 'bg-red-500'}`} />
                    <span className="flex-1 truncate">
                      {t(`history.tables.${log.table_name}`, log.table_name)}
                      {subject && <span className={`opacity-70 ${log.action === 'delete' ? 'line-through' : ''}`}> — {subject}</span>}
                    </span>
                    <span className="opacity-50 text-xs whitespace-nowrap">{formatDateTime(log.created_at, lang)}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm opacity-60 py-4 text-center">{t('history.empty')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
