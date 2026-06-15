<template>
  <q-dialog v-model="show" position="bottom" class="bottom-sheet-dialog">
    <q-card class="dialog-card">
      <div class="drag-handle" />

      <div class="dialog-header q-px-md q-pb-sm">
        <div class="dialog-title">{{ isEdit ? t('hours.editTitle') : t('hours.addTitle') }}</div>
      </div>

      <q-separator />

      <q-scroll-area style="height: 60vh; max-height: 520px">
        <div class="q-pa-md">

          <!-- Datum -->
          <q-input
            v-model="form.date"
            :label="t('hours.date')"
            outlined
            dense
            class="q-mb-sm"
            mask="####-##-##"
            placeholder="YYYY-MM-DD"
          >
            <template #append>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="form.date" mask="YYYY-MM-DD" today-btn>
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup :label="t('common.close')" color="primary" flat />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>

          <!-- Způsob zadání -->
          <div class="q-mb-sm">
            <q-btn-toggle
              v-model="timeMode"
              toggle-color="primary"
              unelevated
              size="sm"
              :options="[
                { label: t('hours.modeRange'), value: 'range' },
                { label: t('hours.modeManual'), value: 'manual' },
              ]"
            />
          </div>

          <!-- Čas od-do -->
          <div v-if="timeMode === 'range'" class="row q-col-gutter-sm q-mb-sm">
            <div class="col-6">
              <q-input
                v-model="form.startTime"
                :label="t('hours.from')"
                outlined
                dense
                mask="##:##"
                placeholder="08:00"
              >
                <template #append>
                  <q-icon name="schedule" class="cursor-pointer">
                    <q-popup-proxy cover>
                      <q-time v-model="form.startTime" format24h>
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="OK" color="primary" flat />
                        </div>
                      </q-time>
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
            </div>
            <div class="col-6">
              <q-input
                v-model="form.endTime"
                :label="t('hours.to')"
                outlined
                dense
                mask="##:##"
                placeholder="16:00"
              >
                <template #append>
                  <q-icon name="schedule" class="cursor-pointer">
                    <q-popup-proxy cover>
                      <q-time v-model="form.endTime" format24h>
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="OK" color="primary" flat />
                        </div>
                      </q-time>
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
            </div>
            <div v-if="computedHours > 0" class="col-12">
              <div class="computed-hours-chip">
                <q-icon name="schedule" size="14px" />
                {{ t('hours.total') }}: <strong>{{ formatHours(computedHours) }}</strong>
              </div>
            </div>
          </div>

          <!-- Manuální hodiny -->
          <div v-else class="q-mb-sm">
            <q-input
              v-model.number="form.hoursManual"
              :label="t('hours.manual')"
              outlined
              dense
              type="number"
              min="0.5"
              step="0.5"
            />
          </div>

          <!-- Typ práce -->
          <q-select
            v-model="form.workTypeId"
            :options="workTypeOptions"
            :label="t('hours.workType')"
            outlined
            dense
            emit-value
            map-options
            class="q-mb-sm"
            :display-value="form.workTypeId ? nastaveniStore.getWorkTypeName(form.workTypeId) : t('hours.selectWorkType')"
          />

          <!-- Pracovníci (výběr více – pro každého vznikne samostatný záznam) -->
          <q-select
            v-model="form.collaboratorIds"
            :options="collaboratorOptions"
            :label="isEdit ? t('hours.worker') : t('hours.workers')"
            outlined
            dense
            emit-value
            map-options
            :multiple="!isEdit"
            :use-chips="!isEdit"
            class="q-mb-xs"
          />
          <div v-if="!isEdit" class="text-caption text-grey-6 q-mb-sm">
            {{ t('hours.workersHint') }}
          </div>

          <!-- Poznámka -->
          <q-input
            v-model="form.notes"
            :label="t('hours.note')"
            outlined
            dense
            type="textarea"
            autogrow
            class="q-mb-sm"
          />
        </div>
      </q-scroll-area>

      <q-separator />

      <div class="q-pa-md row gap-sm justify-end">
        <q-btn flat :label="t('common.cancel')" @click="show = false" />
        <q-btn
          unelevated
          color="primary"
          :label="isEdit ? t('common.save') : t('common.add')"
          :loading="saving"
          @click="save"
        />
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useZaznamyStore } from '../stores/zaznamy'
import { useNastaveniStore } from '../stores/nastaveni'
import type { WorkEntry } from '../db/dexie'
import { format } from 'date-fns'
import { t } from '../i18n'

