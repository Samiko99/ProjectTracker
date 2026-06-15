<template>
  <q-page class="stavby-page">
    <div class="page-header">
      <h1 class="page-title">{{ t('jobs.title') }}</h1>
      <q-btn round unelevated color="primary" icon="add" size="md" @click="openAddDialog" />
    </div>

    <div v-if="stavbyStore.loading" class="flex flex-center q-pa-xl">
      <q-spinner size="lg" color="primary" />
    </div>

    <div v-else-if="stavbyStore.projects.length === 0" class="empty-state">
      <q-icon name="business" size="72px" color="grey-3" />
      <div class="text-h6 text-grey-5 q-mt-md">{{ t('jobs.empty') }}</div>
      <div class="text-caption text-grey-4 q-mt-xs q-mb-md">{{ t('jobs.emptyHint') }}</div>
      <q-btn unelevated color="primary" :label="t('jobs.add')" icon="add" @click="openAddDialog" />
    </div>

    <div v-else class="projects-list q-pa-md">
      <!-- Aktivní zakázky -->
      <stavba-karta
        v-for="project in activeProjects"
        :key="project.id"
        :project="project"
        @click="goToDetail(project.id)"
        @edit="editProject(project)"
        @delete="confirmDelete(project)"
        @close="closeProject(project)"
      />

      <!-- Oddělovač hotových zakázek -->
      <div v-if="completedProjects.length" class="completed-divider">
        <q-icon name="check_circle" size="16px" color="grey-5" />
        <span>{{ t('jobs.completedSection') }}</span>
        <span class="completed-count">{{ completedProjects.length }}</span>
      </div>

      <!-- Hotové zakázky -->
      <stavba-karta
        v-for="project in completedProjects"
        :key="project.id"
        :project="project"
        closed
        @click="goToDetail(project.id)"
        @edit="editProject(project)"
        @delete="confirmDelete(project)"
        @reopen="reopenProject(project)"
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useStavbyStore } from '../stores/stavby'
import { useZaznamyStore } from '../stores/zaznamy'
import StavbaKarta from '../components/StavbaKarta.vue'
import PridatStavbuDialog from '../components/PridatStavbuDialog.vue'
import type { Project } from '../db/dexie'
import { t } from '../i18n'

const router = useRouter()
const $q = useQuasar()
const stavbyStore = useStavbyStore()
const zaznamyStore = useZaznamyStore()

const showAddDialog = ref(false)
const editingProject = ref<Project | null>(null)

const activeProjects = computed(() =>
  stavbyStore.projects.filter((p) => !p.closedAt),
)
const completedProjects = computed(() =>
  stavbyStore.projects.filter((p) => !!p.closedAt),
)

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
  $q.notify({ type: 'positive', message: wasEditing ? t('jobs.updated') : t('jobs.added') })
}

async function confirmDelete(project: Project) {
  $q.dialog({
    title: t('jobs.deleteTitle'),
    message: t('jobs.deleteMsg', { name: project.name }),
    cancel: { label: t('common.cancel'), flat: true },
    ok: { label: t('common.delete'), color: 'negative', unelevated: true },
  }).onOk(async () => {
    await stavbyStore.deleteProject(project.id)
    $q.notify({ type: 'positive', message: t('jobs.deleted') })
  })
}

async function closeProject(project: Project) {
  await stavbyStore.closeProject(project.id)
  $q.notify({ type: 'positive', message: t('jobs.closed') })
}

async function reopenProject(project: Project) {
  await stavbyStore.reopenProject(project.id)
  $q.notify({ type: 'positive', message: t('jobs.reopened') })
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

.completed-divider {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 14px 2px 4px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: #9e9e9e;

  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e0e0e0;
    margin-left: 4px;
  }

  .completed-count {
    background: #eeeeee;
    color: #757575;
    border-radius: 10px;
    padding: 0 7px;
    font-size: 11px;
    line-height: 18px;
  }
}
</style>
