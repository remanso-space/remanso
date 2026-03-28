export const decodeBase64ToUTF8 = (content: string): string => {
  return decodeURIComponent(
    atob(content)
      .split("")
      .map((char) => `%${("00" + char.charCodeAt(0).toString(16)).slice(-2)}`)
      .join("")
  )
}
export const encodeUTF8ToBase64 = (content: string): string => {
  const utf8Bytes: Uint8Array = new TextEncoder().encode(content)
  return btoa(String.fromCharCode(...utf8Bytes))
}
