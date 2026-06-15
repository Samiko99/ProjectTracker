<template>
  <q-dialog v-model="show" position="bottom" class="bottom-sheet-dialog">
    <q-card class="dialog-card">
      <div class="drag-handle" />

      <div class="dialog-header q-px-md q-pb-sm">
        <div class="dialog-title">{{ isEdit ? t('jobDialog.editTitle') : t('jobDialog.newTitle') }}</div>
      </div>

      <q-separator />

      <div class="q-pa-md">
        <q-input
          v-model="form.name"
          :label="t('jobDialog.name')"
          outlined
          dense
          class="q-mb-sm"
          :rules="[(v) => !!v || t('jobDialog.required')]"
          ref="nameRef"
        />

        <q-input
          v-model="form.address"
          :label="t('jobDialog.address')"
          outlined
          dense
          class="q-mb-sm"
        />

        <q-input
          v-model="form.notes"
          :label="t('jobDialog.notes')"
          outlined
          dense
          type="textarea"
          autogrow
          class="q-mb-md"
        />

        <div class="q-mb-md">
          <div class="text-caption text-grey-6 q-mb-xs">{{ t('jobDialog.color') }}</div>
          <div class="color-picker">
            <div
              v-for="color in PROJECT_COLORS"
              :key="color"
              class="color-option"
              :class="{ selected: form.color === color }"
              :style="{ background: color }"
              @click="form.color = color"
            />
          </div>
        </div>
      </div>

      <q-separator />

      <div class="q-pa-md row gap-sm justify-end">
        <q-btn flat :label="t('common.cancel')" @click="show = false" />
        <q-btn
          unelevated
          color="primary"
          :label="isEdit ? t('common.save') : t('jobs.add')"
          :loading="saving"
          @click="save"
        />
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useStavbyStore } from '../stores/stavby'
import type { Project } from '../db/dexie'
import { t } from '../i18n'

const PROJECT_COLORS = [
  '#E65100', '#1565C0', '#2E7D32', '#6A1B9A',
  '#00838F', '#C62828', '#37474F', '#F57F17',
  '#AD1457', '#0277BD',
]

const props = defineProps<{
  modelValue: boolean
  project?: Project | null
}>()

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  saved: []
}>()

const $q = useQuasar()
const stavbyStore = useStavbyStore()
const saving = ref(false)
const nameRef = ref()

const show = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const isEdit = computed(() => !!props.project)

const defaultForm = () => ({
  name: '',
  address: '',
  notes: '',
  color: PROJECT_COLORS[0],
})

const form = ref(defaultForm())

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      form.value = props.project
        ? {
            name: props.project.name,
            address: props.project.address,
            notes: props.project.notes,
            color: props.project.color,
          }
        : defaultForm()
    }
  },
)

async function save() {
  if (!form.value.name.trim()) {
    nameRef.value?.validate()
    return
  }

  saving.value = true
  try {
    if (props.project) {
      await stavbyStore.updateProject(props.project.id, form.value)
    } else {
      await stavbyStore.addProject(form.value)
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
.dialog-header {
  padding-top: 4px;
  .dialog-title {
    font-size: 17px;
    font-weight: 600;
    color: #1A1A1A;
  }
}

.color-picker {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.color-option {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  border: 3px solid transparent;

  &.selected {
    border-color: white;
    box-shadow: 0 0 0 2px currentColor, 0 2px 6px rgba(0,0,0,0.25);
    transform: scale(1.1);
  }
}
</style>
