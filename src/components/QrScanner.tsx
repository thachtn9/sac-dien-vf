import { useEffect, useId, useRef } from 'react'
import { Html5Qrcode, type Html5QrcodeResult } from 'html5-qrcode'

interface QrScannerProps {
  onScan: (value: string) => void
  paused?: boolean
}

export function QrScanner({ onScan, paused = false }: QrScannerProps) {
  const regionId = useId().replace(/:/g, '')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const onScanRef = useRef(onScan)
  const lastValueRef = useRef('')

  onScanRef.current = onScan

  useEffect(() => {
    let cancelled = false
    const scanner = new Html5Qrcode(regionId)
    scannerRef.current = scanner

    const start = async () => {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 8, qrbox: { width: 240, height: 240 } },
          (decoded: string, _result: Html5QrcodeResult) => {
            const value = decoded.trim()
            if (!value || value === lastValueRef.current) return
            lastValueRef.current = value
            onScanRef.current(value)
          },
          () => undefined,
        )
      } catch {
        if (!cancelled) {
          try {
            await scanner.start(
              { facingMode: 'user' },
              { fps: 8, qrbox: { width: 240, height: 240 } },
              (decoded: string) => {
                const value = decoded.trim()
                if (!value || value === lastValueRef.current) return
                lastValueRef.current = value
                onScanRef.current(value)
              },
              () => undefined,
            )
          } catch {
            // Camera permission denied — UI shows hint below
          }
        }
      }
    }

    void start()

    return () => {
      cancelled = true
      const stop = async () => {
        try {
          if (scanner.isScanning) await scanner.stop()
          scanner.clear()
        } catch {
          // ignore cleanup errors
        }
      }
      void stop()
      scannerRef.current = null
    }
  }, [regionId])

  useEffect(() => {
    const scanner = scannerRef.current
    if (!scanner) return

    const toggle = async () => {
      try {
        if (paused && scanner.isScanning) {
          await scanner.pause(true)
        } else if (!paused) {
          // resume if previously paused
          try {
            scanner.resume()
          } catch {
            // not paused
          }
          lastValueRef.current = ''
        }
      } catch {
        // ignore
      }
    }

    void toggle()
  }, [paused])

  return (
    <div className="overflow-hidden rounded-2xl bg-vf-navy shadow-lg">
      <div id={regionId} className="min-h-[280px] w-full overflow-hidden [&_video]:object-cover" />
      <p className="px-4 py-3 text-center text-sm text-white/80">
        Đưa mã QR của trụ vào khung hình. Cần cấp quyền camera trên trình duyệt.
      </p>
    </div>
  )
}
