import { fail } from '@/lib/http';

export const STORAGE_BUCKET = 'ad-media';
export const ALLOWED_MEDIA_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'video/mp4', 'video/webm'];
export const MAX_MEDIA_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function sanitizeFileExtension(fileName: string) {
  const extension = fileName.includes('.') ? fileName.split('.').pop() : 'bin';
  return (extension || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
}

export function assertValidMediaUpload(input: {
  contentType: string;
  fileSize: number;
}) {
  if (!ALLOWED_MEDIA_MIME_TYPES.includes(input.contentType)) {
    return fail('Invalid file type. Allowed types: PNG, JPEG, GIF, MP4, WebM.');
  }

  if (input.fileSize > MAX_MEDIA_FILE_SIZE) {
    return fail('File too large. Maximum size is 50MB.');
  }

  return null;
}
