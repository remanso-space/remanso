import { confirmMessage, errorMessage } from "@/utils/notif"

/**
 * Put a share link on the clipboard and say so either way. Clipboard writes fail
 * on an insecure origin or a denied permission, and a silent no-op would look
 * exactly like success.
 */
export const copyLink = async (url: string, label: string) => {
  try {
    await navigator.clipboard.writeText(url)
    confirmMessage(`🔗 ${label} link copied`)
  } catch {
    errorMessage("❌ Couldn't copy the link")
  }
}
