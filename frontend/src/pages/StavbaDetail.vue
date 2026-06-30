<template>
  <q-page class="detail-page">
    <!-- Header -->
    <div class="detail-header" :style="{ borderBottom: `3px solid ${project?.color ?? '#E65100'}` }">
      <div class="header-row">
        <q-btn flat round dense icon="arrow_back" color="grey-8" class="header-back" @click="router.back()" />
        <div class="header-main">
          <h1 class="detail-title">{{ project?.name ?? '...' }}</h1>
          <div v-if="project?.address" class="detail-address">
            <q-icon name="location_on" size="13px" />
            {{ project.address }}
          </div>
          <div v-if="project?.notes" class="detail-note">{{ project.notes }}</div>
        </div>
        <q-btn flat round dense icon="more_vert" color="grey-8" class="header-kebab">
          <q-menu anchor="bottom right" self="top right">
            <q-list dense style="min-width: 220px">
              <q-item clickable v-close-popup @click="editProject">
                <q-item-section avatar><q-icon name="edit" size="18px" /></q-item-section>
                <q-item-section>{{ t('jobMenu.editDetails') }}</q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="markAllPaid">
                <q-item-section avatar><q-icon name="done_all" size="18px" color="positive" /></q-item-section>
                <q-item-section>{{ t('jobMenu.markAllPaid') }}</q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="exportExcel">
                <q-item-section avatar><q-icon name="grid_on" size="18px" color="green-8" /></q-item-section>
                <q-item-section>{{ t('jobMenu.exportExcel') }}</q-item-section>
              </q-item>
              <q-separator spaced />
              <q-item v-if="!project?.closedAt" clickable v-close-popup @click="closeJob">
                <q-item-section avatar><q-icon name="check_circle" size="18px" color="primary" /></q-item-section>
                <q-item-section>{{ t('jobMenu.close') }}</q-item-section>
              </q-item>
              <q-item v-else clickable v-close-popup @click="reopenJob">
                <q-item-section avatar><q-icon name="undo" size="18px" color="primary" /></q-item-section>
                <q-item-section>{{ t('jobMenu.reopen') }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>
    </div>

    <!-- Souhrn hodin -->
    <div class="q-pa-md">
      <hodiny-souhrn
        :project-id="projectId"
        :title="t('summary.title')"
        :show-earnings="true"
      />

      <!-- Přepínač záložek -->
      <div class="section-tabs q-mb-sm">
        <q-btn-toggle
          v-model="activeSection"
          toggle-color="primary"
          flat
          no-caps
          :options="[
            { label: `${t('detail.tabHours')} (${groupedWorkEntries.length})`, value: 'hodiny' },
            { label: `${t('detail.tabMaterial')} (${materialEntries.length})`, value: 'material' },
          ]"
        />
      </div>

      <!-- Záznamy hodin -->
      <div v-if="activeSection === 'hodiny'" class="app-card q-pa-md">
        <div v-if="workEntries.length === 0" class="empty-state" style="padding: 32px 0">
          <q-icon name="schedule" size="40px" color="grey-3" />
          <div class="text-caption text-grey-4 q-mt-sm">{{ t('detail.noHours') }}</div>
        </div>
        <div v-else>
          <zaznam-radek
            v-for="group in groupedWorkEntries"
            :key="group[0].id"
            :entries="group"
            @edit="openEditHodiny(group)"
            @delete="confirmDeleteEntry(group)"
          />
        </div>
      </div>

      <!-- Záznamy materiálu -->
      <div v-if="activeSection === 'material'" class="app-card q-pa-md">
        <div v-if="materialEntries.length === 0" class="empty-state" style="padding: 32px 0">
          <q-icon name="inventory_2" size="40px" color="grey-3" />
          <div class="text-caption text-grey-4 q-mt-sm">{{ t('detail.noMaterial') }}</div>
        </div>
        <div v-else>
          <material-radek
            v-for="entry in materialEntries"
            :key="entry.id"
            :entry="entry"
            @edit="openEditMaterial(entry)"
            @delete="confirmDeleteMaterial(entry)"
          />
        </div>
      </div>
    </div>

    <!-- FAB – přidat záznam -->
    <q-page-sticky position="bottom-right" :offset="[16, 36]">
      <q-fab
        v-model="fabOpen"
        color="primary"
        icon="add"
        direction="up"
        vertical-actions-align="right"
        unelevated
      >
        <q-fab-action
          color="primary"
          icon="schedule"
          :label="t('detail.addHours')"
          label-position="left"
          @click="openAddHodiny"
        />
        <q-fab-action
          color="secondary"
          icon="inventory_2"
          :label="t('detail.addMaterial')"
          label-position="left"
          @click="openAddMaterial"
        />
      </q-fab>
    </q-page-sticky>

    <!-- Dialogy -->
    <pridat-stavbu-dialog
      v-model="showEditProject"
      :project="project ?? undefined"
      @saved="onProjectSaved"
    />

    <pridat-hodiny-dialog
      v-model="showHodinyDialog"
      :project-id="projectId"
      :entries="editingEntries"
      @saved="onHodinySaved"
    />

    <pridat-material-dialog
      v-model="showMaterialDialog"
      :project-id="projectId"
      :entry="editingMaterial"
      @saved="onMaterialSaved"
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineComponent, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useStavbyStore } from '../stores/stavby'
import { useZaznamyStore } from '../stores/zaznamy'
import { useNastaveniStore } from '../stores/nastaveni'
import HodinySouhrn from '../components/HodinySouhrn.vue'
import ZaznamRadek from '../components/ZaznamRadek.vue'
import PridatStavbuDialog from '../components/PridatStavbuDialog.vue'
import PridatHodinyDialog from '../components/PridatHodinyDialog.vue'
import PridatMaterialDialog from '../components/PridatMaterialDialog.vue'
import type { WorkEntry, MaterialEntry } from '../db/dexie'
import { format, parseISO } from 'date-fns'
import { t, dateFnsLocale } from '../i18n'
import { exportJobToExcel } from '../utils/export'

