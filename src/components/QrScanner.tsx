import { useEffect, useRef, useState } from 'react'
import { decodeQrFromCanvas, decodeQrNative } from '../lib/decodeQr'

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

export function QrScanner({ onScan, paused = false }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onScanRef = useRef(onScan)
  const lastValueRef = useRef('')
  const pausedRef = useRef(paused)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  onScanRef.current = onScan
  pausedRef.current = paused

  useEffect(() => {
    if (!paused) lastValueRef.current = ''
  }, [paused])

  useEffect(() => {
    let cancelled = false
    let stream: MediaStream | null = null
    let raf = 0
    let lastTick = 0

    const emit = (value: string) => {
      const trimmed = value.trim()
      if (!trimmed || trimmed === lastValueRef.current) return
      lastValueRef.current = trimmed
      onScanRef.current(trimmed)
    }

    const tick = async (now: number) => {
      if (cancelled) return
      raf = requestAnimationFrame((t) => void tick(t))

      if (pausedRef.current) return
      if (now - lastTick < 120) return
      lastTick = now

      const video = videoRef.current
      if (!video || video.readyState < 2 || !video.videoWidth) return

      try {
        const native = await decodeQrNative(video)
        if (native) {
          emit(native)
          return
        }
      } catch {
        // ignore native detector errors
      }

      // Center crop first (QR usually held in middle), then full frame
      const center = decodeQrFromCanvas(video, { cropRatio: 0.72 })
      if (center) {
        emit(center)
        return
      }
      const full = decodeQrFromCanvas(video, { cropRatio: 1 })
      if (full) emit(full)
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
      <div className="relative aspect-[3/4] w-full bg-black sm:aspect-video">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
          autoPlay
        />
        {ready ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[58%] w-[72%] max-w-[280px] rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        ) : null}
        {!ready && !error ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
            Đang mở camera…
          </div>
        ) : null}
      </div>
      <div className="space-y-1 px-4 py-3 text-center text-sm text-white/80">
        <p>Đưa QR vào khung giữa, giữ ổn định khoảng 1–2 giây.</p>
        {error ? <p className="text-amber-200">{error}</p> : null}
      </div>
    </div>
  )
}
