import { OpenPanel } from "@openpanel/web"

export const op = new OpenPanel({
  apiUrl: "https://api.stats.apoena.dev",
  clientId: "038a6aac-19bb-4a7f-9aae-2d0201fead5b",
  trackScreenViews: true,
  trackOutgoingLinks: true,
  trackAttributes: true
})
