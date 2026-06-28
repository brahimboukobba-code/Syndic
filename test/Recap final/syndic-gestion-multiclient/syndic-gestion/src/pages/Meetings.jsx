import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { formatDateTime } from '../lib/format'
import { Badge, Spinner, Modal } from '../components/ui'
import MeetingDetail from '../components/MeetingDetail'

const statusTone = { planifiee: 'gray', convocation_envoyee: 'blue', tenue: 'green', annulee: 'red' }

export default function Meetings() {
  const { t, i18n } = useTranslation()
  const { building, isManager } = useAuth()
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    type: 'ag_ordinaire', titre: '', ordre_du_jour: '', date_prevue: '', lieu: '',
  })
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    if (!building?.id) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('reunions')
      .select('id, type, titre, date_prevue, lieu, statut, pv_url')
      .eq('immeuble_id', building.id)
      .order('date_prevue', { ascending: false })
    setMeetings(data || [])
    setLoading(false)
  }, [building?.id])

  useEffect(() => { load() }, [load])

  async function create(e) {
    e.preventDefault()
    setError('')
    if (!form.titre || !form.ordre_du_jour || !form.date_prevue || !form.lieu) {
      setError(t('meetings.required')); return
    }
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: insErr } = await supabase.from('reunions').insert({
      immeuble_id: building.id,
      type: form.type,
      titre: form.titre,
      ordre_du_jour: form.ordre_du_jour,
      date_prevue: new Date(form.date_prevue).toISOString(),
      lieu: form.lieu,
      statut: 'planifiee',
      created_by: user.id,
    })
    setCreating(false)
    if (insErr) setError(insErr.message)
    else {
      setShowForm(false)
      setForm({ type: 'ag_ordinaire', titre: '', ordre_du_jour: '', date_prevue: '', lieu: '' })
      load()
    }
  }

  if (selected) {
    return <MeetingDetail meetingId={selected} onBack={() => { setSelected(null); load() }} onChanged={load} />
  }

  const now = new Date()
  const upcoming = meetings.filter((m) => new Date(m.date_prevue) >= now && m.statut !== 'tenue' && m.statut !== 'annulee')
  const past = meetings.filter((m) => !upcoming.includes(m))

  const Card = (m) => (
    <button key={m.id} onClick={() => setSelected(m.id)} className="card w-full text-start">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{m.titre}</p>
          <p className="text-sm opacity-60 mt-0.5">{formatDateTime(m.date_prevue, i18n.language)} · {m.lieu}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <Badge tone="blue">{t(`meetings.types.${m.type}`)}</Badge>
            {m.pv_url && <span className="text-xs text-emerald-600">{t('meetings.pvAttached')}</span>}
          </div>
        </div>
        <Badge tone={statusTone[m.statut]}>{t(`meetings.status.${m.statut}`)}</Badge>
      </div>
    </button>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">{t('meetings.title')}</h1>
        {isManager && (
          <button onClick={() => setShowForm(true)} className="btn-primary py-2 px-3 text-sm">+ {t('meetings.newMeeting')}</button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : meetings.length === 0 ? (
        <p className="text-sm opacity-60 py-8 text-center">{t('meetings.noMeetings')}</p>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <p className="text-sm font-medium opacity-60 mb-2">{t('meetings.upcoming')}</p>
              <div className="space-y-3">{upcoming.map(Card)}</div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p className="text-sm font-medium opacity-60 mb-2">{t('meetings.past')}</p>
              <div className="space-y-3">{past.map(Card)}</div>
            </div>
          )}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={t('meetings.newMeeting')}>
        <form onSubmit={create} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">{t('meetings.type')}</label>
            <select className="input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              <option value="ag_ordinaire">{t('meetings.types.ag_ordinaire')}</option>
              <option value="ag_extraordinaire">{t('meetings.types.ag_extraordinaire')}</option>
              <option value="reunion_syndic">{t('meetings.types.reunion_syndic')}</option>
              <option value="reunion_travail">{t('meetings.types.reunion_travail')}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('meetings.meetingTitle')}</label>
            <input className="input" value={form.titre} onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('meetings.date')}</label>
              <input type="datetime-local" className="input" value={form.date_prevue} onChange={(e) => setForm((f) => ({ ...f, date_prevue: e.target.value }))} dir="ltr" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('meetings.place')}</label>
              <input className="input" value={form.lieu} onChange={(e) => setForm((f) => ({ ...f, lieu: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('meetings.agenda')}</label>
            <textarea className="input" rows="4" value={form.ordre_du_jour} onChange={(e) => setForm((f) => ({ ...f, ordre_du_jour: e.target.value }))} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={creating}>
              {creating ? t('meetings.creating') : t('meetings.create')}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">{t('meetings.cancel')}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
