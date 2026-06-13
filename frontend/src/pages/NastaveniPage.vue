<template>
  <q-page class="nastaveni-page">
    <div class="page-header">
      <h1 class="page-title">Nastavení</h1>
    </div>

    <div class="q-pa-md">
      <!-- Účet a synchronizace -->
      <div class="section-card app-card q-mb-md">
        <div class="section-head">
          <div>
            <div class="section-name">Synchronizace</div>
            <div class="section-sub">Záloha a sdílení dat přes server</div>
          </div>
          <q-icon
            :name="authStore.isAuthenticated ? 'cloud_done' : 'cloud_off'"
            :color="authStore.isAuthenticated ? 'positive' : 'grey-4'"
            size="24px"
          />
        </div>

        <q-separator class="q-my-sm" />

        <!-- Nepřihlášen -->
        <div v-if="!authStore.isAuthenticated">
          <div class="text-caption text-grey-6 q-mb-sm">
            Aplikace funguje i offline. Přihlas se pro zálohu dat na server a synchronizaci mezi zařízeními.
          </div>
          <q-btn
            unelevated
            color="primary"
            label="Přihlásit se / Registrace"
            icon="login"
            class="full-width"
            @click="showLoginDialog = true"
          />

          <q-expansion-item
            dense
            dense-toggle
            label="Adresa serveru"
            header-class="text-grey-6 text-caption q-px-none q-mt-sm"
            class="server-config"
          >
            <q-input
              v-model="apiUrl"
              outlined
              dense
              label="API URL"
              hint="Např. https://tvuj-server.cz/api"
              class="q-mt-xs"
            >
              <template #append>
                <q-btn flat dense round icon="save" color="primary" @click="saveApiUrl" />
              </template>
            </q-input>
          </q-expansion-item>
        </div>

        <!-- Přihlášen -->
        <div v-else>
          <div class="account-row">
            <q-avatar color="primary" text-color="white" size="38px" font-size="16px">
              {{ authStore.user?.name?.charAt(0).toUpperCase() }}
            </q-avatar>
            <div class="account-info">
              <div class="account-name">{{ authStore.user?.name }}</div>
              <div class="account-email">{{ authStore.user?.email }}</div>
            </div>
            <q-btn flat round dense icon="logout" color="grey-6" @click="doLogout">
              <q-tooltip>Odhlásit</q-tooltip>
            </q-btn>
          </div>

          <div class="sync-status q-mt-sm">
            <q-icon name="schedule" size="14px" color="grey-5" />
            <span>Naposledy: {{ lastSyncLabel }}</span>
          </div>

          <div class="row q-gutter-sm q-mt-sm">
            <q-btn
              unelevated
              color="primary"
              icon="sync"
              label="Synchronizovat"
              :loading="syncStore.syncing"
              class="col"
              @click="doSync"
            />
            <q-btn
              outline
              color="primary"
              icon="backup"
              label="Zálohy"
              @click="openBackups"
            />
          </div>
        </div>
      </div>

      <!-- Spolupracovníci -->
      <div class="section-card app-card">
        <div class="section-head">
          <div>
            <div class="section-name">Spolupracovníci</div>
            <div class="section-sub">Osoby přidávané k záznamům</div>
          </div>
          <q-btn flat round dense icon="add" color="primary" @click="openAddCollab" />
        </div>

        <q-separator class="q-my-sm" />

        <div v-if="nastaveniStore.collaborators.length === 0" class="empty-inline">
          <q-icon name="person_add" size="28px" color="grey-3" />
          <span class="text-caption text-grey-4 q-ml-sm">Zatím žádní spolupracovníci</span>
        </div>

        <q-list dense>
          <q-item
            v-for="collab in nastaveniStore.collaborators"
            :key="collab.id"
            class="collab-item"
          >
            <q-item-section avatar>
              <q-avatar color="primary" text-color="white" size="32px" font-size="14px">
                {{ collab.name.charAt(0).toUpperCase() }}
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ collab.name }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <div class="row gap-xs">
                <q-btn flat round dense icon="edit" size="xs" color="grey-5" @click="editCollab(collab)" />
                <q-btn flat round dense icon="delete" size="xs" color="negative" @click="deleteCollab(collab)" />
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <!-- Typy práce -->
      <div class="section-card app-card q-mt-md">
        <div class="section-head">
          <div>
            <div class="section-name">Typy práce</div>
            <div class="section-sub">S hodinovou sazbou v Kč</div>
          </div>
          <q-btn flat round dense icon="add" color="secondary" @click="openAddWorkType" />
        </div>

        <q-separator class="q-my-sm" />

        <div v-if="nastaveniStore.workTypes.length === 0" class="empty-inline">
          <q-icon name="work_outline" size="28px" color="grey-3" />
          <span class="text-caption text-grey-4 q-ml-sm">Zatím žádné typy práce</span>
        </div>

        <q-list dense>
          <q-item
            v-for="wt in nastaveniStore.workTypes"
            :key="wt.id"
            class="collab-item"
          >
            <q-item-section avatar>
              <q-avatar color="secondary" text-color="white" size="32px">
                <q-icon name="build" size="16px" />
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ wt.name }}</q-item-label>
              <q-item-label caption>{{ formatPrice(wt.hourlyRate) }}/hod</q-item-label>
            </q-item-section>
            <q-item-section side>
              <div class="row gap-xs">
                <q-btn flat round dense icon="edit" size="xs" color="grey-5" @click="editWorkType(wt)" />
                <q-btn flat round dense icon="delete" size="xs" color="negative" @click="deleteWorkType(wt)" />
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <!-- Info -->
      <div class="app-version q-mt-lg text-center text-caption text-grey-4">
        Stavební Deník v0.1.0
      </div>
    </div>

    <!-- Dialog – Spolupracovník -->
    <q-dialog v-model="showCollabDialog" position="bottom" class="bottom-sheet-dialog">
      <q-card class="dialog-card">
        <div class="drag-handle" />
        <div class="q-px-md q-py-sm text-subtitle1 text-weight-bold">
          {{ editingCollab ? 'Upravit spolupracovníka' : 'Nový spolupracovník' }}
        </div>
        <q-separator />
        <div class="q-pa-md">
          <q-input
            v-model="collabForm.name"
            label="Jméno *"
            outlined
            dense
            autofocus
            @keyup.enter="saveCollab"
          />
        </div>
        <q-separator />
        <div class="q-pa-md row gap-sm justify-end">
          <q-btn flat label="Zrušit" @click="showCollabDialog = false" />
          <q-btn unelevated color="primary" :label="editingCollab ? 'Uložit' : 'Přidat'" :loading="saving" @click="saveCollab" />
        </div>
      </q-card>
    </q-dialog>

    <!-- Dialog – Typ práce -->
    <q-dialog v-model="showWorkTypeDialog" position="bottom" class="bottom-sheet-dialog">
      <q-card class="dialog-card">
        <div class="drag-handle" />
        <div class="q-px-md q-py-sm text-subtitle1 text-weight-bold">
          {{ editingWorkType ? 'Upravit typ práce' : 'Nový typ práce' }}
        </div>
        <q-separator />
        <div class="q-pa-md">
          <q-input
            v-model="workTypeForm.name"
            label="Název *"
            outlined
            dense
            class="q-mb-sm"
            placeholder="Např. Elektromontáž, Projektování…"
          />
          <q-input
            v-model.number="workTypeForm.hourlyRate"
            label="Hodinová sazba (Kč)"
            outlined
            dense
            type="number"
            min="0"
            suffix="Kč/hod"
          />
        </div>
        <q-separator />
        <div class="q-pa-md row gap-sm justify-end">
          <q-btn flat label="Zrušit" @click="showWorkTypeDialog = false" />
          <q-btn unelevated color="secondary" :label="editingWorkType ? 'Uložit' : 'Přidat'" :loading="saving" @click="saveWorkType" />
        </div>
      </q-card>
    </q-dialog>

    <!-- Dialog – Přihlášení / Registrace -->
    <prihlaseni-dialog v-model="showLoginDialog" @logged-in="onLoggedIn" />

    <!-- Dialog – Zálohy -->
    <q-dialog v-model="showBackupsDialog" position="bottom" class="bottom-sheet-dialog">
      <q-card class="dialog-card">
        <div class="drag-handle" />
        <div class="q-px-md q-py-sm">
          <div class="text-subtitle1 text-weight-bold">Zálohy na serveru</div>
          <div class="text-caption text-grey-6">Drží se posledních 5 záloh</div>
        </div>
        <q-separator />
        <div class="q-pa-md">
          <q-btn
            unelevated
            color="primary"
            icon="add"
            label="Vytvořit zálohu"
            class="full-width q-mb-md"
            :loading="backupBusy"
            @click="doCreateBackup"
          />

          <div v-if="backups.length === 0" class="empty-inline">
            <q-icon name="inventory_2" size="24px" color="grey-3" />
            <span class="text-caption text-grey-4 q-ml-sm">Zatím žádné zálohy</span>
          </div>

          <q-list separator>
            <q-item v-for="b in backups" :key="b.id">
              <q-item-section avatar>
                <q-icon name="backup" color="primary" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ formatDateTime(b.createdAt) }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn
                  flat
                  dense
                  no-caps
                  color="primary"
                  label="Obnovit"
                  @click="doRestore(b.id)"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useNastaveniStore } from '../stores/nastaveni'
