<template>
  <q-page class="nastaveni-page">
    <div class="page-header">
      <h1 class="page-title">{{ t('settings.title') }}</h1>
    </div>

    <div class="q-pa-md">
      <!-- Účet a synchronizace -->
      <div class="section-card app-card q-mb-md">
        <div class="section-head">
          <div>
            <div class="section-name">{{ t('settings.sync') }}</div>
            <div class="section-sub">{{ t('settings.syncSub') }}</div>
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
            {{ t('settings.offlineHint') }}
          </div>
          <q-btn
            unelevated
            color="primary"
            :label="t('settings.loginRegister')"
            icon="login"
            class="full-width"
            @click="showLoginDialog = true"
          />

          <q-expansion-item
            dense
            dense-toggle
            :label="t('settings.serverAddress')"
            header-class="text-grey-6 text-caption q-px-none q-mt-sm"
            class="server-config"
          >
            <q-input
              v-model="apiUrl"
              outlined
              dense
              label="API URL"
              :hint="t('settings.apiUrlHint')"
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
              <q-tooltip>{{ t('settings.logout') }}</q-tooltip>
            </q-btn>
          </div>

          <div class="sync-status q-mt-sm">
            <q-icon name="schedule" size="14px" color="grey-5" />
            <span>{{ t('settings.lastSync', { time: lastSyncLabel }) }}</span>
          </div>

          <div class="row q-gutter-sm q-mt-sm">
            <q-btn
              unelevated
              color="primary"
              icon="sync"
              :label="t('settings.syncNow')"
              :loading="syncStore.syncing"
              class="col"
              @click="doSync"
            />
            <q-btn
              outline
              color="primary"
              icon="backup"
              :label="t('settings.backups')"
              @click="openBackups"
            />
          </div>
        </div>
      </div>

      <!-- Spolupracovníci -->
      <div class="section-card app-card">
        <div class="section-head">
          <div>
            <div class="section-name">{{ t('settings.collaborators') }}</div>
            <div class="section-sub">{{ t('settings.collaboratorsSub') }}</div>
          </div>
          <q-btn flat round dense icon="add" color="primary" @click="openAddCollab" />
        </div>

        <q-separator class="q-my-sm" />

        <div v-if="nastaveniStore.collaborators.length === 0" class="empty-inline">
          <q-icon name="person_add" size="28px" color="grey-3" />
          <span class="text-caption text-grey-4 q-ml-sm">{{ t('settings.noCollaborators') }}</span>
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
            <div class="section-name">{{ t('settings.workTypes') }}</div>
            <div class="section-sub">{{ t('settings.workTypesSub') }}</div>
          </div>
          <q-btn flat round dense icon="add" color="secondary" @click="openAddWorkType" />
        </div>

        <q-separator class="q-my-sm" />

        <div v-if="nastaveniStore.workTypes.length === 0" class="empty-inline">
          <q-icon name="work_outline" size="28px" color="grey-3" />
          <span class="text-caption text-grey-4 q-ml-sm">{{ t('settings.noWorkTypes') }}</span>
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
              <q-item-label caption>{{ formatMoney(wt.hourlyRate, wt.currency) }}/{{ t('common.hoursShort') }}</q-item-label>
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

      <!-- Jazyk -->
      <div class="section-card app-card q-mt-md">
        <div class="section-head">
          <div>
            <div class="section-name">{{ t('settings.language') }}</div>
            <div class="section-sub">{{ t('settings.languageSub') }}</div>
          </div>
          <q-icon name="translate" color="grey-5" size="22px" />
        </div>
        <q-separator class="q-my-sm" />
        <q-btn-toggle
          :model-value="locale"
          spread
          no-caps
          unelevated
          toggle-color="primary"
          color="grey-2"
          text-color="grey-8"
          :options="[
            { label: 'Čeština', value: 'cs' },
            { label: 'English', value: 'en' },
          ]"
          @update:model-value="onLanguageChange"
        />
      </div>

      <!-- Info -->
      <div class="app-version q-mt-lg text-center text-caption text-grey-4">
        {{ t('settings.version') }}
      </div>
    </div>

    <!-- Dialog – Spolupracovník -->
    <q-dialog v-model="showCollabDialog" position="bottom" class="bottom-sheet-dialog">
      <q-card class="dialog-card">
        <div class="drag-handle" />
        <div class="q-px-md q-py-sm text-subtitle1 text-weight-bold">
          {{ editingCollab ? t('settings.editCollaborator') : t('settings.newCollaborator') }}
        </div>
        <q-separator />
        <div class="q-pa-md">
          <q-input
            v-model="collabForm.name"
            :label="t('settings.collabName')"
            outlined
            dense
            autofocus
            @keyup.enter="saveCollab"
          />
        </div>
        <q-separator />
        <div class="q-pa-md row gap-sm justify-end">
          <q-btn flat :label="t('common.cancel')" @click="showCollabDialog = false" />
          <q-btn unelevated color="primary" :label="editingCollab ? t('common.save') : t('common.add')" :loading="saving" @click="saveCollab" />
        </div>
      </q-card>
    </q-dialog>

    <!-- Dialog – Typ práce -->
    <q-dialog v-model="showWorkTypeDialog" position="bottom" class="bottom-sheet-dialog">
      <q-card class="dialog-card">
        <div class="drag-handle" />
        <div class="q-px-md q-py-sm text-subtitle1 text-weight-bold">
          {{ editingWorkType ? t('settings.editWorkType') : t('settings.newWorkType') }}
        </div>
        <q-separator />
        <div class="q-pa-md">
          <q-input
            v-model="workTypeForm.name"
            :label="t('settings.workTypeName')"
            outlined
            dense
            class="q-mb-sm"
            :placeholder="t('settings.workTypeNameHint')"
          />
          <div class="row q-col-gutter-sm">
            <div class="col-7">
              <q-input
                v-model.number="workTypeForm.hourlyRate"
                :label="t('settings.hourlyRate')"
                outlined
                dense
                type="number"
                min="0"
                inputmode="decimal"
                :suffix="`${workTypeForm.currency || 'Kč'}/${t('common.hoursShort')}`"
              />
            </div>
            <div class="col-5">
              <q-input
                v-model="workTypeForm.currency"
                :label="t('settings.currency')"
                outlined
                dense
                :hint="t('settings.currencyHint')"
              />
            </div>
          </div>
        </div>
        <q-separator />
        <div class="q-pa-md row gap-sm justify-end">
          <q-btn flat :label="t('common.cancel')" @click="showWorkTypeDialog = false" />
          <q-btn unelevated color="secondary" :label="editingWorkType ? t('common.save') : t('common.add')" :loading="saving" @click="saveWorkType" />
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
          <div class="text-subtitle1 text-weight-bold">{{ t('settings.backupsTitle') }}</div>
          <div class="text-caption text-grey-6">{{ t('settings.backupsSub') }}</div>
        </div>
        <q-separator />
        <div class="q-pa-md">
          <q-btn
            unelevated
            color="primary"
            icon="add"
            :label="t('settings.createBackup')"
            class="full-width q-mb-md"
            :loading="backupBusy"
            @click="doCreateBackup"
          />

          <div v-if="backups.length === 0" class="empty-inline">
            <q-icon name="inventory_2" size="24px" color="grey-3" />
            <span class="text-caption text-grey-4 q-ml-sm">{{ t('settings.noBackups') }}</span>
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
                  :label="t('common.restore')"
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
import { t, locale, setLocale, dateFnsLocale, type Locale } from '../i18n'
import { formatMoney } from '../utils/money'

