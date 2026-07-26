import jsQR from 'jsqr'

export function decodeQrFromImageData(imageData: ImageData): string | null {
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  })
  return code?.data?.trim() || null
}

type FrameSource = HTMLCanvasElement | HTMLVideoElement | HTMLImageElement

function sourceSize(source: FrameSource): { sw: number; sh: number } | null {
  if (source instanceof HTMLVideoElement) {
    if (!source.videoWidth || !source.videoHeight) return null
    return { sw: source.videoWidth, sh: source.videoHeight }
  }
  if (source instanceof HTMLImageElement) {
    if (!source.naturalWidth || !source.naturalHeight) return null
    return { sw: source.naturalWidth, sh: source.naturalHeight }
  }
  if (!source.width || !source.height) return null
  return { sw: source.width, sh: source.height }
}

/** Decode QR from a canvas/video/image. Tries center crop scales then full frame sizes. */
export function decodeQrFromCanvas(
  source: FrameSource,
  opts?: { cropRatio?: number },
): string | null {
  const size = sourceSize(source)
  if (!size) return null
  const { sw, sh } = size

  const cropRatio = opts?.cropRatio ?? 1
  const cw = Math.floor(sw * cropRatio)
  const ch = Math.floor(sh * cropRatio)
  const sx = Math.floor((sw - cw) / 2)
  const sy = Math.floor((sh - ch) / 2)

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  const targetSides = [Math.min(cw, 720), 480, 360, 280].filter((n, i, arr) => arr.indexOf(n) === i)

  for (const maxSide of targetSides) {
    const scale = Math.min(1, maxSide / Math.max(cw, ch))
    const tw = Math.max(1, Math.round(cw * scale))
    const th = Math.max(1, Math.round(ch * scale))
    canvas.width = tw
    canvas.height = th
    ctx.drawImage(source, sx, sy, cw, ch, 0, 0, tw, th)
    const imageData = ctx.getImageData(0, 0, tw, th)
    const value = decodeQrFromImageData(imageData)
    if (value) return value
  }

  return null
}

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>
}

function getBarcodeDetector(): BarcodeDetectorLike | null {
  const BD = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike })
    .BarcodeDetector
  if (!BD) return null
  try {
    return new BD({ formats: ['qr_code'] })
  } catch {
    return null
  }
}

export async function decodeQrNative(source: ImageBitmapSource): Promise<string | null> {
  const detector = getBarcodeDetector()
  if (!detector) return null
  try {
    const codes = await detector.detect(source)
    const value = codes[0]?.rawValue?.trim()
    return value || null
  } catch {
    return null
  }
}
