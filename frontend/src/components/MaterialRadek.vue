<template>
  <div class="material-radek" :class="{ 'is-paid': entry.isPaid }">
    <q-checkbox
      v-model="isPaidLocal"
      color="positive"
      dense
      class="paid-checkbox"
      @update:model-value="togglePaid"
    />
    <div class="mat-icon-wrap">
      <q-icon name="inventory_2" color="secondary" size="18px" />
    </div>
    <div class="mat-content">
      <div class="mat-top">
        <span class="mat-date">{{ formatDate(entry.date) }}</span>
        <q-space />
        <span v-if="entry.amount > 0" class="mat-amount" :class="{ 'paid-amount': entry.isPaid }">
          {{ formatPrice(entry.amount) }}
        </span>
      </div>
      <div class="mat-desc">{{ entry.description }}</div>
      <div v-if="entry.paidById" class="mat-paid-by">
        {{ t('detail.paidBy', { name: nastaveniStore.getCollaboratorName(entry.paidById) }) }}
      </div>
      <div v-if="entry.notes" class="mat-notes">{{ entry.notes }}</div>
    </div>
    <q-btn flat round dense icon="more_vert" color="grey-4" size="xs" @click.stop>
      <q-menu>
        <q-list dense style="min-width: 130px">
          <q-item clickable v-close-popup @click="$emit('edit', entry)">
            <q-item-section avatar><q-icon name="edit" size="16px" /></q-item-section>
            <q-item-section>{{ t('common.edit') }}</q-item-section>
          </q-item>
          <q-item clickable v-close-popup class="text-negative" @click="$emit('delete', entry)">
            <q-item-section avatar><q-icon name="delete" size="16px" color="negative" /></q-item-section>
            <q-item-section>{{ t('common.delete') }}</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useZaznamyStore } from '../stores/zaznamy'
import { useNastaveniStore } from '../stores/nastaveni'
import type { MaterialEntry } from '../db/dexie'
import { format, parseISO } from 'date-fns'
import { t, dateFnsLocale } from '../i18n'
import { formatMoney } from '../utils/money'

const props = defineProps<{ entry: MaterialEntry }>()
defineEmits<{
  edit: [entry: MaterialEntry]
  delete: [entry: MaterialEntry]
}>()

const zaznamyStore = useZaznamyStore()
const nastaveniStore = useNastaveniStore()

const isPaidLocal = ref(props.entry.isPaid)
watch(
  () => props.entry.isPaid,
  (v) => (isPaidLocal.value = v),
)

async function togglePaid(val: boolean) {
  await zaznamyStore.updateMaterialEntry(props.entry.id, { isPaid: val })
}

function formatDate(d: string) {
  try {
    return format(parseISO(d), 'd. M. yyyy', { locale: dateFnsLocale() })
  } catch {
    return d
  }
}

function formatPrice(p: number) {
  return formatMoney(p)
}
</script>

<style scoped lang="scss">
.material-radek {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 0;
  transition: opacity 0.2s;

  &.is-paid {
    opacity: 0.55;
  }

  & + .material-radek {
    border-top: 1px solid #F5F5F5;
  }
}

.paid-checkbox {
  margin-top: 2px;
  flex-shrink: 0;
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

  &.paid-amount {
    color: #9E9E9E;
    text-decoration: line-through;
  }
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
</style>
