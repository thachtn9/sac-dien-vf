import { useId, useRef, useState } from 'react'
import { scanQrFromFile } from '../lib/scanQrFile'
import { QrScanner } from './QrScanner'

export type QrCaptureMode = 'camera' | 'image' | 'manual'

interface QrCaptureProps {
  onDetected: (value: string) => void
  /** Hide camera when parent already has a code and wants to pause */
  paused?: boolean
  initialMode?: QrCaptureMode
}

const modes: { id: QrCaptureMode; label: string }[] = [
  { id: 'camera', label: 'Camera' },
  { id: 'image', label: 'Ảnh QR' },
  { id: 'manual', label: 'Nhập mã' },
]

export function QrCapture({ onDetected, paused = false, initialMode = 'camera' }: QrCaptureProps) {
  const [mode, setMode] = useState<QrCaptureMode>(initialMode)
  const [manualValue, setManualValue] = useState('')
  const [imageError, setImageError] = useState<string | null>(null)
  const [imageBusy, setImageBusy] = useState(false)
  const [imageName, setImageName] = useState<string | null>(null)
  const fileInputId = useId()
  const fileRef = useRef<HTMLInputElement>(null)

  const switchMode = (next: QrCaptureMode) => {
    setMode(next)
    setImageError(null)
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    try {
      setImageBusy(true)
      setImageError(null)
      setImageName(file.name)
      const value = await scanQrFromFile(file)
      onDetected(value)
    } catch (e) {
      setImageError(e instanceof Error ? e.message : 'Không đọc được ảnh QR')
    } finally {
      setImageBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-vf-navy/5 p-1">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => switchMode(m.id)}
            className={`rounded-lg px-2 py-2 text-sm font-semibold transition ${
              mode === m.id
                ? 'bg-white text-vf-navy shadow-sm'
                : 'text-vf-navy/55 hover:text-vf-navy'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'camera' ? <QrScanner onScan={onDetected} paused={paused} /> : null}

      {mode === 'image' ? (
        <div className="rounded-2xl border border-dashed border-vf-navy/20 bg-white p-5 text-center">
          <p className="text-sm text-vf-navy/70">Chọn ảnh chứa mã QR từ thư viện / máy ảnh.</p>
          <input
            ref={fileRef}
            id={fileInputId}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <label
              htmlFor={fileInputId}
              className="inline-flex cursor-pointer rounded-xl bg-vf-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-vf-teal-dark"
            >
              {imageBusy ? 'Đang đọc…' : 'Chụp / chọn ảnh QR'}
            </label>
          </div>
          <p className="mt-2 text-xs text-vf-navy/50">
            Camera máy native thường đọc QR tốt hơn — chụp ảnh rồi chọn ở đây cũng được.
          </p>
          {imageName ? <p className="mt-2 truncate text-xs text-vf-navy/45">{imageName}</p> : null}
          {imageError ? <p className="mt-2 text-sm text-red-600">{imageError}</p> : null}
        </div>
      ) : null}

      {mode === 'manual' ? (
        <form
          className="space-y-3 rounded-2xl border border-vf-navy/10 bg-white p-4"
          onSubmit={(e) => {
            e.preventDefault()
            const value = manualValue.trim()
            if (value) onDetected(value)
          }}
        >
          <label className="block text-sm font-medium text-vf-navy">
            Nhập mã QR
            <input
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              className="mt-1 w-full rounded-xl border border-vf-navy/15 px-3 py-2.5 outline-none focus:border-vf-teal"
              placeholder="Dán hoặc gõ nội dung mã"
            />
          </label>
          <button
            type="submit"
            disabled={!manualValue.trim()}
            className="w-full rounded-xl bg-vf-navy px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Dùng mã này
          </button>
        </form>
      ) : null}
    </div>
  )
}
