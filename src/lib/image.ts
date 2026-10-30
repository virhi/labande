// Réduit une photo de téléphone (souvent plusieurs Mo) avant l'envoi.
export async function shrinkImage(file: File, maxSide = 1600, quality = 0.82): Promise<Blob> {
  if (typeof createImageBitmap !== 'function') return file
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  return blob ?? file
}
