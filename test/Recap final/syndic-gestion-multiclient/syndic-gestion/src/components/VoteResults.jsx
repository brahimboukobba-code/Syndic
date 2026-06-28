import { useTranslation } from 'react-i18next'

// Barre de résultats du vote de principe
export default function VoteResults({ oui, non, abstention, pctOui, seuil }) {
  const { t } = useTranslation()
  const total = oui + non + abstention
  const pct = (n) => total === 0 ? 0 : Math.round((n / total) * 100)
  const seuilPct = Math.round(seuil * 100)
  const pctOuiRounded = Math.round(pctOui * 100)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="opacity-60">{t('projects.results')}</span>
        <span className="opacity-60">{t('projects.participation', { count: total })}</span>
      </div>

      {/* Barre empilée */}
      <div className="h-3 rounded-full overflow-hidden bg-sand-100 dark:bg-brand-600 flex">
        <div className="bg-emerald-500 h-full" style={{ width: `${pct(oui)}%` }} />
        <div className="bg-red-400 h-full" style={{ width: `${pct(non)}%` }} />
        <div className="bg-slate-300 h-full" style={{ width: `${pct(abstention)}%` }} />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />{t('projects.yes')} : {oui}</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-red-400" />{t('projects.no')} : {non}</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-slate-300" />{t('projects.abstain')} : {abstention}</span>
      </div>

      {/* Jauge du seuil */}
      <div className="text-sm pt-1">
        <div className="flex justify-between mb-1">
          <span className="opacity-60">{t('projects.threshold')} : {seuilPct}%</span>
          <span className={`font-medium ${pctOui >= seuil ? 'text-emerald-600' : ''}`}>{pctOuiRounded}%</span>
        </div>
        <div className="relative h-2 rounded-full bg-sand-100 dark:bg-brand-600">
          <div className={`h-full rounded-full ${pctOui >= seuil ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${pctOuiRounded}%` }} />
          <div className="absolute top-[-2px] bottom-[-2px] w-0.5 bg-brand-900 dark:bg-sand-50" style={{ left: `${seuilPct}%` }} />
        </div>
      </div>
    </div>
  )
}
