import type { PillarStatus, PortStatus } from '../types'

const pillarLabels: Record<PillarStatus, string> = {
  active: 'Hoạt động',
  faulty: 'Lỗi',
  offline: 'Offline',
}

const portLabels: Record<PortStatus, string> = {
  available: 'Trống',
  in_use: 'Đang sạc',
  faulty: 'Lỗi',
}

const pillarStyles: Record<PillarStatus, string> = {
  active: 'bg-vf-teal/15 text-vf-teal-dark',
  faulty: 'bg-red-100 text-red-700',
  offline: 'bg-slate-200 text-slate-600',
}

const portStyles: Record<PortStatus, string> = {
  available: 'bg-emerald-100 text-emerald-800',
  in_use: 'bg-amber-100 text-amber-800',
  faulty: 'bg-red-100 text-red-700',
}

export function PillarStatusBadge({
  status,
  onClick,
  disabled,
}: {
  status: PillarStatus
  onClick?: () => void
  disabled?: boolean
}) {
  const className = `inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${pillarStyles[status]} ${
    onClick ? 'cursor-pointer transition hover:opacity-80 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50' : ''
  }`

  if (onClick) {
    return (
      <button type="button" disabled={disabled} onClick={onClick} className={className} title="Chạm để đổi trạng thái">
        {pillarLabels[status]}
      </button>
    )
  }

  return <span className={className}>{pillarLabels[status]}</span>
}

export function PortStatusBadge({ status }: { status: PortStatus }) {
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${portStyles[status]}`}>
      {portLabels[status]}
    </span>
  )
}

export { pillarLabels, portLabels }
