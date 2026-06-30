import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getSignedUrl } from '../lib/storage'

export default function ProofLink({ path, className = '', label = null }) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  async function open() {
    setLoading(true)
    const url = await getSignedUrl(path)
    setLoading(false)
    if (url) window.open(url, '_blank', 'noopener')
  }

  if (!path) return null
  return (
    <button onClick={open} disabled={loading} className={`text-sm text-brand-500 hover:underline inline-flex items-center gap-1 ${className}`}>
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 3h7v7M21 3l-9 9M5 7v12h12"/>
      </svg>
      {label || t('finances.viewProof')}
    </button>
  )
}
