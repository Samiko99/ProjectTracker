<template>
  <div class="hodiny-souhrn app-card q-pa-md">
    <div class="souhrn-title">{{ title }}</div>

    <div class="souhrn-grid">
      <div class="souhrn-item">
        <div class="souhrn-value">{{ formatHours(totalHours) }}</div>
        <div class="souhrn-label">{{ t('summary.totalHours') }}</div>
      </div>
      <div class="souhrn-divider" />
      <div class="souhrn-item highlight">
        <div class="souhrn-value text-warning">{{ formatHours(unpaidHours) }}</div>
        <div class="souhrn-label">{{ t('summary.unpaid') }}</div>
      </div>
      <div v-if="showEarnings" class="souhrn-divider" />
      <div v-if="showEarnings" class="souhrn-item">
        <div class="souhrn-value text-positive">{{ formatPrice(unpaidEarnings) }}</div>
        <div class="souhrn-label">{{ t('summary.toPay') }}</div>
      </div>
    </div>

    <!-- Per collaborator breakdown -->
    <div v-if="collaboratorStats.length > 1" class="collab-breakdown q-mt-sm">
      <q-separator class="q-mb-sm" />
      <div
        v-for="stat in collaboratorStats"
        :key="stat.id"
        class="collab-row"
      >
        <q-icon name="person" size="14px" color="grey-5" />
        <span class="collab-name">{{ stat.name }}</span>
        <q-space />
        <span class="collab-hours">{{ formatHours(stat.unpaidHours) }}</span>
        <span class="collab-sep">/</span>
        <span class="collab-total">{{ formatHours(stat.totalHours) }}</span>
        <span v-if="showEarnings && stat.unpaidEarnings > 0" class="collab-earnings text-positive">
          · {{ formatPrice(stat.unpaidEarnings) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useZaznamyStore } from '../stores/zaznamy'
import { useNastaveniStore } from '../stores/nastaveni'
import { t } from '../i18n'
import { formatMoney } from '../utils/money'

const props = defineProps<{
  projectId: string
  title?: string
  showEarnings?: boolean
}>()

const zaznamyStore = useZaznamyStore()
const nastaveniStore = useNastaveniStore()

const entries = computed(() =>
  zaznamyStore.workEntries.filter((e) => e.projectId === props.projectId),
)

const totalHours = computed(() => entries.value.reduce((s, e) => s + e.hours, 0))
const unpaidHours = computed(() => entries.value.filter((e) => !e.isPaid).reduce((s, e) => s + e.hours, 0))

const unpaidEarnings = computed(() =>
  entries.value
    .filter((e) => !e.isPaid)
    .reduce((s, e) => s + e.hours * (nastaveniStore.workTypeRates[e.workTypeId] ?? 0), 0),
)

const collaboratorStats = computed(() => {
  const collabs = nastaveniStore.collaborators
  return collabs
    .map((c) => {
      const ces = entries.value.filter((e) => e.collaboratorId === c.id)
      const totalHours = ces.reduce((s, e) => s + e.hours, 0)
      const unpaidHours = ces.filter((e) => !e.isPaid).reduce((s, e) => s + e.hours, 0)
      const unpaidEarnings = ces
        .filter((e) => !e.isPaid)
        .reduce((s, e) => s + e.hours * (nastaveniStore.workTypeRates[e.workTypeId] ?? 0), 0)
      return { id: c.id, name: c.name, totalHours, unpaidHours, unpaidEarnings }
    })
    .filter((s) => s.totalHours > 0)
})

function formatHours(h: number) {
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return mins === 0 ? `${hrs} h` : `${hrs}:${String(mins).padStart(2, '0')} h`
}

// Měna projektu = z typů práce použitých v záznamech, jinak hlavní měna
const currency = computed(() => {
  for (const e of entries.value) {
    if (e.workTypeId) return nastaveniStore.getWorkTypeCurrency(e.workTypeId)
  }
  return nastaveniStore.primaryCurrency
})

function formatPrice(p: number) {
  return formatMoney(p, currency.value)
}
</script>

<style scoped lang="scss">
.hodiny-souhrn {
  margin-bottom: 12px;
}

.souhrn-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: #9E9E9E;
  margin-bottom: 12px;
}

.souhrn-grid {
  display: flex;
  align-items: center;
  gap: 0;
}

.souhrn-item {
  flex: 1;
  text-align: center;
}

.souhrn-divider {
  width: 1px;
  height: 36px;
  background: #EEEEEE;
  flex-shrink: 0;
}

.souhrn-value {
  font-size: 20px;
  font-weight: 700;
  color: #1A1A1A;
  line-height: 1.2;
}

.souhrn-label {
  font-size: 11px;
  color: #9E9E9E;
  margin-top: 2px;
}

.collab-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  font-size: 13px;

  .collab-name {
    color: #424242;
    font-weight: 500;
  }

  .collab-hours {
    font-weight: 700;
    color: #FB8C00;
  }

  .collab-sep {
    color: #BDBDBD;
  }

  .collab-total {
    color: #757575;
  }

  .collab-earnings {
    font-weight: 600;
  }
}
</style>
