import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePillars, useUsageLogs } from '../hooks/usePillars'

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function durationLabel(start: string, end: string | null) {
  const endMs = end ? new Date(end).getTime() : Date.now()
  const mins = Math.max(1, Math.round((endMs - new Date(start).getTime()) / 60000))
  if (mins < 60) return `${mins} phút`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}g ${m}p`
}

export function History() {
  const { logs, loading, error, refresh } = useUsageLogs()
  const { pillars, endUsage } = usePillars()
  const [filterPillar, setFilterPillar] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!filterPillar) return logs
    return logs.filter((l) => l.pillar_id === filterPillar)
  }, [logs, filterPillar])

  const handleEnd = async (logId: string, portId: string) => {
    try {
      setBusyId(logId)
      setMsg(null)
      await endUsage(logId, portId)
      await refresh()
      setMsg('Đã kết thúc phiên sạc.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Không kết thúc được phiên')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-vf-navy">Lịch sử sạc</h2>
          <p className="mt-1 text-sm text-vf-navy/60">Phiên gần đây, kết thúc phiên đang mở tại đây.</p>
        </div>
        <Link
          to="/scan"
          className="inline-flex items-center justify-center rounded-xl bg-vf-teal px-4 py-2.5 text-sm font-semibold text-white"
        >
          Quét để sạc
        </Link>
      </div>

      <label className="block max-w-xs text-sm font-medium text-vf-navy">
        Lọc theo trụ
        <select
          value={filterPillar}
          onChange={(e) => setFilterPillar(e.target.value)}
          className="mt-1 w-full rounded-xl border border-vf-navy/15 bg-white px-3 py-2.5 outline-none focus:border-vf-teal"
        >
          <option value="">Tất cả</option>
          {pillars.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {msg ? <p className="text-sm text-vf-navy/70">{msg}</p> : null}

      {loading ? (
        <p className="text-sm text-vf-navy/50">Đang tải…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-vf-navy/20 bg-white/60 px-6 py-10 text-center text-sm text-vf-navy/60">
          Chưa có lịch sử sạc.
        </div>
      ) : (
        <ul className="divide-y divide-vf-navy/8 overflow-hidden rounded-2xl bg-white shadow-sm">
          {filtered.map((log) => {
            const open = !log.ended_at
            return (
              <li key={log.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-vf-navy">
                    {log.pillars?.name ?? 'Trụ'} · Cổng {log.ports?.port_number ?? '?'}
                  </p>
                  <p className="text-xs text-vf-navy/55">
                    {formatTime(log.started_at)}
                    {log.ended_at ? ` → ${formatTime(log.ended_at)}` : ' → đang sạc'}
                    {' · '}
                    {durationLabel(log.started_at, log.ended_at)}
                  </p>
                </div>
                {open ? (
                  <button
                    type="button"
                    disabled={busyId === log.id}
                    onClick={() => void handleEnd(log.id, log.port_id)}
                    className="rounded-xl bg-vf-navy px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {busyId === log.id ? '…' : 'Kết thúc'}
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-emerald-700">Hoàn tất</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
