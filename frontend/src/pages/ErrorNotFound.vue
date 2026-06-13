<template>
  <q-page class="flex flex-center column q-pa-xl">
    <q-icon name="search_off" size="64px" color="grey-3" />
    <div class="text-h6 text-grey-5 q-mt-md">Stránka nenalezena</div>
    <q-btn
      flat
      color="primary"
      label="Zpět na Stavby"
      class="q-mt-md"
      @click="router.push('/stavby')"
    />
  </q-page>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>
