'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Cupon = {
  code: string
  kind: string
  value: number
  minSubtotalCop: number
  active: boolean
  usageLimit: number | null
  usedCount: number
  validUntil: string | null
}

const cop = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

/** Alta y administración de cupones. */
export function CouponManager({ cupones }: { cupones: Cupon[] }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [kind, setKind] = useState<'percent' | 'fixed'>('percent')
  const [value, setValue] = useState('')
  const [minSubtotal, setMinSubtotal] = useState('')
  const [usageLimit, setUsageLimit] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  async function crear(evento: React.FormEvent) {
    evento.preventDefault()
    if (busy) return

    setBusy(true)
    setError(null)
    setOk(null)

    try {
      const respuesta = await fetch('/api/admin/cupones', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, kind, value, minSubtotal, usageLimit, validUntil }),
      })
      const datos = (await respuesta.json()) as { ok?: boolean; error?: string }

      if (!respuesta.ok || !datos.ok) {
        setError(datos.error ?? 'No se pudo crear el cupón')
        return
      }

      setOk(`Cupón ${code.trim().toUpperCase()} creado`)
      setCode('')
      setValue('')
      setMinSubtotal('')
      setUsageLimit('')
      setValidUntil('')
      router.refresh()
    } catch {
      setError('Error de red al crear el cupón')
    } finally {
      setBusy(false)
    }
  }

  async function alternar(cupon: Cupon) {
    await fetch('/api/admin/cupones', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: cupon.code, active: !cupon.active }),
    })
    router.refresh()
  }

  async function borrar(cupon: Cupon) {
    if (!window.confirm(`¿Eliminar el cupón ${cupon.code}?`)) return
    await fetch(`/api/admin/cupones?code=${encodeURIComponent(cupon.code)}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[380px_1fr] lg:gap-14">
      {/* Alta */}
      <form onSubmit={crear} className="grid content-start gap-4 border border-ink/10 p-5">
        <p className="text-[10px] tracking-[0.24em] text-stone uppercase">Nuevo cupón</p>

        <label className="block">
          <span className="text-[9px] tracking-[0.2em] text-stone uppercase">Código</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
            placeholder="CHILLOUT10"
            required
            minLength={3}
            className="mt-1.5 w-full border border-ink/20 px-3 py-2.5 text-sm tracking-[0.08em] uppercase outline-none focus:border-ink"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[9px] tracking-[0.2em] text-stone uppercase">Tipo</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as 'percent' | 'fixed')}
              className="mt-1.5 w-full border border-ink/20 bg-paper px-3 py-2.5 text-sm outline-none focus:border-ink"
            >
              <option value="percent">Porcentaje</option>
              <option value="fixed">Pesos fijos</option>
            </select>
          </label>

          <label className="block">
            <span className="text-[9px] tracking-[0.2em] text-stone uppercase">
              {kind === 'percent' ? '% descuento' : '$ descuento'}
            </span>
            <input
              type="number"
              min={1}
              max={kind === 'percent' ? 100 : undefined}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
              className="mt-1.5 w-full border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[9px] tracking-[0.2em] text-stone uppercase">Compra mínima</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={minSubtotal}
              onChange={(e) => setMinSubtotal(e.target.value)}
              placeholder="0"
              className="mt-1.5 w-full border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
            />
          </label>

          <label className="block">
            <span className="text-[9px] tracking-[0.2em] text-stone uppercase">Límite de usos</span>
            <input
              type="number"
              min={0}
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
              placeholder="Sin límite"
              className="mt-1.5 w-full border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-[9px] tracking-[0.2em] text-stone uppercase">Vence el (opcional)</span>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="mt-1.5 w-full border border-ink/20 px-3 py-2.5 text-sm outline-none focus:border-ink"
          />
        </label>

        {error ? (
          <p className="border border-copper/40 bg-copper/5 px-3 py-2 text-[11px] text-copper-deep" role="alert">
            {error}
          </p>
        ) : null}
        {ok ? (
          <p className="inline-flex items-center gap-2 text-[11px] text-ink">
            <CheckCircle2 className="size-3.5 text-copper" strokeWidth={2} />
            {ok}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy || code.trim().length < 3 || !value}
          className="mt-1 inline-flex items-center justify-center gap-2 bg-ink py-3 text-[10px] tracking-[0.22em] text-paper uppercase transition-colors hover:bg-copper disabled:cursor-not-allowed disabled:opacity-30"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" strokeWidth={2} />
          ) : (
            <Plus className="size-4" strokeWidth={2} />
          )}
          Crear cupón
        </button>
      </form>

      {/* Lista */}
      <div>
        <p className="text-[10px] tracking-[0.24em] text-stone uppercase">
          {cupones.length} {cupones.length === 1 ? 'cupón' : 'cupones'}
        </p>

        {cupones.length > 0 ? (
          <ul className="mt-4 divide-y divide-ink/10 border-y border-ink/10">
            {cupones.map((cupon) => {
              const agotado = cupon.usageLimit !== null && cupon.usedCount >= cupon.usageLimit
              return (
                <li key={cupon.code} className="flex flex-wrap items-center gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[13px] tracking-[0.12em] text-ink">{cupon.code}</p>
                    <p className="mt-0.5 text-[11px] text-stone">
                      {cupon.kind === 'percent'
                        ? `${cupon.value}% de descuento`
                        : `$ ${cop.format(cupon.value)} de descuento`}
                      {cupon.minSubtotalCop > 0
                        ? ` · desde $ ${cop.format(cupon.minSubtotalCop)}`
                        : ''}
                      {cupon.usageLimit !== null
                        ? ` · ${cupon.usedCount}/${cupon.usageLimit} usos`
                        : ` · ${cupon.usedCount} usos`}
                      {cupon.validUntil
                        ? ` · vence ${new Date(cupon.validUntil).toLocaleDateString('es-CO')}`
                        : ''}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => alternar(cupon)}
                    className={cn(
                      'px-2.5 py-1 text-[9px] tracking-[0.16em] uppercase transition-colors',
                      cupon.active && !agotado
                        ? 'bg-ink text-paper hover:bg-copper'
                        : 'border border-ink/25 text-stone hover:border-ink hover:text-ink',
                    )}
                  >
                    {agotado ? 'Agotado' : cupon.active ? 'Activo' : 'Inactivo'}
                  </button>

                  <button
                    type="button"
                    onClick={() => borrar(cupon)}
                    aria-label={`Eliminar ${cupon.code}`}
                    className="text-stone hover:text-copper"
                  >
                    <Trash2 className="size-4" strokeWidth={1.6} />
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-4 border border-dashed border-ink/20 px-5 py-14 text-center text-[12px] text-stone-dark">
            Todavía no hay cupones. Crea el primero a la izquierda.
          </p>
        )}
      </div>
    </div>
  )
}
