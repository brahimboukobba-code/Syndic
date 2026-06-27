import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { uploadFile } from '../lib/storage'

// Formulaire de proposition de devis (tout habitant peut proposer).
// L'intitulé est pré-rempli avec le nom du projet et n'est pas modifiable :
// un devis se rapporte toujours au projet en cours.
export default function QuoteForm({ projetId, projetIntitule, onSaved, onCancel }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    prestataire: '', montant: '', delai_estime_jours: '', details: '',
  })
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })) }

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!form.prestataire || !form.montant) {
      setError(t('projects.required')); return
    }
    if (!file) { setError(t('projects.quoteDocRequired')); return }

    setSaving(true)
    try {
      const document_url = await uploadFile('devis', file)
      const { data: { user } } = await supabase.auth.getUser()
      const { error: insErr } = await supabase.from('devis').insert({
        projet_id: projetId,
        intitule: projetIntitule,   // <-- pré-rempli depuis le projet
        prestataire: form.prestataire,
        montant: Number(form.montant),
        delai_estime_jours: form.delai_estime_jours ? Number(form.delai_estime_jours) : null,
        details: form.details || null,
        document_url,
        propose_par: user.id,
      })
      if (insErr) throw insErr
      onSaved?.()
    } catch (err) {
      setError(err.message || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Intitulé pré-rempli et verrouillé */}
      <div>
        <label className="mb-1 block text-sm font-medium">{t('projects.label')}</label>
        <input
          className="input opacity-70 cursor-not-allowed"
          value={projetIntitule}
          readOnly
          disabled
          aria-readonly="true"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t('projects.quoteProvider')}</label>
        <input className="input" value={form.prestataire} onChange={(e) => set('prestataire', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">{t('projects.quoteAmount')}</label>
          <input type="number" step="0.01" min="0" className="input" value={form.montant} onChange={(e) => set('montant', e.target.value)} dir="ltr" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('projects.quoteDelay')}</label>
          <input type="number" min="0" className="input" value={form.delai_estime_jours} onChange={(e) => set('delai_estime_jours', e.target.value)} dir="ltr" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t('projects.quoteDetails')}</label>
        <textarea className="input" rows="2" value={form.details} onChange={(e) => set('details', e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t('projects.quoteDoc')}</label>
        <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-brand-600 dark:file:bg-brand-600 dark:file:text-sand-100" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary flex-1" disabled={saving}>
          {saving ? t('projects.creating') : t('projects.send')}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">{t('projects.cancel')}</button>
      </div>
    </form>
  )
}