const props = defineProps<{
  modelValue: boolean
  projectId: string
  entry?: WorkEntry | null
}>()

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  saved: []
}>()

const $q = useQuasar()
const zaznamyStore = useZaznamyStore()
const nastaveniStore = useNastaveniStore()

const saving = ref(false)
const timeMode = ref<'range' | 'manual'>('range')

const show = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const isEdit = computed(() => !!props.entry)

const workTypeOptions = computed(() =>
  nastaveniStore.workTypes.map((wt) => ({ label: wt.name, value: wt.id })),
)
const collaboratorOptions = computed(() =>
  nastaveniStore.collaborators.map((c) => ({ label: c.name, value: c.id })),
)

// V režimu přidání je collaboratorIds pole; v editaci jen jeden (q-select bez multiple → string)
const defaultForm = () => ({
  date: format(new Date(), 'yyyy-MM-dd'),
  startTime: '08:00',
  endTime: '16:00',
  hoursManual: 8,
  workTypeId: nastaveniStore.workTypes[0]?.id ?? '',
  collaboratorIds: [] as string[] | string,
  notes: '',
})

const form = ref(defaultForm())

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      if (props.entry) {
        timeMode.value = props.entry.startTime ? 'range' : 'manual'
        form.value = {
          date: props.entry.date,
          startTime: props.entry.startTime ?? '08:00',
          endTime: props.entry.endTime ?? '16:00',
          hoursManual: props.entry.hours,
          workTypeId: props.entry.workTypeId,
          collaboratorIds: props.entry.collaboratorId, // string v editaci
          notes: props.entry.notes,
        }
      } else {
        form.value = defaultForm()
        timeMode.value = 'range'
      }
    }
  },
)

const computedHours = computed(() => {
  if (timeMode.value !== 'range' || !form.value.startTime || !form.value.endTime) return 0
  const [sh, sm] = form.value.startTime.split(':').map(Number)
  const [eh, em] = form.value.endTime.split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  return mins > 0 ? Math.round((mins / 60) * 100) / 100 : 0
})

function formatHours(h: number) {
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return mins === 0 ? `${hrs} ${t('common.hoursShort')}` : `${hrs}:${String(mins).padStart(2, '0')} ${t('common.hoursShort')}`
}

async function save() {
  const hours = timeMode.value === 'range' ? computedHours.value : form.value.hoursManual
  if (!form.value.date || hours <= 0) {
    $q.notify({ type: 'warning', message: t('hours.invalid') })
    return
  }

  const base = {
    projectId: props.projectId,
    workTypeId: form.value.workTypeId,
    date: form.value.date,
    startTime: timeMode.value === 'range' ? form.value.startTime : undefined,
    endTime: timeMode.value === 'range' ? form.value.endTime : undefined,
    hours,
    notes: form.value.notes,
    isPaid: props.entry?.isPaid ?? false,
  }

  // Normalizace vybraných pracovníků na pole
  const ids = Array.isArray(form.value.collaboratorIds)
    ? form.value.collaboratorIds
    : form.value.collaboratorIds
      ? [form.value.collaboratorIds]
      : []
  const workerIds = ids.length ? ids : ['']

  saving.value = true
  try {
    if (props.entry) {
      await zaznamyStore.updateWorkEntry(props.entry.id, {
        ...base,
        collaboratorId: workerIds[0],
      })
    } else {
      // Pro každého vybraného pracovníka samostatný záznam
      for (const cid of workerIds) {
        await zaznamyStore.addWorkEntry({ ...base, collaboratorId: cid })
      }
      if (workerIds.length > 1) {
        $q.notify({ type: 'positive', message: t('hours.savedMulti', { count: workerIds.length }) })
      }
    }
    emit('saved')
  } catch (e) {
    console.error('Save failed:', e)
    $q.notify({ type: 'negative', message: t('jobDialog.saveError', { msg: (e as Error).message }) })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.dialog-header .dialog-title {
  font-size: 17px;
  font-weight: 600;
  color: #1A1A1A;
}

.computed-hours-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #FFF3E0;
  color: #E65100;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
}
</style>
