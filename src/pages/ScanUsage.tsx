import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PortSelector } from '../components/PortSelector'
import { QrCapture } from '../components/QrCapture'
import { usePillars } from '../hooks/usePillars'
import { isSupabaseConfigured } from '../lib/supabase'
import type { PillarWithPorts, Port } from '../types'

export function ScanUsage() {
  const { pillars, getPillarByQr, addPillar, startUsage } = usePillars()
  const [pillar, setPillar] = useState<PillarWithPorts | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [justCreated, setJustCreated] = useState(false)

  const defaultName = () => {
    const used = new Set(pillars.map((p) => p.name))
    for (let i = 1; i <= 99; i++) {
      const name = `VF-${String(i).padStart(2, '0')}`
      if (!used.has(name)) return name
    }
    return `Trụ ${pillars.length + 1}`
  }

  const resolveQr = async (qr: string) => {
    if (!isSupabaseConfigured) {
      setError('Chưa cấu hình Supabase.')
      return
    }
    try {
      setBusy(true)
      setError(null)
      setDone(null)
      setJustCreated(false)

      let found = await getPillarByQr(qr)
      if (!found) {
        const name = defaultName()
        await addPillar(qr, name)
        found = await getPillarByQr(qr)
        if (!found) throw new Error('Đã thêm trụ nhưng không tải lại được.')
        setJustCreated(true)
      }

      if (found.status === 'offline' || found.status === 'faulty') {
        setError(`Trụ đang ${found.status}. Không thể bắt đầu sạc.`)
        setPillar(found)
        return
      }

      setPillar(found)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tra cứu / thêm trụ')
    } finally {
      setBusy(false)
    }
  }

  const handleSelectPort = async (port: Port) => {
    if (!pillar) return
    try {
      setBusy(true)
      setError(null)
      await startUsage(pillar.id, port.id)
      setDone(`Đã bắt đầu sạc: ${pillar.name} — Cổng ${port.port_number}`)
      setPillar({
        ...pillar,
        ports: pillar.ports.map((p) =>
          p.id === port.id ? { ...p, status: 'in_use' as const } : p,
        ),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không ghi nhận được phiên sạc')
    } finally {
      setBusy(false)
    }
  }

  const reset = () => {
    setPillar(null)
    setError(null)
    setDone(null)
    setJustCreated(false)
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <Link to="/" className="text-sm font-medium text-vf-teal-dark hover:underline">
          ← Về trạm
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-vf-navy">Quét để sạc</h2>
        <p className="mt-1 text-sm text-vf-navy/60">
          Quét QR → chọn cổng. Nếu trụ chưa có trong hệ thống sẽ được thêm tự động.
        </p>
      </div>

      {!pillar ? (
        <div className={busy ? 'pointer-events-none opacity-60' : ''}>
          <QrCapture onDetected={(v) => void resolveQr(v)} paused={busy} />
          {busy ? <p className="mt-3 text-sm text-vf-navy/50">Đang xử lý…</p> : null}
        </div>
      ) : (
        <div className="space-y-4">
          {justCreated ? (
            <div className="rounded-xl border border-vf-teal/30 bg-vf-mist px-4 py-3 text-sm text-vf-navy">
              Đã thêm trụ mới <strong>{pillar.name}</strong>. Chọn cổng để bắt đầu sạc.
            </div>
          ) : null}
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-vf-navy/45">Trụ</p>
            <h3 className="text-xl font-bold text-vf-navy">{pillar.name}</h3>
            <p className="break-all font-mono text-xs text-vf-navy/50">{pillar.qr_code}</p>
          </div>
          <PortSelector ports={pillar.ports} mode="select" onSelect={(p) => void handleSelectPort(p)} />
          <button
            type="button"
            onClick={reset}
            className="rounded-xl border border-vf-navy/15 px-4 py-2.5 text-sm font-semibold"
          >
            Quét trụ khác
          </button>
        </div>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {done ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {done}{' '}
          <Link to="/history" className="font-semibold underline">
            Xem lịch sử
          </Link>
        </div>
      ) : null}
    </div>
  )
}
