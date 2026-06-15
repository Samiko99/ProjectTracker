<template>
  <q-dialog v-model="show" position="bottom" class="bottom-sheet-dialog">
    <q-card class="dialog-card">
      <div class="drag-handle" />

      <div class="dialog-header q-px-md q-pb-sm">
        <div class="dialog-title">{{ isEdit ? t('material.editTitle') : t('material.addTitle') }}</div>
      </div>

      <q-separator />

      <div class="q-pa-md">
        <q-input
          v-model="form.date"
          :label="t('material.date')"
          outlined
          dense
          class="q-mb-sm"
          mask="####-##-##"
          placeholder="YYYY-MM-DD"
        >
          <template #append>
            <q-icon name="event" class="cursor-pointer">
              <q-popup-proxy cover>
                <q-date v-model="form.date" mask="YYYY-MM-DD" today-btn>
                  <div class="row items-center justify-end">
                    <q-btn v-close-popup :label="t('common.close')" color="primary" flat />
                  </div>
                </q-date>
              </q-popup-proxy>
            </q-icon>
          </template>
        </q-input>

        <q-input
          v-model="form.description"
          :label="t('material.description')"
          outlined
          dense
          class="q-mb-sm"
        />

        <q-input
          v-model.number="form.amount"
          :label="t('material.amount')"
          outlined
          dense
          type="number"
          min="0"
          class="q-mb-sm"
          suffix="Kč"
        />

        <q-select
          v-model="form.paidById"
          :options="collaboratorOptions"
          :label="t('material.paidBy')"
          outlined
          dense
          emit-value
          map-options
          class="q-mb-sm"
          :display-value="form.paidById ? nastaveniStore.getCollaboratorName(form.paidById) : t('hours.selectWorker')"
        />

        <q-input
          v-model="form.notes"
          :label="t('material.note')"
          outlined
          dense
          type="textarea"
          autogrow
          class="q-mb-sm"
        />
      </div>

      <q-separator />

      <div class="q-pa-md row gap-sm justify-end">
        <q-btn flat :label="t('common.cancel')" @click="show = false" />
        <q-btn
          unelevated
          color="secondary"
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
import type { MaterialEntry } from '../db/dexie'
import { format } from 'date-fns'
import { t } from '../i18n'

const props = defineProps<{
  modelValue: boolean
  projectId: string
  entry?: MaterialEntry | null
}>()

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  saved: []
}>()

const $q = useQuasar()
const zaznamyStore = useZaznamyStore()
const nastaveniStore = useNastaveniStore()

const saving = ref(false)
const isEdit = computed(() => !!props.entry)

const show = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const collaboratorOptions = computed(() =>
  nastaveniStore.collaborators.map((c) => ({ label: c.name, value: c.id })),
)

const defaultForm = () => ({
  date: format(new Date(), 'yyyy-MM-dd'),
  description: '',
  amount: 0,
  paidById: nastaveniStore.collaborators[0]?.id ?? '',
  notes: '',
})

const form = ref(defaultForm())

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      form.value = props.entry
        ? {
            date: props.entry.date,
            description: props.entry.description,
            amount: props.entry.amount,
            paidById: props.entry.paidById,
            notes: props.entry.notes,
          }
        : defaultForm()
    }
  },
)

async function save() {
  if (!form.value.description.trim()) {
    $q.notify({ type: 'warning', message: 'Zadejte popis materiálu' })
    return
  }

  saving.value = true
  try {
    const data = {
      projectId: props.projectId,
      date: form.value.date,
      description: form.value.description,
      amount: form.value.amount,
      paidById: form.value.paidById,
      notes: form.value.notes,
      isPaid: props.entry?.isPaid ?? false,
    }

    if (props.entry) {
      await zaznamyStore.updateMaterialEntry(props.entry.id, data)
    } else {
      await zaznamyStore.addMaterialEntry(data)
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
</style>
