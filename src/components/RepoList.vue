<script setup lang="ts">
import fontColorContrast from "font-color-contrast"
import { getHex } from "pastel-color"

import { useGitHubLogin } from "@/hooks/useGitHubLogin.hook"
import { useFavoriteRepos } from "@/modules/repo/hooks/useFavoriteRepos.hook"

const { username } = useGitHubLogin()
const { savedFavoriteRepos } = useFavoriteRepos()

const getStyle = (seed: string) => {
  const backgroundColor = getHex(seed)
  return { backgroundColor, color: fontColorContrast(backgroundColor) }
}
</script>

<template>
  <section class="repo-list">
    <router-link :to="{ name: 'PublicNoteListView' }" class="btn special"
      >Public notes</router-link
    >
    <router-link
      v-for="favoriteRepo in savedFavoriteRepos"
      :key="favoriteRepo._id"
      :to="{
        name: 'FluxNoteView',
        params: {
          user: username,
          repo: favoriteRepo.name
        }
      }"
      class="btn"
      :style="getStyle(`${favoriteRepo.name}-${username}`)"
    >
      {{ favoriteRepo.name }}
    </router-link>
  </section>
</template>

<style scoped lang="scss">
.repo-list {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;

  a {
    border: 0;
    width: 160px;
    height: 90px;
    font-size: 1.5rem;
  }

  .special {
    background-image: linear-gradient(to left bottom, #8cd18d 0%, #fbc2f1 100%);
    color: black;
  }
}
</style>
