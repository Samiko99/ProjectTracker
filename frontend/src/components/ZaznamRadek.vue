<template>
  <div class="zaznam-radek" :class="{ 'is-paid': entry.isPaid }">
    <q-checkbox
      v-model="isPaidLocal"
      color="positive"
      dense
      @update:model-value="togglePaid"
      class="paid-checkbox"
    />

    <div class="radek-content">
      <div class="radek-top">
        <div class="radek-date">{{ formatDate(entry.date) }}</div>
        <div class="radek-time" v-if="entry.startTime && entry.endTime">
          {{ entry.startTime }} – {{ entry.endTime }}
        </div>
        <q-space />
        <div class="radek-hours" :class="{ 'paid-hours': entry.isPaid }">
          {{ formatHours(entry.hours) }}
        </div>
      </div>

      <div class="radek-meta">
        <q-chip
          v-if="collaboratorName"
          dense
          size="xs"
          outline
          color="grey-6"
          class="chip-meta"
        >
          <q-icon name="person" size="11px" class="q-mr-xs" />
          {{ collaboratorName }}
        </q-chip>
        <q-chip
          v-if="workTypeName"
          dense
          size="xs"
          outline
          :color="entry.isPaid ? 'positive' : 'primary'"
          class="chip-meta"
        >
          {{ workTypeName }}
          <span v-if="earnings > 0" class="chip-price"> · {{ formatPrice(earnings) }}</span>
        </q-chip>
      </div>

      <div v-if="entry.notes" class="radek-notes">{{ entry.notes }}</div>
    </div>

    <q-btn
      flat
      round
      dense
      icon="more_vert"
      color="grey-4"
      size="xs"
      @click.stop
    >
      <q-menu>
        <q-list dense style="min-width: 130px">
          <q-item clickable v-close-popup @click="$emit('edit', entry)">
            <q-item-section avatar><q-icon name="edit" size="16px" /></q-item-section>
            <q-item-section>{{ t('common.edit') }}</q-item-section>
          </q-item>
          <q-item clickable v-close-popup @click="$emit('delete', entry)" class="text-negative">
            <q-item-section avatar><q-icon name="delete" size="16px" color="negative" /></q-item-section>
            <q-item-section>{{ t('common.delete') }}</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useZaznamyStore } from '../stores/zaznamy'
import { useNastaveniStore } from '../stores/nastaveni'
import type { WorkEntry } from '../db/dexie'
import { format, parseISO } from 'date-fns'
import { t, dateFnsLocale } from '../i18n'

const props = defineProps<{ entry: WorkEntry }>()
defineEmits<{
  edit: [entry: WorkEntry]
  delete: [entry: WorkEntry]
}>()

const zaznamyStore = useZaznamyStore()
const nastaveniStore = useNastaveniStore()

const isPaidLocal = ref(props.entry.isPaid)
watch(() => props.entry.isPaid, (v) => (isPaidLocal.value = v))

const collaboratorName = computed(() =>
  props.entry.collaboratorId ? nastaveniStore.getCollaboratorName(props.entry.collaboratorId) : '',
)
const workTypeName = computed(() =>
  props.entry.workTypeId ? nastaveniStore.getWorkTypeName(props.entry.workTypeId) : '',
)
const earnings = computed(() => {
  const rate = nastaveniStore.workTypeRates[props.entry.workTypeId] ?? 0
  return props.entry.hours * rate
})

function formatDate(d: string) {
  try {
    return format(parseISO(d), 'd. M. yyyy (EEEE)', { locale: dateFnsLocale() })
  } catch {
    return d
  }
}

function formatHours(h: number) {
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return mins === 0 ? `${hrs} h` : `${hrs}:${String(mins).padStart(2, '0')} h`
}

function formatPrice(p: number) {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(p)
}

async function togglePaid(val: boolean) {
  await zaznamyStore.togglePaid(props.entry.id, val)
}
</script>

<style scoped lang="scss">
.zaznam-radek {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 0;
  transition: opacity 0.2s;

  &.is-paid {
    opacity: 0.55;
  }

  & + .zaznam-radek {
    border-top: 1px solid #F5F5F5;
  }
}

.paid-checkbox {
  margin-top: 2px;
  flex-shrink: 0;
}

.radek-content {
  flex: 1;
  min-width: 0;
}

.radek-top {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.radek-date {
  font-size: 13px;
  font-weight: 600;
  color: #212121;
}

.radek-time {
  font-size: 12px;
  color: #757575;
}

.radek-hours {
  font-size: 14px;
  font-weight: 700;
  color: #E65100;

  &.paid-hours {
    color: #9E9E9E;
    text-decoration: line-through;
  }
}

.radek-meta {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.chip-meta {
  height: 20px;
  font-size: 11px;
}

.chip-price {
  font-weight: 600;
}

.radek-notes {
  font-size: 12px;
  color: #616161;
  margin-top: 4px;
  font-style: italic;
}
</style>
