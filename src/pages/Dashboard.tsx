import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PillarGrid } from '../components/PillarGrid'
import { usePillars } from '../hooks/usePillars'
import { isSupabaseConfigured } from '../lib/supabase'

export function Dashboard() {
  const { pillars, loading, error, seedDemoPillars, refresh } = usePillars()
  const [seeding, setSeeding] = useState(false)
  const [seedMsg, setSeedMsg] = useState<string | null>(null)

  const stats = useMemo(() => {
    const ports = pillars.flatMap((p) => p.ports)
    return {
      pillars: pillars.length,
      available: ports.filter((p) => p.status === 'available').length,
      in_use: ports.filter((p) => p.status === 'in_use').length,
      faulty: ports.filter((p) => p.status === 'faulty').length,
    }
  }, [pillars])

  const handleSeed = async () => {
    if (!isSupabaseConfigured) {
      setSeedMsg('Cần cấu hình Supabase trước.')
      return
    }
    try {
      setSeeding(true)
      setSeedMsg(null)
      await seedDemoPillars(6)
      setSeedMsg('Đã tạo 6 trụ demo (QR: VF-DEMO-001 …).')
    } catch (e) {
      setSeedMsg(e instanceof Error ? e.message : 'Seed thất bại')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-vf-navy">Sơ đồ trạm</h2>
          <p className="mt-1 text-sm text-vf-navy/60">
            {stats.pillars} trụ · {stats.available} cổng trống · {stats.in_use} đang sạc ·{' '}
            {stats.faulty} lỗi
          </p>
        </div>
        <Link
          to="/scan"
          className="inline-flex items-center justify-center rounded-xl bg-vf-teal px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-vf-teal-dark"
        >
          Quét để sạc
        </Link>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}{' '}
          <button type="button" className="underline" onClick={() => void refresh()}>
            Thử lại
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-vf-navy/50">Đang tải…</p>
      ) : (
        <PillarGrid pillars={pillars} />
      )}

      {!loading && pillars.length === 0 && isSupabaseConfigured ? (
        <div className="flex flex-col items-start gap-2 rounded-2xl bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-vf-navy/70">
            Muốn xem UI trước? Tạo vài trụ demo (không thay thế quét QR thật).
          </p>
          <button
            type="button"
            disabled={seeding}
            onClick={() => void handleSeed()}
            className="rounded-xl bg-vf-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {seeding ? 'Đang tạo…' : 'Tạo 6 trụ demo'}
          </button>
        </div>
      ) : null}

      {seedMsg ? <p className="text-sm text-vf-navy/70">{seedMsg}</p> : null}
    </div>
  )
}
