import { useEffect, useRef, useState } from 'react'
import { decodeQrFromCanvas, decodeQrNative, type QrHit, type QrPoint } from '../lib/decodeQr'

interface QrScannerProps {
  onScan: (value: string) => void
  paused?: boolean
}

const CONSTRAINTS_LIST: MediaStreamConstraints[] = [
  {
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  },
  {
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  },
  {
    audio: false,
    video: { facingMode: 'environment' },
  },
  {
    audio: false,
    video: true,
  },
]

async function openCamera(): Promise<MediaStream> {
  let lastError: unknown
  for (const constraints of CONSTRAINTS_LIST) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (e) {
      lastError = e
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Không mở được camera')
}

/** Map video pixel corners -> CSS % inside object-cover preview. */
function cornersToCssPercent(
  corners: [QrPoint, QrPoint, QrPoint, QrPoint],
  video: HTMLVideoElement,
  box: DOMRect,
): { left: number; top: number; width: number; height: number } | null {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh || !box.width || !box.height) return null

  const scale = Math.max(box.width / vw, box.height / vh)
  const dispW = vw * scale
  const dispH = vh * scale
  const offsetX = (box.width - dispW) / 2
  const offsetY = (box.height - dispH) / 2

  const xs = corners.map((p) => p.x * scale + offsetX)
  const ys = corners.map((p) => p.y * scale + offsetY)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const pad = 10

  return {
    left: ((minX - pad) / box.width) * 100,
    top: ((minY - pad) / box.height) * 100,
    width: ((maxX - minX + pad * 2) / box.width) * 100,
    height: ((maxY - minY + pad * 2) / box.height) * 100,
  }
}

