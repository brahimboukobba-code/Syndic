import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { formatDate } from '../lib/format'
import { Badge, Spinner, Modal } from '../components/ui'
import ProjectDetail from '../components/ProjectDetail'

const phaseTone = {
  brouillon: 'gray', vote_principe: 'blue', collecte_devis: 'amber',
  vote_devis: 'blue', accepte: 'green', refuse: 'red', realise: 'green', annule: 'gray',
}

export default function Projects() {
  const { t, i18n } = useTranslation()
  const { building, isManager } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ intitule: '', details_travaux: '' })
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    if (!building?.id) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('projets')
      .select('*')
      .eq('immeuble_id', building.id)
      .eq('statut', 'actif')
      .order('created_at', { ascending: false })
    setProjects(data || [])
    setLoading(false)
  }, [building?.id])

  useEffect(() => { load() }, [load])

  async function create(e) {
    e.preventDefault()
    setError('')
    if (!form.intitule || !form.details_travaux) { setError(t('projects.required')); return }
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: insErr } = await supabase.from('projets').insert({
      immeuble_id: building.id,
      intitule: form.intitule,
      details_travaux: form.details_travaux,
      phase: 'brouillon',
      created_by: user.id,
    })
    setCreating(false)
    if (insErr) setError(insErr.message)
    else { setShowForm(false); setForm({ intitule: '', details_travaux: '' }); load() }
  }

  if (selected) {
    return <ProjectDetail projetId={selected} onBack={() => { setSelected(null); load() }} onChanged={load} />
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">{t('projects.title')}</h1>
        {isManager && (
          <button onClick={() => setShowForm(true)} className="btn-primary py-2 px-3 text-sm">+ {t('projects.newProject')}</button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : projects.length === 0 ? (
        <p className="text-sm opacity-60 py-8 text-center">{t('projects.noProjects')}</p>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <button key={p.id} onClick={() => setSelected(p.id)} className="card w-full text-start hover:ring-brand-300 transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{p.intitule}</p>
                  <p className="text-sm opacity-60 line-clamp-1 mt-0.5">{p.details_travaux}</p>
                  <p className="text-xs opacity-40 mt-1">{formatDate(p.created_at, i18n.language)}</p>
                </div>
                <Badge tone={phaseTone[p.phase]}>{t(`projects.phases.${p.phase}`)}</Badge>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={t('projects.newProject')}>
        <form onSubmit={create} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">{t('projects.label')}</label>
            <input className="input" value={form.intitule} onChange={(e) => setForm((f) => ({ ...f, intitule: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('projects.details')}</label>
            <textarea className="input" rows="4" value={form.details_travaux} onChange={(e) => setForm((f) => ({ ...f, details_travaux: e.target.value }))} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={creating}>
              {creating ? t('projects.creating') : t('projects.create')}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">{t('projects.cancel')}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
