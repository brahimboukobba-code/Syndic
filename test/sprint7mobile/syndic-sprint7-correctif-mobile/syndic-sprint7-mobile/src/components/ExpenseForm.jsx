import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { uploadFile } from '../lib/storage'

// Formulaire d'ajout d'une dépense. Le justificatif est obligatoire.
export default function ExpenseForm({ exerciceId, immeubleId, onSaved, onCancel }) {
  const { t } = useTranslation()
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({
    intitule: '', categorie_id: '', type_depense: 'charge_fixe',
    montant: '', date_depense: new Date().toISOString().slice(0, 10),
    beneficiaire: '', moyen_paiement: 'virement', description: '',
  })
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('categories_depenses')
      .select('id, nom_fr, nom_ar')
      .eq('immeuble_id', immeubleId)
      .eq('actif', true)
      .order('nom_fr')
      .then(({ data }) => {
        setCategories(data || [])
        if (data?.[0]) setForm((f) => ({ ...f, categorie_id: data[0].id }))
      })
  }, [immeubleId])

  function set(key, value) { setForm((f) => ({ ...f, [key]: value })) }

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!form.intitule || !form.categorie_id || !form.montant || !form.beneficiaire) {
      setError(t('finances.required')); return
    }
    if (!file) { setError(t('finances.proofRequired')); return }

    setSaving(true)
    try {
      const justificatif_url = await uploadFile('factures', file)
      const { data: { user } } = await supabase.auth.getUser()
      const { error: insErr } = await supabase.from('depenses').insert({
        exercice_id: exerciceId,
        categorie_id: form.categorie_id,
        type_depense: form.type_depense,
        intitule: form.intitule,
        description: form.description || null,
        montant: Number(form.montant),
        date_depense: form.date_depense,
        beneficiaire: form.beneficiaire,
        moyen_paiement: form.moyen_paiement,
        justificatif_url,
        created_by: user.id,
      })
      if (insErr) throw insErr
      onSaved?.()
    } catch (err) {
      setError(err.message || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const lang = (localStorage.getItem('lang') || 'fr')

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">{t('finances.label')}</label>
        <input className="input" value={form.intitule} onChange={(e) => set('intitule', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">{t('finances.category')}</label>
          <select className="input" value={form.categorie_id} onChange={(e) => set('categorie_id', e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{lang === 'ar' && c.nom_ar ? c.nom_ar : c.nom_fr}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('finances.type')}</label>
          <select className="input" value={form.type_depense} onChange={(e) => set('type_depense', e.target.value)}>
            <option value="charge_fixe">{t('finances.expenseTypes.charge_fixe')}</option>
            <option value="urgente">{t('finances.expenseTypes.urgente')}</option>
            <option value="projet">{t('finances.expenseTypes.projet')}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">{t('finances.amount')} (MAD)</label>
          <input type="number" step="0.01" min="0" className="input" value={form.montant} onChange={(e) => set('montant', e.target.value)} dir="ltr" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('finances.date')}</label>
          <input type="date" className="input" value={form.date_depense} onChange={(e) => set('date_depense', e.target.value)} dir="ltr" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">{t('finances.beneficiary')}</label>
          <input className="input" value={form.beneficiaire} onChange={(e) => set('beneficiaire', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('finances.paymentMethod')}</label>
          <select className="input" value={form.moyen_paiement} onChange={(e) => set('moyen_paiement', e.target.value)}>
            <option value="virement">{t('finances.methods.virement')}</option>
            <option value="cheque">{t('finances.methods.cheque')}</option>
            <option value="especes">{t('finances.methods.especes')}</option>
            <option value="carte">{t('finances.methods.carte')}</option>
            <option value="autre">{t('finances.methods.autre')}</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{t('finances.proof')}</label>
        <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-brand-600 dark:file:bg-brand-600 dark:file:text-sand-100" />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary flex-1" disabled={saving}>
          {saving ? t('finances.saving') : t('finances.save')}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">{t('finances.cancel')}</button>
      </div>
    </form>
  )
}
