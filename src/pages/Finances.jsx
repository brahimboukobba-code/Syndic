import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useExercice } from '../lib/useExercice'
import { formatMAD } from '../lib/format'
import { Modal, Spinner } from '../components/ui'
import ExpenseList from '../components/ExpenseList'
import ContributionList from '../components/ContributionList'
import ContributionGrid from '../components/ContributionGrid'
import ExpenseForm from '../components/ExpenseForm'

export default function Finances() {
  const { t } = useTranslation()
  const { building, canEditExpenses } = useAuth()
  const { exercice, loading: exLoading } = useExercice()
  const [tab, setTab] = useState('expenses')
  const [expenses, setExpenses] = useState([])
  const [contributions, setContributions] = useState([])
  const [logements, setLogements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    if (!exercice?.id) { setLoading(false); return }
    setLoading(true)
    const { data: exp } = await supabase
      .from('depenses')
      .select('*, categorie:categories_depenses(nom_fr, nom_ar)')
      .eq('exercice_id', exercice.id)
      .order('date_depense', { ascending: false })
    setExpenses(exp || [])

    const { data: cot } = await supabase
      .from('cotisations')
      .select('*, logement:logements(numero)')
      .eq('exercice_id', exercice.id)
      .order('date_echeance', { ascending: false })
    setContributions(cot || [])

    if (building?.id) {
      const { data: logs } = await supabase
        .from('logements')
        .select('id, numero')
        .eq('immeuble_id', building.id)
        .order('numero')
      setLogements(logs || [])
    }
    setLoading(false)
  }, [exercice?.id, building?.id])

  useEffect(() => { load() }, [load])

  // KPIs
  const totalExpenses = expenses
    .filter((e) => e.statut === 'valide')
    .reduce((s, e) => s + Number(e.montant), 0)
  const totalPaid = contributions
    .filter((c) => c.statut === 'paye')
    .reduce((s, c) => s + Number(c.montant), 0)
  const balance = totalPaid - totalExpenses

  // Retards
  const late = contributions.filter((c) => c.statut === 'retard')
  const lateAmount = late.reduce((s, c) => s + Number(c.montant), 0)

  if (exLoading || loading) {
    return <div className="flex justify-center py-16"><Spinner /></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">{t('finances.title')}</h1>
        {tab === 'expenses' && canEditExpenses && exercice && (
          <button onClick={() => setShowForm(true)} className="btn-primary py-2 px-3 text-sm">
            + {t('finances.addExpense')}
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <div className="card">
          <p className="text-xs opacity-60">{t('finances.balance')}</p>
          <p className={`mt-1 text-xl font-semibold ${balance < 0 ? 'text-red-600' : ''}`}>{formatMAD(balance)}</p>
        </div>
        <div className="card">
          <p className="text-xs opacity-60">{t('finances.totalExpenses')}</p>
          <p className="mt-1 text-xl font-semibold">{formatMAD(totalExpenses)}</p>
        </div>
        <div className="card col-span-2 lg:col-span-1">
          <p className="text-xs opacity-60">{exercice?.libelle || '—'}</p>
          <p className="mt-1 text-xl font-semibold">{formatMAD(totalPaid)}</p>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 mb-4 rounded-xl bg-sand-100 dark:bg-brand-600 p-1">
        <button onClick={() => setTab('expenses')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${tab === 'expenses' ? 'bg-white dark:bg-brand-700 shadow-sm' : 'opacity-60'}`}>
          {t('finances.tabExpenses')}
        </button>
        <button onClick={() => setTab('contributions')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${tab === 'contributions' ? 'bg-white dark:bg-brand-700 shadow-sm' : 'opacity-60'}`}>
          {t('finances.tabContributions')}
        </button>
      </div>

      {/* Bandeau d'alerte retards (onglet cotisations) */}
      {tab === 'contributions' && late.length > 0 && (
        <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 flex items-start gap-3">
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-none stroke-red-600 dark:stroke-red-400" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>
          </svg>
          <div>
            <p className="font-medium text-red-700 dark:text-red-300">
              {late.length === 1 ? t('finances.lateBannerOne') : t('finances.lateBannerMany', { count: late.length })}
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">
              {t('finances.lateBannerAmount', { amount: formatMAD(lateAmount) })}
            </p>
          </div>
        </div>
      )}

      {/* Lecture seule notice pour les non-gestionnaires */}
      {tab === 'expenses' && !canEditExpenses && (
        <p className="mb-3 text-xs opacity-50">{t('finances.readOnly')}</p>
      )}

      {/* Contenu */}
      {tab === 'expenses'
        ? <ExpenseList expenses={expenses} onChanged={load} />
        : (canEditExpenses
            ? <ContributionGrid
                exercice={exercice}
                building={building}
                logements={logements}
                contributions={contributions}
                onChanged={load}
              />
            : <ContributionList contributions={contributions} onChanged={load} />)}

      {/* Modale d'ajout */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={t('finances.addExpense')}>
        {exercice && building && (
          <ExpenseForm
            exerciceId={exercice.id}
            immeubleId={building.id}
            onSaved={() => { setShowForm(false); load() }}
            onCancel={() => setShowForm(false)}
          />
        )}
      </Modal>
    </div>
  )
}
