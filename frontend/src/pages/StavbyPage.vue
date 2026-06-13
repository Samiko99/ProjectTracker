<template>
  <q-page class="stavby-page">
    <div class="page-header">
      <h1 class="page-title">Stavby</h1>
      <q-btn round unelevated color="primary" icon="add" size="md" @click="openAddDialog" />
    </div>

    <div v-if="stavbyStore.loading" class="flex flex-center q-pa-xl">
      <q-spinner size="lg" color="primary" />
    </div>

    <div v-else-if="stavbyStore.projects.length === 0" class="empty-state">
      <q-icon name="business" size="72px" color="grey-3" />
      <div class="text-h6 text-grey-5 q-mt-md">Zatím žádné stavby</div>
      <div class="text-caption text-grey-4 q-mt-xs q-mb-md">Přidejte svou první stavbu</div>
      <q-btn unelevated color="primary" label="Přidat stavbu" icon="add" @click="openAddDialog" />
    </div>

    <div v-else class="projects-list q-pa-md">
      <stavba-karta
        v-for="project in stavbyStore.projects"
        :key="project.id"
        :project="project"
        @click="goToDetail(project.id)"
        @edit="editProject(project)"
        @delete="confirmDelete(project)"
      />
    </div>

    <pridat-stavbu-dialog
      v-model="showAddDialog"
      :project="editingProject"
      @saved="onSaved"
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useStavbyStore } from '../stores/stavby'
import { useZaznamyStore } from '../stores/zaznamy'
import StavbaKarta from '../components/StavbaKarta.vue'
import PridatStavbuDialog from '../components/PridatStavbuDialog.vue'
import type { Project } from '../db/dexie'

const router = useRouter()
const $q = useQuasar()
const stavbyStore = useStavbyStore()
const zaznamyStore = useZaznamyStore()

const showAddDialog = ref(false)
const editingProject = ref<Project | null>(null)

onMounted(async () => {
  await stavbyStore.loadProjects()
  await zaznamyStore.loadAllEntries()
})

function openAddDialog() {
  editingProject.value = null
  showAddDialog.value = true
}

function editProject(project: Project) {
  editingProject.value = project
  showAddDialog.value = true
}

function goToDetail(id: string) {
  router.push(`/stavba/${id}`)
}

function onSaved() {
  const wasEditing = !!editingProject.value
  showAddDialog.value = false
  editingProject.value = null
  stavbyStore.loadProjects()
  $q.notify({ type: 'positive', message: wasEditing ? 'Stavba upravena' : 'Stavba přidána' })
}

async function confirmDelete(project: Project) {
  $q.dialog({
    title: 'Smazat stavbu',
    message: `Opravdu chcete smazat stavbu "${project.name}"?`,
    cancel: { label: 'Zrušit', flat: true },
    ok: { label: 'Smazat', color: 'negative', unelevated: true },
  }).onOk(async () => {
    await stavbyStore.deleteProject(project.id)
    $q.notify({ type: 'positive', message: 'Stavba smazána' })
  })
}
</script>

<style scoped lang="scss">
.stavby-page {
  min-height: 100vh;
}

.projects-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