const $q = useQuasar()
const nastaveniStore = useNastaveniStore()
const authStore = useAuthStore()
const syncStore = useSyncStore()

function onLanguageChange(l: Locale) {
  setLocale(l)
}

const saving = ref(false)

// --- Účet a synchronizace ---
const showLoginDialog = ref(false)
const showBackupsDialog = ref(false)
const backups = ref<{ id: string; createdAt: string }[]>([])
const backupBusy = ref(false)
const apiUrl = ref(getApiBaseUrl())

const lastSyncLabel = computed(() =>
  syncStore.lastSyncAt ? formatDateTime(syncStore.lastSyncAt) : t('settings.never'),
)

function formatDateTime(iso: string) {
  try {
    return format(parseISO(iso), 'd. M. yyyy HH:mm', { locale: dateFnsLocale() })
  } catch {
    return iso
  }
}

function saveApiUrl() {
  setApiBaseUrl(apiUrl.value.trim())
  apiUrl.value = getApiBaseUrl()
  $q.notify({ type: 'positive', message: t('settings.apiUrlSaved') })
}

async function doSync() {
  try {
    const res = await syncStore.syncNow()
    $q.notify({
      type: 'positive',
      message: t('settings.synced', { pushed: res.pushed, pulled: res.pulled }),
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
    title: t('settings.logoutTitle'),
    message: t('settings.logoutMsg'),
    cancel: { flat: true, label: t('common.cancel') },
    ok: { color: 'negative', unelevated: true, label: t('settings.logout') },
  }).onOk(async () => {
    await authStore.logout()
    syncStore.resetSyncState()
    $q.notify({ type: 'positive', message: t('settings.loggedOut') })
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
    $q.notify({ type: 'positive', message: t('settings.backupCreated') })
  } catch (e) {
    $q.notify({ type: 'negative', message: (e as Error).message })
  } finally {
    backupBusy.value = false
  }
}

function doRestore(id: string) {
  $q.dialog({
    title: t('settings.restoreTitle'),
    message: t('settings.restoreMsg'),
    cancel: { flat: true, label: t('common.cancel') },
    ok: { color: 'primary', unelevated: true, label: t('common.restore') },
  }).onOk(async () => {
    try {
      await syncStore.restoreBackup(id)
      showBackupsDialog.value = false
      $q.notify({ type: 'positive', message: t('settings.restored') })
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
const workTypeForm = ref({ name: '', hourlyRate: 0, currency: 'Kč' })

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
    $q.notify({ type: 'positive', message: editingCollab.value ? t('settings.collabUpdated') : t('settings.collabAdded') })
  } finally {
    saving.value = false
  }
}

async function deleteCollab(collab: Collaborator) {
  $q.dialog({
    title: t('settings.deleteCollabTitle'),
    message: t('settings.deleteCollabMsg', { name: collab.name }),
    cancel: { flat: true, label: t('common.cancel') },
    ok: { color: 'negative', unelevated: true, label: t('common.delete') },
  }).onOk(async () => {
    await nastaveniStore.deleteCollaborator(collab.id)
    $q.notify({ type: 'positive', message: t('settings.collabDeleted') })
  })
}

function openAddWorkType() {
  editingWorkType.value = null
  workTypeForm.value = { name: '', hourlyRate: 0, currency: nastaveniStore.primaryCurrency }
  showWorkTypeDialog.value = true
}

function editWorkType(wt: WorkType) {
  editingWorkType.value = wt
  workTypeForm.value = { name: wt.name, hourlyRate: wt.hourlyRate, currency: wt.currency || 'Kč' }
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
    $q.notify({ type: 'positive', message: editingWorkType.value ? t('settings.workTypeUpdated') : t('settings.workTypeAdded') })
  } finally {
    saving.value = false
  }
}

async function deleteWorkType(wt: WorkType) {
  $q.dialog({
    title: t('settings.deleteWorkTypeTitle'),
    message: t('settings.deleteWorkTypeMsg', { name: wt.name }),
    cancel: { flat: true, label: t('common.cancel') },
    ok: { color: 'negative', unelevated: true, label: t('common.delete') },
  }).onOk(async () => {
    await nastaveniStore.deleteWorkType(wt.id)
    $q.notify({ type: 'positive', message: t('settings.workTypeDeleted') })
  })
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
