import type { Port, PortStatus } from '../types'
import { portLabels } from './StatusBadge'

interface PortSelectorProps {
  ports: Port[]
  onSelect: (port: Port) => void
  mode?: 'select' | 'manage'
  disabledIds?: string[]
  selectedId?: string | null
}

const tone: Record<PortStatus, string> = {
  available:
    'border-emerald-300 bg-emerald-50 text-emerald-900 hover:border-emerald-500 hover:bg-emerald-100',
  in_use: 'border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-500',
  faulty: 'border-red-300 bg-red-50 text-red-900 hover:border-red-500',
}

export function PortSelector({
  ports,
  onSelect,
  mode = 'select',
  disabledIds = [],
  selectedId = null,
}: PortSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {ports.map((port) => {
        const isDisabled =
          mode === 'select'
            ? port.status !== 'available' || disabledIds.includes(port.id)
            : false
        const isSelected = selectedId === port.id

        return (
          <button
            key={port.id}
            type="button"
            disabled={isDisabled}
            onClick={() => onSelect(port)}
            className={`min-h-[100px] rounded-2xl border-2 p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${tone[port.status]} ${
              isSelected ? 'ring-2 ring-vf-teal ring-offset-2' : ''
            }`}
          >
            <div className="text-2xl font-bold">Cổng {port.port_number}</div>
            <div className="mt-1 text-sm font-medium">{portLabels[port.status]}</div>
            {port.note ? <p className="mt-2 line-clamp-2 text-xs opacity-70">{port.note}</p> : null}
          </button>
        )
      })}
    </div>
  )
}
