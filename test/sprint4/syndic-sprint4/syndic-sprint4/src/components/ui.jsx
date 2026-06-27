// Badge de statut coloré
export function Badge({ tone = 'gray', children }) {
  const tones = {
    gray:    'bg-sand-100 text-brand-700 dark:bg-brand-600 dark:text-sand-100',
    green:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    amber:   'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    red:     'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    blue:    'bg-brand-50 text-brand-600 dark:bg-brand-900 dark:text-sand-100',
  }
  return (
    <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}

// Fenêtre modale simple (sans position:fixed pour rester compatible)
export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white dark:bg-brand-700 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="btn-ghost px-2 py-1" aria-label="Fermer">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18"/>
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// Spinner inline
export function Spinner() {
  return <div className="h-6 w-6 rounded-full border-2 border-brand-200 border-t-brand-500 animate-spin" />
}

// Bandeau d'alerte (orange = warning, rouge = danger)
export function AlertBanner({ tone = 'amber', children }) {
  const tones = {
    amber: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300',
    red:   'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
  }
  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${tones[tone]}`}>
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>
      </svg>
      <div className="text-sm">{children}</div>
    </div>
  )
}
