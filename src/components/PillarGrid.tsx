import { Link } from 'react-router-dom'
import type { PillarStatus, PillarWithPorts } from '../types'
import { pillarLabels } from './StatusBadge'

interface PillarGridProps {
  pillars: PillarWithPorts[]
}

function countByStatus(pillar: PillarWithPorts) {
  return {
    available: pillar.ports.filter((p) => p.status === 'available').length,
    in_use: pillar.ports.filter((p) => p.status === 'in_use').length,
    faulty: pillar.ports.filter((p) => p.status === 'faulty').length,
  }
}

const borderByStatus = {
  active: 'border-vf-teal/40 hover:border-vf-teal',
  faulty: 'border-red-300 hover:border-red-400',
  offline: 'border-slate-300 hover:border-slate-400',
} as const

const dotByStatus: Record<PillarStatus, string> = {
  active: 'bg-vf-teal',
  faulty: 'bg-red-500',
  offline: 'bg-slate-400',
}

export function PillarGrid({ pillars }: PillarGridProps) {
  if (pillars.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-vf-navy/20 bg-white/60 px-6 py-12 text-center">
        <p className="text-lg font-semibold text-vf-navy">Chưa có trụ sạc nào</p>
        <p className="mt-2 text-sm text-vf-navy/60">Quét mã QR trên trụ để thêm vào hệ thống.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {pillars.map((pillar) => {
        const counts = countByStatus(pillar)
        return (
          <Link
            key={pillar.id}
            to={`/pillar/${pillar.id}`}
            className={`group relative block rounded-2xl border-2 bg-white/80 p-4 pt-5 shadow-sm transition ${borderByStatus[pillar.status]}`}
          >
            <span
              className={`absolute right-3 top-3 h-3 w-3 rounded-full ring-2 ring-white ${dotByStatus[pillar.status]}`}
              title={pillarLabels[pillar.status]}
              aria-label={pillarLabels[pillar.status]}
            />
            <h3 className="pr-4 text-base font-bold leading-tight text-vf-navy group-hover:text-vf-teal-dark">
              {pillar.name}
            </h3>
            <p className="mt-2 truncate font-mono text-xs text-vf-navy/50">{pillar.qr_code}</p>
            <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] font-medium">
              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">
                {counts.available} trống
              </span>
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">
                {counts.in_use} sạc
              </span>
              <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-700">
                {counts.faulty} lỗi
              </span>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1">
              {pillar.ports.map((port) => (
                <div
                  key={port.id}
                  className={`h-2 rounded-full ${
                    port.status === 'available'
                      ? 'bg-emerald-400'
                      : port.status === 'in_use'
                        ? 'bg-amber-400'
                        : 'bg-red-400'
                  }`}
                  title={`Cổng ${port.port_number}: ${port.status}`}
                />
              ))}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
