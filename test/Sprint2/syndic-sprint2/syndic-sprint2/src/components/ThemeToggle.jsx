import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(
    () => localStorage.getItem('theme') === 'dark'
  )
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])
  return (
    <button
      onClick={() => setDark((d) => !d)}
      className="btn-ghost px-3 py-1.5 text-sm"
      aria-label="Basculer le thème"
    >
      {dark ? '☀' : '☾'}
    </button>
  )
}
