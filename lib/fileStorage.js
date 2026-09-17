import path from "node:path";
import { unlink } from "node:fs/promises";

export function getStoredFilePath(link) {
  if (!link?.startsWith("/uploads/")) return null;

  return path.join("uploads", path.basename(link));
}

export async function removeStoredFile(link) {
  // Only delete files that this app stored in its own uploads directory.
  // External URLs can safely remain in the database for a future storage service.
  const filePath = getStoredFilePath(link);
  if (!filePath) return;

  try {
    await unlink(filePath);
  } catch (error) {
    // A missing physical file should not prevent its database record being removed.
    if (error.code !== "ENOENT") throw error;
  }
}

export async function removeUploadedFiles(files) {
  for (const file of files || []) {
    await removeStoredFile(`/uploads/${file.filename}`);
  }
}
