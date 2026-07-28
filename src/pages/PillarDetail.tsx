import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PortSelector } from '../components/PortSelector'
import { QrCapture } from '../components/QrCapture'
import { QrPreviewModal } from '../components/QrPreviewModal'
import { PillarStatusBadge, pillarLabels } from '../components/StatusBadge'
import { usePillars } from '../hooks/usePillars'
import type { PillarStatus, Port, PortStatus } from '../types'

const pillarStatusCycle: PillarStatus[] = ['active', 'faulty', 'offline']
const portStatusCycle: PortStatus[] = ['available', 'in_use', 'faulty']
const LONG_PRESS_MS = 550
const DOUBLE_TAP_MS = 350

export function PillarDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    pillars,
    loading,
    updatePillarStatus,
    updatePillarQr,
    updatePillarName,
    deletePillar,
    updatePortStatus,
  } = usePillars()
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [editingQr, setEditingQr] = useState(false)
  const [pendingQr, setPendingQr] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showQrPreview, setShowQrPreview] = useState(false)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastQrTapRef = useRef(0)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const pillar = useMemo(() => pillars.find((p) => p.id === id), [pillars, id])

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus()
  }, [editingName])

  const clearPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  const startLongPress = (action: () => void) => {
    clearPress()
    pressTimer.current = setTimeout(() => {
      pressTimer.current = null
      action()
    }, LONG_PRESS_MS)
  }

  const endPress = () => {
    clearPress()
  }

  const handleQrCodeShortTap = () => {
    const now = Date.now()
    if (now - lastQrTapRef.current < DOUBLE_TAP_MS) {
      lastQrTapRef.current = 0
      setShowQrPreview(true)
      setEditingQr(false)
      setEditingName(false)
      setMessage(null)
      return
    }
    lastQrTapRef.current = now
  }

  const copyQrCode = async () => {
    if (!pillar) return
    try {
      await navigator.clipboard.writeText(pillar.qr_code)
      setMessage('Đã sao chép mã trụ')
    } catch {
      setMessage('Không sao chép được mã')
    }
  }

  const cyclePillarStatus = async () => {
    if (!pillar) return
    const idx = pillarStatusCycle.indexOf(pillar.status)
    const next = pillarStatusCycle[(idx + 1) % pillarStatusCycle.length]
    try {
      setBusy(true)
      setMessage(null)
      await updatePillarStatus(pillar.id, next, note ?? pillar.note)
      setMessage(`Trạng thái trụ → ${pillarLabels[next]}`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Lỗi cập nhật trụ')
    } finally {
      setBusy(false)
    }
  }

  const cyclePortStatus = async (port: Port) => {
    const idx = portStatusCycle.indexOf(port.status)
    const next = portStatusCycle[(idx + 1) % portStatusCycle.length]
    try {
      setBusy(true)
      setMessage(null)
      await updatePortStatus(port.id, next)
      setMessage(`Cổng ${port.port_number} → ${next}`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Lỗi cập nhật cổng')
    } finally {
      setBusy(false)
    }
  }

  const saveNote = async () => {
    if (!pillar || note === null) return
    try {
      setBusy(true)
      await updatePillarStatus(pillar.id, pillar.status, note)
      setMessage('Đã lưu ghi chú')
      setNote(null)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Lỗi lưu ghi chú')
    } finally {
      setBusy(false)
    }
  }

  const saveNewQr = async () => {
    if (!pillar || !pendingQr) return
    try {
      setBusy(true)
      setMessage(null)
      await updatePillarQr(pillar.id, pendingQr)
      setMessage('Đã cập nhật mã QR trụ')
      setEditingQr(false)
      setPendingQr(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Không đổi được mã QR'
      setMessage(msg.includes('duplicate') || msg.includes('unique') ? 'Mã QR này đã dùng cho trụ khác.' : msg)
    } finally {
      setBusy(false)
    }
  }

  const saveName = async () => {
    if (!pillar) return
    const next = nameDraft.trim()
    if (!next) {
      setMessage('Tên trụ không được để trống')
      return
    }
    if (next === pillar.name) {
      setEditingName(false)
      return
    }
    try {
      setBusy(true)
      setMessage(null)
      await updatePillarName(pillar.id, next)
      setEditingName(false)
      setMessage('Đã đổi tên trụ')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Không đổi được tên')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!pillar) return
    try {
      setBusy(true)
      setMessage(null)
      await deletePillar(pillar.id)
      navigate('/', { replace: true })
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Không xóa được trụ')
      setBusy(false)
    }
  }

  if (loading && !pillar) {
    return <p className="text-sm text-vf-navy/50">Đang tải…</p>
  }

  if (!pillar) {
    return (
      <div>
        <Link to="/" className="text-sm font-medium text-vf-teal-dark hover:underline">
          ← Về trạm
        </Link>
        <p className="mt-4 text-vf-navy">Không tìm thấy trụ.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <Link to="/" className="text-sm font-medium text-vf-teal-dark hover:underline">
          ← Về trạm
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {editingName ? (
              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  void saveName()
                }}
              >
                <input
                  ref={nameInputRef}
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-vf-teal bg-white px-3 py-2 text-xl font-bold text-vf-navy outline-none"
                  maxLength={80}
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-vf-teal px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Lưu
                </button>
                <button
                  type="button"
                  onClick={() => setEditingName(false)}
                  className="rounded-xl border border-vf-navy/15 px-3 py-2 text-sm font-semibold"
                >
                  Hủy
                </button>
              </form>
            ) : (
              <button
                type="button"
                className="max-w-full select-none rounded-md px-1 py-0.5 text-left text-2xl font-bold text-vf-navy outline-none transition hover:bg-vf-navy/5 active:bg-vf-teal/10"
                title="Nhấn giữ để đổi tên"
                onPointerDown={() =>
                  startLongPress(() => {
                    setEditingName(true)
                    setNameDraft(pillar.name)
                    setEditingQr(false)
                    setMessage(null)
                  })
                }
                onPointerUp={endPress}
                onPointerLeave={endPress}
                onPointerCancel={endPress}
                onContextMenu={(e) => e.preventDefault()}
              >
                {pillar.name}
              </button>
            )}
            <div className="mt-1 flex items-start gap-1">
              <button
                type="button"
                className="min-w-0 flex-1 select-none break-all rounded-md px-1 py-0.5 text-left font-mono text-xs text-vf-navy/50 outline-none transition hover:bg-vf-navy/5 active:bg-vf-teal/10"
                title="Nhấp đúp để xem QR · Nhấn giữ để đổi mã"
                onPointerDown={() =>
                  startLongPress(() => {
                    lastQrTapRef.current = 0
                    setEditingQr(true)
                    setPendingQr(null)
                    setEditingName(false)
                    setShowQrPreview(false)
                    setMessage(null)
                  })
                }
                onPointerUp={() => {
                  const shortTap = pressTimer.current !== null
                  endPress()
                  if (shortTap) handleQrCodeShortTap()
                }}
                onPointerLeave={endPress}
                onPointerCancel={endPress}
                onContextMenu={(e) => e.preventDefault()}
              >
                {pillar.qr_code}
              </button>
              <button
                type="button"
                onClick={() => void copyQrCode()}
                title="Sao chép mã trụ"
                aria-label="Sao chép mã trụ"
                className="shrink-0 rounded-md p-1.5 text-vf-navy/40 outline-none transition hover:bg-vf-navy/5 hover:text-vf-teal-dark active:bg-vf-teal/10"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>
          </div>
          <PillarStatusBadge
            status={pillar.status}
            disabled={busy}
            onClick={() => void cyclePillarStatus()}
          />
        </div>
      </div>

      {editingQr ? (
        <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-vf-navy">Đổi mã QR</h3>
            <button
              type="button"
              onClick={() => {
                setEditingQr(false)
                setPendingQr(null)
              }}
              className="text-sm font-medium text-vf-navy/50 hover:underline"
            >
              Hủy
            </button>
          </div>
          <p className="text-sm text-vf-navy/60">Quét QR mới, chọn ảnh, hoặc nhập mã.</p>
          {!pendingQr ? (
            <QrCapture onDetected={setPendingQr} />
          ) : (
            <div className="space-y-3 rounded-xl border border-vf-navy/10 bg-vf-sand/60 p-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-vf-navy/45">Mã mới</p>
                <p className="mt-1 break-all font-mono text-sm text-vf-navy">{pendingQr}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPendingQr(null)}
                  className="rounded-xl border border-vf-navy/15 px-4 py-2.5 text-sm font-semibold"
                >
                  Chọn lại
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveNewQr()}
                  className="flex-1 rounded-xl bg-vf-teal px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? 'Đang lưu…' : 'Lưu mã mới'}
                </button>
              </div>
            </div>
          )}
        </section>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-vf-navy/45">4 cổng</h3>
        <p className="text-sm text-vf-navy/60">Chạm cổng để đổi trạng thái: trống → đang sạc → lỗi.</p>
        <PortSelector ports={pillar.ports} mode="manage" onSelect={(p) => void cyclePortStatus(p)} />
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <label className="block text-sm font-medium text-vf-navy">
          Ghi chú lỗi / bảo trì
          <textarea
            value={note ?? pillar.note ?? ''}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border border-vf-navy/15 px-3 py-2 outline-none focus:border-vf-teal"
            placeholder="Mô tả sự cố…"
          />
        </label>
        <button
          type="button"
          disabled={busy || note === null}
          onClick={() => void saveNote()}
          className="rounded-xl bg-vf-navy px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          Lưu ghi chú
        </button>
      </section>

      <section className="space-y-3 rounded-2xl border border-red-200 bg-red-50/70 p-4">
        <h3 className="text-sm font-semibold text-red-800">Xóa trụ</h3>
        {!confirmDelete ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmDelete(true)}
            className="w-full rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-50"
          >
            Xóa trụ sạc này
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-800">
              Xóa <strong>{pillar.name}</strong>? Cổng và lịch sử sạc gắn trụ cũng sẽ bị xóa.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-xl border border-vf-navy/15 bg-white px-4 py-2.5 text-sm font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleDelete()}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? 'Đang xóa…' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        )}
      </section>

      {message ? <p className="text-sm text-vf-navy/70">{message}</p> : null}

      {showQrPreview ? (
        <QrPreviewModal
          value={pillar.qr_code}
          title={pillar.name}
          onClose={() => setShowQrPreview(false)}
        />
      ) : null}
    </div>
  )
}