import { useAuthStore } from '../stores/auth'
import { useSyncStore } from '../stores/sync'
import { getApiBaseUrl, setApiBaseUrl } from '../api/client'
import PrihlaseniDialog from '../components/PrihlaseniDialog.vue'
import type { Collaborator, WorkType } from '../db/dexie'
import { format, parseISO } from 'date-fns'
import { cs } from 'date-fns/locale'

const $q = useQuasar()
const nastaveniStore = useNastaveniStore()
const authStore = useAuthStore()
const syncStore = useSyncStore()

const saving = ref(false)

// --- Účet a synchronizace ---
const showLoginDialog = ref(false)
const showBackupsDialog = ref(false)
const backups = ref<{ id: string; createdAt: string }[]>([])
const backupBusy = ref(false)
const apiUrl = ref(getApiBaseUrl())

const lastSyncLabel = computed(() =>
  syncStore.lastSyncAt ? formatDateTime(syncStore.lastSyncAt) : 'nikdy',
)

function formatDateTime(iso: string) {
  try {
    return format(parseISO(iso), 'd. M. yyyy HH:mm', { locale: cs })
  } catch {
    return iso
  }
}

function saveApiUrl() {
  setApiBaseUrl(apiUrl.value.trim())
  apiUrl.value = getApiBaseUrl()
  $q.notify({ type: 'positive', message: 'Adresa serveru uložena' })
}

