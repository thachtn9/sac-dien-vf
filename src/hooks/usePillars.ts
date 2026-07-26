import { useCallback, useEffect, useState } from 'react'
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase'
import type {
  Pillar,
  PillarStatus,
  PillarWithPorts,
  Port,
  PortStatus,
  UsageLogWithRelations,
} from '../types'

function sortPorts(ports: Port[]): Port[] {
  return [...ports].sort((a, b) => a.port_number - b.port_number)
}

export function usePillars() {
  const [pillars, setPillars] = useState<PillarWithPorts[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPillars = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setPillars([])
      setLoading(false)
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const sb = requireSupabase()
      const { data, error: err } = await sb
        .from('pillars')
        .select('*, ports(*)')
        .order('created_at', { ascending: true })

      if (err) throw err

      const rows = (data ?? []).map((row) => ({
        ...row,
        ports: sortPorts((row.ports ?? []) as Port[]),
      })) as PillarWithPorts[]

      setPillars(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách trụ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchPillars()
  }, [fetchPillars])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    const sb = requireSupabase()
    const channel = sb
      .channel('pillars-ports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pillars' }, () => {
        void fetchPillars()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ports' }, () => {
        void fetchPillars()
      })
      .subscribe()

    return () => {
      void sb.removeChannel(channel)
    }
  }, [fetchPillars])

  const addPillar = async (qrCode: string, name: string) => {
    const sb = requireSupabase()
    const { data: pillar, error: pillarErr } = await sb
      .from('pillars')
      .insert({ qr_code: qrCode.trim(), name: name.trim(), status: 'active' })
      .select()
      .single()

    if (pillarErr) throw pillarErr

    const portsPayload = [1, 2, 3, 4].map((port_number) => ({
      pillar_id: pillar.id,
      port_number,
      status: 'available' as const,
    }))

    const { error: portsErr } = await sb.from('ports').insert(portsPayload)
    if (portsErr) throw portsErr

    await fetchPillars()
    return pillar as Pillar
  }

  const updatePillarStatus = async (id: string, status: PillarStatus, note?: string) => {
    const sb = requireSupabase()
    const payload: Partial<Pillar> = { status }
    if (note !== undefined) payload.note = note
    const { error: err } = await sb.from('pillars').update(payload).eq('id', id)
    if (err) throw err
    await fetchPillars()
  }

  const updatePillarQr = async (id: string, qrCode: string) => {
    const sb = requireSupabase()
    const { error: err } = await sb
      .from('pillars')
      .update({ qr_code: qrCode.trim() })
      .eq('id', id)
    if (err) throw err
    await fetchPillars()
  }

  const updatePillarName = async (id: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Tên trụ không được để trống')
    const sb = requireSupabase()
    const { error: err } = await sb.from('pillars').update({ name: trimmed }).eq('id', id)
    if (err) throw err
    await fetchPillars()
  }

  const deletePillar = async (id: string) => {
    const sb = requireSupabase()
    const { error: err } = await sb.from('pillars').delete().eq('id', id)
    if (err) throw err
    await fetchPillars()
  }

  const updatePortStatus = async (id: string, status: PortStatus, note?: string) => {
    const sb = requireSupabase()
    const payload: Partial<Port> = { status }
    if (note !== undefined) payload.note = note
    const { error: err } = await sb.from('ports').update(payload).eq('id', id)
    if (err) throw err
    await fetchPillars()
  }

  const getPillarByQr = async (qrCode: string): Promise<PillarWithPorts | null> => {
    const sb = requireSupabase()
    const { data, error: err } = await sb
      .from('pillars')
      .select('*, ports(*)')
      .eq('qr_code', qrCode.trim())
      .maybeSingle()

    if (err) throw err
    if (!data) return null

    return {
      ...data,
      ports: sortPorts((data.ports ?? []) as Port[]),
    } as PillarWithPorts
  }

  const startUsage = async (pillarId: string, portId: string, note = '') => {
    const sb = requireSupabase()
    const { data: log, error: logErr } = await sb
      .from('usage_logs')
      .insert({
        pillar_id: pillarId,
        port_id: portId,
        note,
      })
      .select()
      .single()

    if (logErr) throw logErr

    const { error: portErr } = await sb
      .from('ports')
      .update({ status: 'in_use' })
      .eq('id', portId)

    if (portErr) throw portErr
    await fetchPillars()
    return log
  }

  const endUsage = async (logId: string, portId: string) => {
    const sb = requireSupabase()
    const { error: logErr } = await sb
      .from('usage_logs')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', logId)

    if (logErr) throw logErr

    const { error: portErr } = await sb
      .from('ports')
      .update({ status: 'available' })
      .eq('id', portId)
      .neq('status', 'faulty')

    if (portErr) throw portErr
    await fetchPillars()
  }

  const seedDemoPillars = async (count = 6) => {
    const sb = requireSupabase()
    for (let i = 1; i <= count; i++) {
      const qr = `VF-DEMO-${String(i).padStart(3, '0')}`
      const name = `Trụ demo ${i}`
      const { data: existing } = await sb
        .from('pillars')
        .select('id')
        .eq('qr_code', qr)
        .maybeSingle()
      if (existing) continue

      const { data: pillar, error: pillarErr } = await sb
        .from('pillars')
        .insert({ qr_code: qr, name, status: 'active' })
        .select()
        .single()
      if (pillarErr) throw pillarErr

      const { error: portsErr } = await sb.from('ports').insert(
        [1, 2, 3, 4].map((port_number) => ({
          pillar_id: pillar.id,
          port_number,
          status: 'available',
        })),
      )
      if (portsErr) throw portsErr
    }
    await fetchPillars()
  }

  return {
    pillars,
    loading,
    error,
    refresh: fetchPillars,
    addPillar,
    updatePillarStatus,
    updatePillarQr,
    updatePillarName,
    deletePillar,
    updatePortStatus,
    getPillarByQr,
    startUsage,
    endUsage,
    seedDemoPillars,
  }
}

export function useUsageLogs() {
  const [logs, setLogs] = useState<UsageLogWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLogs([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const sb = requireSupabase()
      const { data, error: err } = await sb
        .from('usage_logs')
        .select('*, pillars(id, name, qr_code), ports(id, port_number)')
        .order('started_at', { ascending: false })
        .limit(200)

      if (err) throw err
      setLogs((data ?? []) as UsageLogWithRelations[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được lịch sử')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchLogs()
  }, [fetchLogs])

  return { logs, loading, error, refresh: fetchLogs }
}
