/**
 * 檔案上傳安全驗證
 *
 * 防止惡意檔案上傳
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]

const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

export interface FileValidationResult {
  isValid: boolean
  error?: string
}

export function validateImageFile(file: File): FileValidationResult {
  if (!file) {
    return { isValid: false, error: 'No file provided' }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` }
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { isValid: false, error: 'Invalid file type. Only images are allowed.' }
  }

  return { isValid: true }
}

export function validateDocumentFile(file: File): FileValidationResult {
  if (!file) {
    return { isValid: false, error: 'No file provided' }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` }
  }

  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    return { isValid: false, error: 'Invalid file type. Only documents are allowed.' }
  }

  return { isValid: true }
}
