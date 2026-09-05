<script setup lang="ts">
import UserPill from "@/components/UserPill.vue"

/**
 * The paper-and-ink top bar shared by the home page and the repo list. Pages
 * put their own links in the default slot; they land to the left of the ones
 * every page carries. Styling lives in `src/styles/hw.css` under `.hw-page`,
 * which is what lets slotted links pick up `.navlink` too.
 */
const openProfile = () => {
  ;(document.getElementById("profile_modal") as HTMLDialogElement)?.showModal()
}
</script>

<template>
  <nav class="topnav">
    <div class="topnav-left">
      <router-link :to="{ name: 'Home' }" class="brand">
        <img
          src="/favicon.png"
          alt="Remanso"
          class="brand-mark"
          width="28"
          height="28"
        />
        <span class="brand-word">Remanso</span>
      </router-link>
    </div>
    <div class="topnav-right">
      <slot />
      <router-link :to="{ name: 'PublicNoteListView' }" class="navlink"
        >Public&nbsp;notes</router-link
      >
      <router-link
        :to="{
          name: 'FluxNoteView',
          params: { user: 'remanso-space', repo: 'getting-started' }
        }"
        class="navlink"
        >Getting&nbsp;started</router-link
      >
      <UserPill @click="openProfile" />
    </div>
  </nav>
</template>
