<script setup lang="ts">
import { computed } from "vue"
import { useRoute, useRouter } from "vue-router"

import HomeButton from "@/components/HomeButton.vue"
import PublicNoteList from "@/components/PublicNoteList.vue"
import SignInAtproto from "@/components/SignInAtproto.vue"
import { useATProtoLogin } from "@/hooks/useATProtoLogin.hook"
import { useFollowingNoteList } from "@/hooks/useFollowingNoteList.hook"
import { useFollows } from "@/hooks/useFollows.hook"
import { usePublicNoteList } from "@/hooks/usePublicNoteList.hook"
import { toShortDid } from "@/modules/atproto/shortDid"

const route = useRoute()
const router = useRouter()

const { did, isLoggedIn } = useATProtoLogin()
const { follows } = useFollows(did)

const tab = computed<"all" | "following">({
  get: () => (route.query.tab === "following" ? "following" : "all"),
  set: (value) =>
    router.replace({
      query: { ...route.query, tab: value === "all" ? undefined : value }
    })
})

const followingEnabled = computed(() => tab.value === "following")

const all = usePublicNoteList()
const following = useFollowingNoteList(follows, followingEnabled)
</script>

<template>
  <main class="public-note-list-view">
    <div class="header">
      <home-button class="home-button" />
    </div>

    <div v-if="isLoggedIn" role="tablist" class="tabs tabs-border">
      <a
        role="tab"
        class="tab"
        :class="{ 'tab-active': tab === 'all' }"
        @click="tab = 'all'"
        >All</a
      >
      <a
        role="tab"
        class="tab"
        :class="{ 'tab-active': tab === 'following' }"
        @click="tab = 'following'"
        >Following</a
      >
      <sign-in-atproto class="handle" />
    </div>

    <PublicNoteList
      v-if="tab === 'all'"
      :notes="all.notes.value"
      :can-load-more="all.canLoadMore.value"
      :on-load-more="all.onLoadMore"
    >
      <template #meta="{ note }">
        <router-link
          v-if="all.getAuthor(note.did)"
          :to="{
            name: 'PublicNoteListByDidView',
            params: { shortDid: toShortDid(note.did) }
          }"
          class="link link-hover"
        >
          {{ all.getAuthor(note.did) }}
        </router-link>
        <template v-if="note.publishedAt">
          <span>&nbsp;•&nbsp;</span>
          <span>{{ new Date(note.publishedAt).toLocaleDateString() }}</span>
        </template>
        <div v-else class="skeleton h-4 w-20"></div>
      </template>
    </PublicNoteList>

    <PublicNoteList
      v-else
      :notes="following.notes.value"
      :can-load-more="following.canLoadMore.value"
      :on-load-more="following.onLoadMore"
    >
      <template #meta="{ note }">
        <router-link
          v-if="following.getAuthor(note.did)"
          :to="{
            name: 'PublicNoteListByDidView',
            params: { shortDid: toShortDid(note.did) }
          }"
          class="link link-hover"
        >
          {{ following.getAuthor(note.did) }}
        </router-link>
        <template v-if="note.publishedAt">
          <span>&nbsp;•&nbsp;</span>
          <span>{{ new Date(note.publishedAt).toLocaleDateString() }}</span>
        </template>
        <div v-else class="skeleton h-4 w-20"></div>
      </template>
    </PublicNoteList>
  </main>
</template>

<style scoped lang="scss">
.tabs {
  position: relative;
}

.handle {
  position: absolute;
  right: 0;
  align-self: center;
}

.public-note-list-view {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding-left: 1rem;
  padding-right: 1rem;

  .header {
    margin: 0.5rem auto 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  h1 {
    flex: 1;
    text-align: center;
    margin-bottom: 0;
  }

  @media screen and (min-width: 769px) {
    overflow-y: auto;
  }
}
</style>
