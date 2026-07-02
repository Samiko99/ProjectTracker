<template>
  <div class="zaznam-radek" :class="{ 'is-paid': allPaid }">
    <q-checkbox
      v-model="isPaidLocal"
      color="positive"
      dense
      @update:model-value="togglePaid"
      class="paid-checkbox"
    />

    <div class="radek-content">
      <div class="radek-top">
        <div class="radek-date">{{ formatDate(first.date) }}</div>
        <div class="radek-time" v-if="first.startTime && first.endTime">
          {{ first.startTime }} – {{ first.endTime }}
        </div>
        <q-space />
        <div class="radek-hours" :class="{ 'paid-hours': allPaid }">
          {{ formatHours(first.hours) }}
        </div>
      </div>

      <div class="radek-meta">
        <q-chip
          v-for="name in workerNames"
          :key="name"
          dense
          size="xs"
          outline
          color="grey-6"
          class="chip-meta"
        >
          <q-icon name="person" size="11px" class="q-mr-xs" />
          {{ name }}
        </q-chip>
        <q-chip
          v-if="workTypeName"
          dense
          size="xs"
          outline
          :color="allPaid ? 'positive' : 'primary'"
          class="chip-meta"
        >
          {{ workTypeName }}
          <span v-if="earnings > 0" class="chip-price"> · {{ formatPrice(earnings) }}</span>
        </q-chip>
      </div>

      <div v-if="first.notes" class="radek-notes">{{ first.notes }}</div>
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
          <q-item clickable v-close-popup @click="$emit('edit', entries)">
            <q-item-section avatar><q-icon name="edit" size="16px" /></q-item-section>
            <q-item-section>{{ t('common.edit') }}</q-item-section>
          </q-item>
          <q-item clickable v-close-popup @click="$emit('delete', entries)" class="text-negative">
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
import { formatMoney } from '../utils/money'

const props = defineProps<{ entries: WorkEntry[] }>()
defineEmits<{
  edit: [entries: WorkEntry[]]
  delete: [entries: WorkEntry[]]
}>()

const zaznamyStore = useZaznamyStore()
const nastaveniStore = useNastaveniStore()

const first = computed(() => props.entries[0])
const allPaid = computed(() => props.entries.every((e) => e.isPaid))

const isPaidLocal = ref(allPaid.value)
watch(allPaid, (v) => (isPaidLocal.value = v))

const workerNames = computed(() =>
  props.entries
    .map((e) => (e.collaboratorId ? nastaveniStore.getCollaboratorName(e.collaboratorId) : ''))
    .filter((n): n is string => !!n),
)
const workTypeName = computed(() =>
  first.value.workTypeId ? nastaveniStore.getWorkTypeName(first.value.workTypeId) : '',
)
// Výdělek za celou skupinu (všichni pracovníci dohromady)
const earnings = computed(() => {
  const rate = nastaveniStore.workTypeRates[first.value.workTypeId] ?? 0
  return props.entries.reduce((s, e) => s + e.hours * rate, 0)
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
  return formatMoney(p, nastaveniStore.getWorkTypeCurrency(first.value.workTypeId))
}

async function togglePaid(val: boolean) {
  await zaznamyStore.setPaidForEntries(
    props.entries.map((e) => e.id),
    val,
  )
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
