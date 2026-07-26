import jsQR, { type QRCode } from 'jsqr'

export type QrPoint = { x: number; y: number }

export type QrHit = {
  data: string
  /** Corners in source (video/image) pixel space */
  corners?: [QrPoint, QrPoint, QrPoint, QrPoint]
}

export function decodeQrFromImageData(imageData: ImageData): QrHit | null {
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  })
  if (!code?.data?.trim()) return null
  return {
    data: code.data.trim(),
    corners: cornersFromJsQr(code),
  }
}

function cornersFromJsQr(code: QRCode): [QrPoint, QrPoint, QrPoint, QrPoint] {
  return [
    code.location.topLeftCorner,
    code.location.topRightCorner,
    code.location.bottomRightCorner,
    code.location.bottomLeftCorner,
  ]
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

function mapCorners(
  corners: [QrPoint, QrPoint, QrPoint, QrPoint],
  scale: number,
  sx: number,
  sy: number,
): [QrPoint, QrPoint, QrPoint, QrPoint] {
  return corners.map((p) => ({
    x: p.x / scale + sx,
    y: p.y / scale + sy,
  })) as [QrPoint, QrPoint, QrPoint, QrPoint]
}

/** Decode QR from a canvas/video/image. Tries center crop scales then full frame sizes. */
export function decodeQrFromCanvas(
  source: FrameSource,
  opts?: { cropRatio?: number },
): QrHit | null {
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
    const hit = decodeQrFromImageData(imageData)
    if (hit) {
      return {
        data: hit.data,
        corners: hit.corners ? mapCorners(hit.corners, scale, sx, sy) : undefined,
      }
    }
  }

  return null
}

type DetectedBarcodeLike = {
  rawValue?: string
  cornerPoints?: Array<{ x: number; y: number }>
  boundingBox?: { x: number; y: number; width: number; height: number }
}

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<DetectedBarcodeLike[]>
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

export async function decodeQrNative(source: ImageBitmapSource): Promise<QrHit | null> {
  const detector = getBarcodeDetector()
  if (!detector) return null
  try {
    const codes = await detector.detect(source)
    const code = codes[0]
    const value = code?.rawValue?.trim()
    if (!value) return null

    let corners: QrHit['corners']
    if (code.cornerPoints && code.cornerPoints.length >= 4) {
      corners = [
        code.cornerPoints[0],
        code.cornerPoints[1],
        code.cornerPoints[2],
        code.cornerPoints[3],
      ]
    } else if (code.boundingBox) {
      const { x, y, width, height } = code.boundingBox
      corners = [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
      ]
    }

    return { data: value, corners }
  } catch {
    return null
  }
}
