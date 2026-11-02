'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = (await response.json()) as { error?: string }

      if (!response.ok) {
        setError(data.error ?? 'No se pudo entrar')
        setBusy(false)
        return
      }

      router.replace('/admin')
      router.refresh()
    } catch {
      setError('Error de red')
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-ink px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <div className="text-center">
          <span className="brand-frame text-sm tracking-[0.3em] text-paper">Chillout</span>
          <p className="mt-3 text-[9px] tracking-[0.3em] text-paper/40 uppercase">
            Panel del gerente
          </p>
        </div>

        <label className="mt-10 block">
          <span className="text-[10px] tracking-[0.24em] text-paper/50 uppercase">
            Contraseña
          </span>
          <div className="mt-2 flex items-center gap-2 border border-paper/20 px-3 focus-within:border-copper">
            <Lock className="size-4 text-paper/30" strokeWidth={1.6} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full bg-transparent py-3 text-sm text-paper outline-none placeholder:text-paper/25"
              placeholder="••••••••"
            />
          </div>
        </label>

        {error ? (
          <p className="mt-3 text-[11px] text-copper-bright" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy || password.length === 0}
          className="mt-6 w-full bg-paper py-3.5 text-[11px] tracking-[0.24em] text-ink uppercase transition-colors hover:bg-copper hover:text-paper disabled:opacity-40"
        >
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
