import jsQR from 'jsqr'

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

function tryDecodeAtSize(img: HTMLImageElement, maxSide: number): string | null {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
  const width = Math.max(1, Math.round(img.naturalWidth * scale))
  const height = Math.max(1, Math.round(img.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  ctx.imageSmoothingEnabled = true
  ctx.drawImage(img, 0, 0, width, height)
  const imageData = ctx.getImageData(0, 0, width, height)
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  })
  return code?.data?.trim() || null
}

/** Decode QR from an uploaded/gallery image (jsQR — reliable for static photos). */
export async function scanQrFromFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File không phải ảnh. Chọn JPG/PNG/WEBP chứa mã QR.')
  }

  const img = await loadImageFromFile(file)

  // Try several sizes: phone photos are often too large for detectors
  const sizes = [1200, 800, 600, 400, Math.max(img.naturalWidth, img.naturalHeight)]
  for (const size of sizes) {
    const value = tryDecodeAtSize(img, size)
    if (value) return value
  }

  throw new Error('Không tìm thấy mã QR trong ảnh. Chụp gần hơn, rõ nét, đủ sáng rồi thử lại.')
}