export function QrScanner({ onScan, paused = false }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const onScanRef = useRef(onScan)
  const lastValueRef = useRef('')
  const pausedRef = useRef(paused)
  const lockedRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [locked, setLocked] = useState(false)
  const [focusBox, setFocusBox] = useState<{
    left: number
    top: number
    width: number
    height: number
  } | null>(null)

  onScanRef.current = onScan
  pausedRef.current = paused

  useEffect(() => {
    if (!paused) {
      lastValueRef.current = ''
      lockedRef.current = false
      setLocked(false)
      setFocusBox(null)
    }
  }, [paused])

  useEffect(() => {
    let cancelled = false
    let stream: MediaStream | null = null
    let raf = 0
    let lastTick = 0

    const lockOnHit = (hit: QrHit) => {
      if (lockedRef.current) return
      if (!hit.data || hit.data === lastValueRef.current) return

      const video = videoRef.current
      const stage = stageRef.current
      if (video && stage && hit.corners) {
        const box = cornersToCssPercent(hit.corners, video, stage.getBoundingClientRect())
        if (box) setFocusBox(box)
      } else {
        // Fallback: highlight center viewfinder
        setFocusBox({ left: 14, top: 21, width: 72, height: 58 })
      }

      lockedRef.current = true
      setLocked(true)
      lastValueRef.current = hit.data

      window.setTimeout(() => {
        if (!cancelled) onScanRef.current(hit.data)
      }, 450)
    }

    const tick = async (now: number) => {
      if (cancelled) return
      raf = requestAnimationFrame((t) => void tick(t))

      if (pausedRef.current || lockedRef.current) return
      if (now - lastTick < 110) return
      lastTick = now

      const video = videoRef.current
      if (!video || video.readyState < 2 || !video.videoWidth) return

      try {
        const native = await decodeQrNative(video)
        if (native) {
          lockOnHit(native)
          return
        }
      } catch {
        // ignore
      }

      const center = decodeQrFromCanvas(video, { cropRatio: 0.72 })
      if (center) {
        lockOnHit(center)
        return
      }
      const full = decodeQrFromCanvas(video, { cropRatio: 1 })
      if (full) lockOnHit(full)
    }

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Trình duyệt không hỗ trợ camera. Dùng tab Ảnh QR hoặc Nhập mã.')
        return
      }
      if (!window.isSecureContext) {
        setError('Camera web cần HTTPS. Mở trang qua link Vercel (https) hoặc localhost.')
        return
      }

      try {
        stream = await openCamera()
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        video.setAttribute('playsinline', 'true')
        video.muted = true
        await video.play()
        setReady(true)
        setError(null)
        raf = requestAnimationFrame((t) => void tick(t))
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (/NotAllowed|Permission/i.test(msg)) {
          setError('Chưa cấp quyền camera. Vào cài đặt trình duyệt → cho phép Camera.')
        } else if (/NotFound|DevicesNotFound/i.test(msg)) {
          setError('Không tìm thấy camera. Thử tab Ảnh QR.')
        } else {
          setError('Không mở được camera. Thử tab Ảnh QR hoặc Nhập mã.')
        }
      }
    }

    void start()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
      const video = videoRef.current
      if (video) video.srcObject = null
    }
  }, [])

  return (
    <div className="overflow-hidden rounded-2xl bg-vf-navy shadow-lg">
      <div ref={stageRef} className="relative aspect-[3/4] w-full overflow-hidden bg-black sm:aspect-video">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {ready ? (
          <div className="pointer-events-none absolute inset-0">
            <div
              className={`absolute left-[14%] top-[21%] h-[58%] w-[72%] overflow-hidden rounded-[18px] transition duration-300 ${
                locked ? 'opacity-0' : 'opacity-100'
              }`}
              style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }}
            >
              {!locked ? (
                <div className="qr-scan-beam absolute inset-x-3 h-0.5 rounded-full bg-vf-teal shadow-[0_0_12px_2px_rgba(0,176,166,0.85)]" />
              ) : null}
              <span className="absolute left-0 top-0 h-8 w-8 border-l-[3px] border-t-[3px] border-white" />
              <span className="absolute right-0 top-0 h-8 w-8 border-r-[3px] border-t-[3px] border-white" />
              <span className="absolute bottom-0 left-0 h-8 w-8 border-b-[3px] border-l-[3px] border-white" />
              <span className="absolute bottom-0 right-0 h-8 w-8 border-b-[3px] border-r-[3px] border-white" />
            </div>

            {focusBox ? (
              <div
                className={`qr-focus-lock absolute rounded-xl border-[3px] border-vf-teal ${
                  locked ? 'qr-focus-lock-on' : ''
                }`}
                style={{
                  left: `${focusBox.left}%`,
                  top: `${focusBox.top}%`,
                  width: `${focusBox.width}%`,
                  height: `${focusBox.height}%`,
                }}
              >
                <span className="absolute left-0 top-0 h-5 w-5 border-l-[3px] border-t-[3px] border-vf-teal" />
                <span className="absolute right-0 top-0 h-5 w-5 border-r-[3px] border-t-[3px] border-vf-teal" />
                <span className="absolute bottom-0 left-0 h-5 w-5 border-b-[3px] border-l-[3px] border-vf-teal" />
                <span className="absolute bottom-0 right-0 h-5 w-5 border-b-[3px] border-r-[3px] border-vf-teal" />
              </div>
            ) : null}

            {locked ? (
              <div className="absolute inset-x-0 bottom-6 flex justify-center">
                <span className="rounded-full bg-vf-teal px-3 py-1 text-xs font-semibold text-white shadow-lg">
                  Đã khóa mã QR
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        {!ready && !error ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
            Đang mở camera…
          </div>
        ) : null}
      </div>
      <div className="space-y-1 px-4 py-3 text-center text-sm text-white/80">
        <p>{locked ? 'Đang xử lý…' : 'Đưa QR vào khung — sẽ tự focus khi nhận ra mã.'}</p>
        {error ? <p className="text-amber-200">{error}</p> : null}
      </div>
    </div>
  )
}