// Inline material row component
const MaterialRadek = defineComponent({
  props: {
    entry: { type: Object as () => MaterialEntry, required: true },
  },
  emits: ['edit', 'delete'],
  setup(props, { emit }) {
    const nastaveniStore = useNastaveniStore()
    const formatDate = (d: string) => {
      try { return format(parseISO(d), 'd. M. yyyy', { locale: dateFnsLocale() }) } catch { return d }
    }
    const formatPrice = (p: number) =>
      new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(p)
    return () =>
      h('div', { class: 'material-radek' }, [
        h('div', { class: 'mat-icon-wrap' }, [h('q-icon', { name: 'inventory_2', color: 'secondary', size: '18px' })]),
        h('div', { class: 'mat-content' }, [
          h('div', { class: 'mat-top' }, [
            h('span', { class: 'mat-date' }, formatDate(props.entry.date)),
            h('q-space'),
            props.entry.amount > 0 ? h('span', { class: 'mat-amount' }, formatPrice(props.entry.amount)) : null,
          ]),
          h('div', { class: 'mat-desc' }, props.entry.description),
          props.entry.paidById
            ? h('div', { class: 'mat-paid-by' }, t('detail.paidBy', { name: nastaveniStore.getCollaboratorName(props.entry.paidById) }))
            : null,
          props.entry.notes ? h('div', { class: 'mat-notes' }, props.entry.notes) : null,
        ]),
        h('q-btn', { flat: true, round: true, dense: true, icon: 'more_vert', color: 'grey-4', size: 'xs' }, {
          default: () => h('q-menu', {}, {
            default: () => h('q-list', { dense: true, style: 'min-width: 130px' }, [
              h('q-item', { clickable: true, 'v-close-popup': true, onClick: () => emit('edit', props.entry) }, [
                h('q-item-section', { avatar: true }, [h('q-icon', { name: 'edit', size: '16px' })]),
                h('q-item-section', {}, t('common.edit')),
              ]),
              h('q-item', { clickable: true, 'v-close-popup': true, class: 'text-negative', onClick: () => emit('delete', props.entry) }, [
                h('q-item-section', { avatar: true }, [h('q-icon', { name: 'delete', size: '16px', color: 'negative' })]),
                h('q-item-section', {}, t('common.delete')),
              ]),
            ]),
          }),
        }),
      ])
  },
})

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const stavbyStore = useStavbyStore()
const zaznamyStore = useZaznamyStore()
const nastaveniStore = useNastaveniStore()

const projectId = route.params.id as string
const project = computed(() => stavbyStore.getProjectById(projectId))
const workEntries = computed(() =>
  zaznamyStore.workEntries.filter((e) => e.projectId === projectId),
)
const materialEntries = computed(() => zaznamyStore.materialEntries)

// Sloučení záznamů stejné práce (stejný den/čas/hodiny/poznámka/typ) více
// pracovníků do jednoho řádku — jen se zobrazí všichni pracovníci.
const groupedWorkEntries = computed(() => {
  const groups = new Map<string, WorkEntry[]>()
  for (const e of workEntries.value) {
    const key = [e.date, e.startTime || '', e.endTime || '', e.hours, e.notes || '', e.workTypeId || ''].join('|')
    const arr = groups.get(key)
    if (arr) arr.push(e)
    else groups.set(key, [e])
  }
  return Array.from(groups.values())
})

const activeSection = ref<'hodiny' | 'material'>('hodiny')
const fabOpen = ref(false)

const showEditProject = ref(false)
const showHodinyDialog = ref(false)
const showMaterialDialog = ref(false)
const editingEntries = ref<WorkEntry[] | null>(null)
const editingMaterial = ref<MaterialEntry | null>(null)

onMounted(async () => {
  await stavbyStore.loadProjects()
  await zaznamyStore.loadEntriesForProject(projectId)
})

function editProject() {
  showEditProject.value = true
}