async function doSync() {
  try {
    const res = await syncStore.syncNow()
    $q.notify({
      type: 'positive',
      message: `Synchronizováno (odesláno ${res.pushed}, přijato ${res.pulled})`,
    })
  } catch (e) {
    $q.notify({ type: 'negative', message: (e as Error).message })
  }
}

function onLoggedIn() {
  // Po přihlášení rovnou synchronizuj
  doSync()
}

function doLogout() {
  $q.dialog({
    title: 'Odhlásit se',
    message: 'Lokální data zůstanou v zařízení. Opravdu se odhlásit?',
    cancel: { flat: true, label: 'Zrušit' },
    ok: { color: 'negative', unelevated: true, label: 'Odhlásit' },
  }).onOk(async () => {
    await authStore.logout()
    syncStore.resetSyncState()
    $q.notify({ type: 'positive', message: 'Odhlášeno' })
  })
}

async function openBackups() {
  showBackupsDialog.value = true
  try {
    backups.value = await syncStore.listBackups()
  } catch (e) {
    $q.notify({ type: 'negative', message: (e as Error).message })
  }
}

async function doCreateBackup() {
  backupBusy.value = true
  try {
    await syncStore.createBackup()
    backups.value = await syncStore.listBackups()
    $q.notify({ type: 'positive', message: 'Záloha vytvořena' })
  } catch (e) {
    $q.notify({ type: 'negative', message: (e as Error).message })
  } finally {
    backupBusy.value = false
  }
}

function doRestore(id: string) {
  $q.dialog({
    title: 'Obnovit ze zálohy',
    message: 'Tímto přepíšeš lokální data zálohou ze serveru. Pokračovat?',
    cancel: { flat: true, label: 'Zrušit' },
    ok: { color: 'primary', unelevated: true, label: 'Obnovit' },
  }).onOk(async () => {
    try {
      await syncStore.restoreBackup(id)
      showBackupsDialog.value = false
      $q.notify({ type: 'positive', message: 'Data obnovena ze zálohy' })
    } catch (e) {
      $q.notify({ type: 'negative', message: (e as Error).message })
    }
  })
}

