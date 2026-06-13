<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer class="nav-footer bg-white">
      <q-tabs
        v-model="activeTab"
        dense
        no-caps
        class="bg-white text-grey-6"
        active-color="primary"
        indicator-color="transparent"
        align="justify"
        @update:model-value="navigateTo"
      >
        <q-tab name="stavby" class="nav-tab">
          <q-icon :name="activeTab === 'stavby' ? 'business' : 'o_business'" size="22px" />
          <div class="nav-label">Stavby</div>
        </q-tab>
        <q-tab name="kalendar" class="nav-tab">
          <q-icon :name="activeTab === 'kalendar' ? 'calendar_month' : 'o_calendar_month'" size="22px" />
          <div class="nav-label">Kalendář</div>
        </q-tab>
        <q-tab name="nastaveni" class="nav-tab">
          <q-icon :name="activeTab === 'nastaveni' ? 'settings' : 'o_settings'" size="22px" />
          <div class="nav-label">Nastavení</div>
        </q-tab>
      </q-tabs>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNastaveniStore } from '../stores/nastaveni'
import { useStavbyStore } from '../stores/stavby'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const nastaveniStore = useNastaveniStore()
const stavbyStore = useStavbyStore()
const authStore = useAuthStore()

// Bootstrap stores on app load
authStore.init()
nastaveniStore.loadSettings()
stavbyStore.loadProjects()

const activeTab = ref('stavby')

watch(
  () => route.path,
  (path) => {
    if (path.startsWith('/stavby') || path.startsWith('/stavba')) {
      activeTab.value = 'stavby'
    } else if (path.startsWith('/kalendar')) {
      activeTab.value = 'kalendar'
    } else if (path.startsWith('/nastaveni')) {
      activeTab.value = 'nastaveni'
    }
  },
  { immediate: true },
)

function navigateTo(tab: string) {
  if (tab === 'stavby') router.push('/stavby')
  else if (tab === 'kalendar') router.push('/kalendar')
  else if (tab === 'nastaveni') router.push('/nastaveni')
}
</script>

<style scoped lang="scss">
.nav-footer {
  border-top: 1px solid #EEEEEE;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
}

.nav-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-height: 56px;
  padding: 8px 0;
}

.nav-label {
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
}
</style>
