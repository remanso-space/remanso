import { nextTick } from "vue"
import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router"

import Home from "@/views/HomeApp.vue"

const routes: Array<RouteRecordRaw> = [
  {
    path: "/repo-list",
    name: "RepoList",
    component: () => import("@/views/RepoList.vue")
  },
  {
    path: "/:user/:repo",
    name: "FluxNoteView",
    props: true,
    component: () => import("@/views/FluxNoteView.vue")
  },
  {
    path: "/tiboudenote",
    name: "PublicNoteListView",
    component: () => import("@/views/PublicNoteListView.vue")
  },
  {
    path: "/pub",
    name: "PublicNoteListView",
    component: () => import("@/views/PublicNoteListView.vue")
  },
  {
    path: "/pub/:shortDid",
    name: "PublicNoteListByDidView",
    props: true,
    component: () => import("@/views/PublicNoteListByDidView.vue")
  },
  {
    path: "/pub/:shortDid/:rkey/:slug?",
    name: "PublicNoteView",
    props: true,
    component: () => import("@/views/PublicNoteView.vue")
  },
  {
    path: "/:user/:repo/inbox",
    name: "FleetingNotes",
    props: true,
    component: () => import("@/views/FleetingNotes.vue")
  },
  {
    path: "/:user/:repo/draft",
    name: "DraftNotes",
    props: true,
    component: () => import("@/views/DraftNotes.vue")
  },
  {
    path: "/:user/:repo/todo",
    name: "TodoNotes",
    props: true,
    component: () => import("@/views/TodoNotes.vue")
  },
  {
    path: "/:user/:repo/history",
    name: "HistoricNotes",
    props: true,
    component: () => import("@/views/HistoricNotes.vue")
  },
  {
    path: "/:user/:repo/spaced-repetition",
    name: "SpacedRepetitionCard",
    props: true,
    component: () => import("@/views/SpacedRepetitionCard.vue")
  },
  {
    path: "/:user/:repo/need-review-cards",
    name: "NeedReviewCards",
    props: true,
    component: () => import("@/views/NeedReviewCards.vue")
  },
  {
    path: "/about",
    name: "About",
    component: () => import("@/views/AboutApp.vue")
  },
  {
    path: "/",
    name: "Home",
    component: Home
  },
  {
    path: "/:catchAll(.*)",
    name: "SpaceCowboy",
    component: () => import("@/views/SpaceCowboy.vue")
  }
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach(() => {
  if (!("startViewTransition" in document)) return
  return new Promise<void>((resolve) => {
    ;(
      document as Document & {
        startViewTransition: (cb: () => Promise<void>) => void
      }
    ).startViewTransition(async () => {
      resolve()
      await new Promise<void>((r) => {
        const unwatch = router.afterEach(() => {
          unwatch()
          nextTick().then(r)
        })
      })
    })
  })
})