// Collaborators
const showCollabDialog = ref(false)
const editingCollab = ref<Collaborator | null>(null)
const collabForm = ref({ name: '' })

// Work types
const showWorkTypeDialog = ref(false)
const editingWorkType = ref<WorkType | null>(null)
const workTypeForm = ref({ name: '', hourlyRate: 0 })

onMounted(() => {
  nastaveniStore.loadSettings()
})

function openAddCollab() {
  editingCollab.value = null
  collabForm.value = { name: '' }
  showCollabDialog.value = true
}

function editCollab(collab: Collaborator) {
  editingCollab.value = collab
  collabForm.value = { name: collab.name }
  showCollabDialog.value = true
}

async function saveCollab() {
  if (!collabForm.value.name.trim()) return
  saving.value = true
  try {
    if (editingCollab.value) {
      await nastaveniStore.updateCollaborator(editingCollab.value.id, { name: collabForm.value.name })
    } else {
      await nastaveniStore.addCollaborator({ name: collabForm.value.name })
    }
    showCollabDialog.value = false
    $q.notify({ type: 'positive', message: editingCollab.value ? 'Spolupracovník upraven' : 'Spolupracovník přidán' })
  } finally {
    saving.value = false
  }
}

async function deleteCollab(collab: Collaborator) {
  $q.dialog({
    title: 'Smazat spolupracovníka',
    message: `Smazat "${collab.name}"?`,
    cancel: { flat: true, label: 'Zrušit' },
    ok: { color: 'negative', unelevated: true, label: 'Smazat' },
  }).onOk(async () => {
    await nastaveniStore.deleteCollaborator(collab.id)
    $q.notify({ type: 'positive', message: 'Spolupracovník smazán' })
  })
}

function openAddWorkType() {
  editingWorkType.value = null
  workTypeForm.value = { name: '', hourlyRate: 0 }
  showWorkTypeDialog.value = true
}

function editWorkType(wt: WorkType) {
  editingWorkType.value = wt
  workTypeForm.value = { name: wt.name, hourlyRate: wt.hourlyRate }
  showWorkTypeDialog.value = true
}

async function saveWorkType() {
  if (!workTypeForm.value.name.trim()) return
  saving.value = true
  try {
    if (editingWorkType.value) {
      await nastaveniStore.updateWorkType(editingWorkType.value.id, workTypeForm.value)
    } else {
      await nastaveniStore.addWorkType(workTypeForm.value)
    }
    showWorkTypeDialog.value = false
    $q.notify({ type: 'positive', message: editingWorkType.value ? 'Typ práce upraven' : 'Typ práce přidán' })
  } finally {
    saving.value = false
  }
}

async function deleteWorkType(wt: WorkType) {
  $q.dialog({
    title: 'Smazat typ práce',
    message: `Smazat "${wt.name}"?`,
    cancel: { flat: true, label: 'Zrušit' },
    ok: { color: 'negative', unelevated: true, label: 'Smazat' },
  }).onOk(async () => {
    await nastaveniStore.deleteWorkType(wt.id)
    $q.notify({ type: 'positive', message: 'Typ práce smazán' })
  })
}

function formatPrice(p: number) {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(p)
}
</script>

<style scoped lang="scss">
.nastaveni-page {
  min-height: 100vh;
}

.section-card {
  padding: 16px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-name {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.section-sub {
  font-size: 12px;
  color: #9E9E9E;
  margin-top: 1px;
}

.empty-inline {
  display: flex;
  align-items: center;
  padding: 12px 0;
}

.collab-item {
  padding: 6px 0;
}

.app-version {
  padding-bottom: 8px;
}

.account-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.account-info {
  flex: 1;
  min-width: 0;
}

.account-name {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.account-email {
  font-size: 12px;
  color: #9e9e9e;
}

.sync-status {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #757575;
}

.server-config {
  :deep(.q-item) {
    padding-left: 0;
    padding-right: 0;
  }
}
</style>