function markAllPaid() {
  $q.dialog({
    title: t('jobMenu.markAllPaidTitle'),
    message: t('jobMenu.markAllPaidMsg'),
    cancel: { flat: true, label: t('common.cancel') },
    ok: { color: 'positive', unelevated: true, label: t('common.save') },
  }).onOk(async () => {
    await zaznamyStore.markAllPaidForProject(projectId)
    $q.notify({ type: 'positive', message: t('jobs.allMarkedPaid') })
  })
}

function closeJob() {
  $q.dialog({
    title: t('jobMenu.closeTitle'),
    message: t('jobMenu.closeMsg'),
    cancel: { flat: true, label: t('common.cancel') },
    ok: { color: 'primary', unelevated: true, label: t('jobMenu.close') },
  }).onOk(async () => {
    await stavbyStore.closeProject(projectId)
    $q.notify({ type: 'positive', message: t('jobs.closed') })
    router.back()
  })
}

async function reopenJob() {
  await stavbyStore.reopenProject(projectId)
  $q.notify({ type: 'positive', message: t('jobs.reopened') })
}

function exportExcel() {
  if (!project.value) return
  exportJobToExcel({
    project: project.value,
    workEntries: workEntries.value,
    materialEntries: materialEntries.value,
    collabName: (id) => nastaveniStore.getCollaboratorName(id),
    workTypeName: (id) => nastaveniStore.getWorkTypeName(id),
  })
  $q.notify({ type: 'positive', message: t('export.done') })
}

function openAddHodiny() {
  fabOpen.value = false
  editingEntries.value = null
  showHodinyDialog.value = true
}

function openEditHodiny(group: WorkEntry[]) {
  editingEntries.value = group
  showHodinyDialog.value = true
}

function openAddMaterial() {
  fabOpen.value = false
  editingMaterial.value = null
  showMaterialDialog.value = true
}

function openEditMaterial(entry: MaterialEntry) {
  editingMaterial.value = entry
  showMaterialDialog.value = true
}

function onProjectSaved() {
  showEditProject.value = false
  $q.notify({ type: 'positive', message: t('jobs.updated') })
}

function onHodinySaved() {
  showHodinyDialog.value = false
  editingEntries.value = null
}

function onMaterialSaved() {
  showMaterialDialog.value = false
  editingMaterial.value = null
}

async function confirmDeleteEntry(group: WorkEntry[]) {
  $q.dialog({
    title: t('detail.deleteEntryTitle'),
    message: t('detail.deleteEntryMsg'),
    cancel: { label: t('common.cancel'), flat: true },
    ok: { label: t('common.delete'), color: 'negative', unelevated: true },
  }).onOk(async () => {
    for (const e of group) await zaznamyStore.deleteWorkEntry(e.id)
  })
}

async function confirmDeleteMaterial(entry: MaterialEntry) {
  $q.dialog({
    title: t('detail.deleteEntryTitle'),
    message: t('detail.deleteEntryMsg'),
    cancel: { label: t('common.cancel'), flat: true },
    ok: { label: t('common.delete'), color: 'negative', unelevated: true },
  }).onOk(async () => {
    await zaznamyStore.deleteMaterialEntry(entry.id)
  })
}
</script>

<style scoped lang="scss">
.detail-page {
  min-height: 100vh;
  background: #F5F5F5;
}

.detail-header {
  background: white;
  padding: 8px 10px 12px;
}

.header-row {
  display: flex;
  align-items: flex-start;
  gap: 2px;
}

.header-back,
.header-kebab {
  flex-shrink: 0;
  margin-top: 2px;
}

.header-main {
  flex: 1;
  min-width: 0;
  padding-top: 3px;
}

.detail-title {
  font-size: 21px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0;
  line-height: 1.2;
  word-break: break-word;
}

.detail-address {
  font-size: 13px;
  color: #757575;
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 3px;
}

.detail-note {
  font-size: 13px;
  color: #616161;
  margin-top: 3px;
  white-space: pre-wrap;
}

.section-tabs {
  margin-bottom: 8px;
}
</style>

<style lang="scss">
/* Global styles for inline MaterialRadek */
.material-radek {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 0;

  & + .material-radek {
    border-top: 1px solid #F5F5F5;
  }

  .mat-icon-wrap {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: #E3F2FD;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .mat-content {
    flex: 1;
    min-width: 0;
  }

  .mat-top {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .mat-date {
    font-size: 12px;
    color: #757575;
  }

  .mat-amount {
    font-size: 14px;
    font-weight: 700;
    color: #1565C0;
  }

  .mat-desc {
    font-size: 14px;
    font-weight: 600;
    color: #212121;
    margin-top: 2px;
  }

  .mat-paid-by {
    font-size: 12px;
    color: #757575;
    margin-top: 2px;
  }

  .mat-notes {
    font-size: 12px;
    color: #9E9E9E;
    font-style: italic;
    margin-top: 2px;
  }
}
</style>
