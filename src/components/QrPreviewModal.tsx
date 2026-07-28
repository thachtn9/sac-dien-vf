import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

type Props = {
  value: string
  title?: string
  onClose: () => void
}

export function QrPreviewModal({ value, title, onClose }: Props) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void QRCode.toDataURL(value, {
      width: 280,
      margin: 2,
      color: { dark: '#0a2540', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).then((url) => {
      if (!cancelled) setSrc(url)
    })
    return () => {
      cancelled = true
    }
  }, [value])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-vf-navy/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Mã QR trụ sạc"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs space-y-4 rounded-2xl bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {title ? <h3 className="text-center text-base font-semibold text-vf-navy">{title}</h3> : null}
        <div className="flex justify-center rounded-xl bg-vf-sand/80 p-4">
          {src ? (
            <img src={src} alt={`QR ${value}`} className="h-[200px] w-[200px]" />
          ) : (
            <p className="py-16 text-sm text-vf-navy/50">Đang tạo QR…</p>
          )}
        </div>
        <p className="break-all text-center font-mono text-xs text-vf-navy/60">{value}</p>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-vf-navy px-4 py-2.5 text-sm font-semibold text-white"
        >
          Đóng
        </button>
      </div>
    </div>
  )
}
