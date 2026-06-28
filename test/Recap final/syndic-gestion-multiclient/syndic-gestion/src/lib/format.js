// Formatage monétaire en dirhams marocains
export function formatMAD(amount) {
  const n = Number(amount) || 0
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 2,
  }).format(n)
}

// Date courte localisée
export function formatDate(value, lang = 'fr') {
  if (!value) return '—'
  const d = new Date(value)
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-MA' : 'fr-MA', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(d)
}

// Date + heure
export function formatDateTime(value, lang = 'fr') {
  if (!value) return '—'
  const d = new Date(value)
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-MA' : 'fr-MA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(d)
}

// Nombre de jours entre aujourd'hui et une date (positif = futur, négatif = passé)
export function daysUntil(value) {
  if (!value) return null
  const target = new Date(value)
  const now = new Date()
  target.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return Math.round((target - now) / (1000 * 60 * 60 * 24))
}

// Mois courant au format AAAA-MM (pour filtrer les dépenses du mois)
export function currentMonthPrefix() {
  return new Date().toISOString().slice(0, 7)
}
