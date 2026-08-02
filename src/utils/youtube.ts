export const extractYouTubeId = (input: string) => {
  if (!input) {
    return null
  }

  let url: URL

  try {
    url = new URL(input)
  } catch {
    return input.trim()
  }

  const host = url.hostname.toLowerCase()
  const pathSegments = url.pathname.split("/").filter(Boolean)

  if (host.includes("youtu.be")) {
    return pathSegments[0] ?? null
  }

  if (!host.includes("youtube.com")) {
    return null
  }

  const vParam = url.searchParams.get("v")

  if (vParam) {
    return vParam
  }

  if (
    pathSegments.length >= 2 &&
    ["embed", "shorts", "live", "watch"].includes(pathSegments[0])
  ) {
    return pathSegments[1]
  }

  return null
}

export interface YouTubeMeta {
  title: string
  author: string
}

// oEmbed gives us the title and channel name as JSON with a permissive CORS
// header — scraping the watch page directly would be blocked by CORS. No API
// key needed.
export const fetchYouTubeMeta = async (
  videoId: string
): Promise<YouTubeMeta | null> => {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    watchUrl
  )}&format=json`

  try {
    const res = await fetch(oembedUrl)
    if (!res.ok) {
      return null
    }
    const data = (await res.json()) as {
      title?: unknown
      author_name?: unknown
    }
    const title = typeof data.title === "string" ? data.title.trim() : ""
    const author =
      typeof data.author_name === "string" ? data.author_name.trim() : ""
    if (!title && !author) {
      return null
    }
    return { title, author }
  } catch (err) {
    console.warn(err)
    return null
  }
}
