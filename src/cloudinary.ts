

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

type CloudinaryUploadResponse = {
  secure_url?: string
  public_id?: string
  error?: {
    message?: string
  }
}

export async function uploadImageToCloudinary(file: File) {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Configuration Cloudinary manquante dans le fichier .env')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  formData.append('folder', 'alimducour/products')

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  })

  const data = (await response.json()) as CloudinaryUploadResponse

  if (!response.ok || !data.secure_url) {
    throw new Error(data.error?.message || 'Impossible d’envoyer l’image sur Cloudinary')
  }

  return {
    imageUrl: data.secure_url,
    publicId: data.public_id ?? '',
  }
}