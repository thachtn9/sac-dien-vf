export type PillarStatus = 'active' | 'faulty' | 'offline'
export type PortStatus = 'available' | 'in_use' | 'faulty'

export interface Pillar {
  id: string
  qr_code: string
  name: string
  status: PillarStatus
  note: string
  created_at: string
}

export interface Port {
  id: string
  pillar_id: string
  port_number: number
  status: PortStatus
  note: string
}

export interface UsageLog {
  id: string
  pillar_id: string
  port_id: string
  started_at: string
  ended_at: string | null
  note: string
}

export interface PillarWithPorts extends Pillar {
  ports: Port[]
}

export interface UsageLogWithRelations extends UsageLog {
  pillars?: Pick<Pillar, 'id' | 'name' | 'qr_code'> | null
  ports?: Pick<Port, 'id' | 'port_number'> | null
}
