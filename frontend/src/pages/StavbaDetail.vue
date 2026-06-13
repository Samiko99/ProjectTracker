<template>
  <q-page class="detail-page">
    <!-- Header -->
    <div class="detail-header" :style="{ borderBottom: `3px solid ${project?.color ?? '#E65100'}` }">
      <div class="header-top">
        <q-btn flat round dense icon="arrow_back" color="grey-7" @click="router.back()" />
        <div class="header-title-area">
          <h1 class="detail-title">{{ project?.name ?? '...' }}</h1>
          <div v-if="project?.address" class="detail-address">
            <q-icon name="location_on" size="13px" />
            {{ project.address }}
          </div>
        </div>
        <q-btn flat round dense icon="edit" color="grey-6" @click="editProject" />
      </div>
    </div>

    <!-- Souhrn hodin -->
    <div class="q-pa-md">
      <hodiny-souhrn
        :project-id="projectId"
        title="Přehled hodin"
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
            { label: `Hodiny (${workEntries.length})`, value: 'hodiny' },
            { label: `Materiál (${materialEntries.length})`, value: 'material' },
          ]"
        />
      </div>

      <!-- Záznamy hodin -->
      <div v-if="activeSection === 'hodiny'" class="app-card q-pa-md">
        <div v-if="workEntries.length === 0" class="empty-state" style="padding: 32px 0">
          <q-icon name="schedule" size="40px" color="grey-3" />
          <div class="text-caption text-grey-4 q-mt-sm">Zatím žádné záznamy</div>
        </div>
        <div v-else>
          <zaznam-radek
            v-for="entry in workEntries"
            :key="entry.id"
            :entry="entry"
            @edit="openEditHodiny(entry)"
            @delete="confirmDeleteEntry(entry)"
          />
        </div>
      </div>

      <!-- Záznamy materiálu -->
      <div v-if="activeSection === 'material'" class="app-card q-pa-md">
        <div v-if="materialEntries.length === 0" class="empty-state" style="padding: 32px 0">
          <q-icon name="inventory_2" size="40px" color="grey-3" />
          <div class="text-caption text-grey-4 q-mt-sm">Zatím žádný materiál</div>
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
    <q-page-sticky position="bottom-right" :offset="[20, 84]">
      <q-fab
        v-model="fabOpen"
        color="primary"
        icon="add"
        direction="up"
        unelevated
      >
        <q-fab-action
          color="primary"
          icon="schedule"
          label="Přidat hodiny"
          label-position="left"
          @click="openAddHodiny"
        />
        <q-fab-action
          color="secondary"
          icon="inventory_2"
          label="Přidat materiál"
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
      :entry="editingEntry"
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
import { cs } from 'date-fns/locale'

// Inline material row component
const MaterialRadek = defineComponent({
  props: {
    entry: { type: Object as () => MaterialEntry, required: true },
  },
  emits: ['edit', 'delete'],
  setup(props, { emit }) {
    const nastaveniStore = useNastaveniStore()
    const formatDate = (d: string) => {
      try { return format(parseISO(d), 'd. M. yyyy', { locale: cs }) } catch { return d }
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
            ? h('div', { class: 'mat-paid-by' }, `Platil: ${nastaveniStore.getCollaboratorName(props.entry.paidById)}`)
            : null,
          props.entry.notes ? h('div', { class: 'mat-notes' }, props.entry.notes) : null,
        ]),
        h('q-btn', { flat: true, round: true, dense: true, icon: 'more_vert', color: 'grey-4', size: 'xs' }, {
          default: () => h('q-menu', {}, {
            default: () => h('q-list', { dense: true, style: 'min-width: 130px' }, [
              h('q-item', { clickable: true, 'v-close-popup': true, onClick: () => emit('edit', props.entry) }, [
                h('q-item-section', { avatar: true }, [h('q-icon', { name: 'edit', size: '16px' })]),
                h('q-item-section', {}, 'Upravit'),
              ]),
              h('q-item', { clickable: true, 'v-close-popup': true, class: 'text-negative', onClick: () => emit('delete', props.entry) }, [
                h('q-item-section', { avatar: true }, [h('q-icon', { name: 'delete', size: '16px', color: 'negative' })]),
                h('q-item-section', {}, 'Smazat'),
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

const projectId = route.params.id as string
const project = computed(() => stavbyStore.getProjectById(projectId))
const workEntries = computed(() => zaznamyStore.workEntries)
const materialEntries = computed(() => zaznamyStore.materialEntries)

const activeSection = ref<'hodiny' | 'material'>('hodiny')
const fabOpen = ref(false)

const showEditProject = ref(false)
const showHodinyDialog = ref(false)
const showMaterialDialog = ref(false)
const editingEntry = ref<WorkEntry | null>(null)
const editingMaterial = ref<MaterialEntry | null>(null)

onMounted(async () => {
  await stavbyStore.loadProjects()
  await zaznamyStore.loadEntriesForProject(projectId)
})

function editProject() {
  showEditProject.value = true
}

function openAddHodiny() {
  fabOpen.value = false
  editingEntry.value = null
  showHodinyDialog.value = true
}

function openEditHodiny(entry: WorkEntry) {
  editingEntry.value = entry
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
  $q.notify({ type: 'positive', message: 'Stavba upravena' })
}

function onHodinySaved() {
  showHodinyDialog.value = false
  editingEntry.value = null
}

function onMaterialSaved() {
  showMaterialDialog.value = false
  editingMaterial.value = null
}

async function confirmDeleteEntry(entry: WorkEntry) {
  $q.dialog({
    title: 'Smazat záznam',
    message: 'Opravdu smazat tento záznam?',
    cancel: { label: 'Zrušit', flat: true },
    ok: { label: 'Smazat', color: 'negative', unelevated: true },
  }).onOk(async () => {
    await zaznamyStore.deleteWorkEntry(entry.id)
  })
}

async function confirmDeleteMaterial(entry: MaterialEntry) {
  $q.dialog({
    title: 'Smazat materiál',
    message: 'Opravdu smazat tento záznam?',
    cancel: { label: 'Zrušit', flat: true },
    ok: { label: 'Smazat', color: 'negative', unelevated: true },
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
  padding: 8px 16px 14px;
}

.header-top {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.header-title-area {
  flex: 1;
  min-width: 0;
  padding-top: 4px;
}

.detail-title {
  font-size: 20px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.detail-address {
  font-size: 12px;
  color: #757575;
  display: flex;
  align-items: center;
  gap: 2px;
  margin-top: 2px;
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
