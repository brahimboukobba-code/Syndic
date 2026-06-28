import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { formatDateTime } from '../lib/format'
import { uploadFile } from '../lib/storage'
import { notifyBuilding, notifyUser } from '../lib/notify'
import { Badge, Spinner, Modal } from '../components/ui'
import ProofLink from '../components/ProofLink'

const statusTone = { ouverte: 'amber', en_cours: 'blue', resolue: 'green', rejetee: 'red' }
const prioTone = { basse: 'gray', normale: 'blue', haute: 'amber', urgente: 'red' }

export default function Complaints() {
  const { t, i18n } = useTranslation()
  const { building, isManager, session } = useAuth()
  const uid = session?.user?.id
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ titre: '', description: '', categorie: 'plomberie', priorite: 'normale' })
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!building?.id) { setLoading(false); return }
    setLoading(true)
    // Jointure désambiguïsée : reclamations a 2 FK vers utilisateurs
    // (user_id = auteur, traitee_par = syndic). On précise user_id.
    const { data } = await supabase
      .from('reclamations')
      .select('*, auteur:utilisateurs!reclamations_user_id_fkey(nom_complet)')
      .eq('immeuble_id', building.id)
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }, [building?.id])

  useEffect(() => { load() }, [load])

  async function send(e) {
    e.preventDefault()
    setError('')
    if (!form.titre || !form.description) { setError(t('complaints.required')); return }
    setSaving(true)
    try {
      let photo_url = null
      if (file) photo_url = await uploadFile('reclamations', file)
      const { data, error: e1 } = await supabase.from('reclamations').insert({
        immeuble_id: building.id, user_id: uid,
        categorie: form.categorie, titre: form.titre, description: form.description,
        priorite: form.priorite, photo_url,
      }).select('id').single()
      if (e1) throw e1
      // Notifier tout l'immeuble (transparence totale). On n'exclut pas
      // l'auteur, ce qui permet de tester avec un seul compte.
      const { error: nerr } = await notifyBuilding(building.id, {
        type: 'reclamation_maj', titre: t('complaints.newComplaint') + ' : ' + form.titre,
        message: form.description.slice(0, 120), entiteType: 'reclamation', entiteId: data.id,
      })
      if (!nerr) window.dispatchEvent(new CustomEvent('notif-refresh'))
      setShowForm(false)
      setForm({ titre: '', description: '', categorie: 'plomberie', priorite: 'normale' })
      setFile(null)
      load()
    } catch (err) {
      setError(err.message || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  if (selected) {
    return <ComplaintDetail item={selected} onBack={() => { setSelected(null); load() }} isManager={isManager} uid={uid} />
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">{t('complaints.title')}</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary py-2 px-3 text-sm">+ {t('complaints.newComplaint')}</button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm opacity-60 py-8 text-center">{t('complaints.noComplaints')}</p>
      ) : (
        <div className="space-y-3">
          {items.map((c) => (
            <button key={c.id} onClick={() => setSelected(c)} className="card w-full text-start">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{c.titre}</p>
                  <p className="text-sm opacity-60 line-clamp-1 mt-0.5">{c.description}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge tone="gray">{t(`complaints.categories.${c.categorie}`)}</Badge>
                    <Badge tone={prioTone[c.priorite]}>{t(`complaints.priorities.${c.priorite}`)}</Badge>
                    <span className="text-xs opacity-40">{t('complaints.by')} {c.auteur?.nom_complet || '—'}</span>
                  </div>
                </div>
                <Badge tone={statusTone[c.statut]}>{t(`complaints.status.${c.statut}`)}</Badge>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={t('complaints.newComplaint')}>
        <form onSubmit={send} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">{t('complaints.subject')}</label>
            <input className="input" value={form.titre} onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('complaints.category')}</label>
              <select className="input" value={form.categorie} onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value }))}>
                {['plomberie','electricite','ascenseur','proprete','securite','nuisance','autre'].map((c) => (
                  <option key={c} value={c}>{t(`complaints.categories.${c}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('complaints.priority')}</label>
              <select className="input" value={form.priorite} onChange={(e) => setForm((f) => ({ ...f, priorite: e.target.value }))}>
                {['basse','normale','haute','urgente'].map((p) => (
                  <option key={p} value={p}>{t(`complaints.priorities.${p}`)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('complaints.description')}</label>
            <textarea className="input" rows="3" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('complaints.photo')}</label>
            <input type="file" accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-brand-600 dark:file:bg-brand-600 dark:file:text-sand-100" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? t('complaints.sending') : t('complaints.send')}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">{t('complaints.cancel')}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// --- Détail d'une réclamation ---
function ComplaintDetail({ item, onBack, isManager, uid }) {
  const { t, i18n } = useTranslation()
  const [c, setC] = useState(item)
  const [response, setResponse] = useState(item.reponse_syndic || '')
  const [saving, setSaving] = useState(false)

  async function update(patch, notifyAuthor = false) {
    setSaving(true)
    const { error } = await supabase.from('reclamations').update(patch).eq('id', c.id)
    if (!error) {
      const updated = { ...c, ...patch }
      setC(updated)
      if (notifyAuthor && c.user_id !== uid) {
        await notifyUser(c.user_id, {
          type: 'reclamation_maj', titre: t('complaints.title') + ' : ' + c.titre,
          message: t(`complaints.status.${patch.statut || c.statut}`),
          entiteType: 'reclamation', entiteId: c.id,
        })
      }
    }
    setSaving(false)
  }

  async function saveResponse() {
    await update({ reponse_syndic: response, traitee_par: uid, statut: c.statut === 'ouverte' ? 'en_cours' : c.statut }, true)
  }

  async function setStatus(statut) {
    const patch = { statut }
    if (statut === 'resolue') patch.resolue_le = new Date().toISOString()
    await update(patch, true)
  }

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="btn-ghost text-sm -ms-2">
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current rtl:rotate-180" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        {t('complaints.title')}
      </button>

      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1 className="text-xl font-bold">{c.titre}</h1>
          <Badge tone={statusTone[c.statut]}>{t(`complaints.status.${c.statut}`)}</Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <Badge tone="gray">{t(`complaints.categories.${c.categorie}`)}</Badge>
          <Badge tone={prioTone[c.priorite]}>{t(`complaints.priorities.${c.priorite}`)}</Badge>
          <span className="text-xs opacity-50">{t('complaints.openedOn')} {formatDateTime(c.created_at, i18n.language)}</span>
        </div>
        <div className="card">
          <p className="text-sm opacity-80 whitespace-pre-wrap">{c.description}</p>
          {c.photo_url && <div className="mt-3"><ProofLink path={c.photo_url} /></div>}
        </div>
      </div>

      {/* Réponse du syndic (visible par tous) */}
      {c.reponse_syndic && (
        <div className="card bg-brand-50/50 dark:bg-brand-900/30">
          <p className="text-sm font-medium mb-1">{t('complaints.response')}</p>
          <p className="text-sm opacity-80 whitespace-pre-wrap">{c.reponse_syndic}</p>
        </div>
      )}

      {/* Traitement (syndic seulement) */}
      {isManager && c.statut !== 'resolue' && c.statut !== 'rejetee' && (
        <div className="card space-y-3">
          <p className="font-semibold">{t('complaints.respond')}</p>
          <textarea className="input" rows="3" placeholder={t('complaints.response')} value={response} onChange={(e) => setResponse(e.target.value)} />
          <button onClick={saveResponse} disabled={saving} className="btn-primary w-full">{t('complaints.saveResponse')}</button>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setStatus('en_cours')} disabled={saving} className="btn-ghost flex-1 text-sm border border-black/10 dark:border-white/10">{t('complaints.status.en_cours')}</button>
            <button onClick={() => setStatus('resolue')} disabled={saving} className="btn flex-1 text-sm bg-emerald-500 text-white hover:bg-emerald-600">{t('complaints.status.resolue')}</button>
          </div>
        </div>
      )}

      {c.resolue_le && (
        <p className="text-sm opacity-60 text-center">{t('complaints.resolvedOn')} {formatDateTime(c.resolue_le, i18n.language)}</p>
      )}
    </div>
  )
}
