import { decodeQrFromImageData, decodeQrFromCanvas, decodeQrNative } from './decodeQr'

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Không mở được ảnh. Chọn file ảnh hợp lệ.'))
    }
    img.src = url
  })
}

/** Decode QR from an uploaded/gallery image. */
export async function scanQrFromFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File không phải ảnh. Chọn JPG/PNG/WEBP chứa mã QR.')
  }

  const img = await loadImageFromFile(file)

  const native = await decodeQrNative(img)
  if (native) return native.data

  const fromCanvas = decodeQrFromCanvas(img)
  if (fromCanvas) return fromCanvas.data

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (ctx) {
    for (const maxSide of [1200, 800, 600, 400]) {
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
      const w = Math.max(1, Math.round(img.naturalWidth * scale))
      const h = Math.max(1, Math.round(img.naturalHeight * scale))
      canvas.width = w
      canvas.height = h
      ctx.drawImage(img, 0, 0, w, h)
      const hit = decodeQrFromImageData(ctx.getImageData(0, 0, w, h))
      if (hit) return hit.data
    }
  }

  throw new Error('Không tìm thấy mã QR trong ảnh. Chụp gần hơn, rõ nét, đủ sáng rồi thử lại.')
}
