<template>
  <div class="stavba-karta app-card" @click="$emit('click')">
    <div class="karta-header">
      <div class="color-badge" :style="{ background: project.color }" />
      <div class="karta-info">
        <div class="karta-nazev">{{ project.name }}</div>
        <div v-if="project.address" class="karta-adresa">
          <q-icon name="location_on" size="13px" />
          {{ project.address }}
        </div>
      </div>
      <q-btn
        flat
        round
        dense
        icon="more_vert"
        color="grey-5"
        size="sm"
        @click.stop
      >
        <q-menu>
          <q-list dense style="min-width: 140px">
            <q-item clickable v-close-popup @click="$emit('edit', project)">
              <q-item-section avatar>
                <q-icon name="edit" size="18px" />
              </q-item-section>
              <q-item-section>Upravit</q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="$emit('delete', project)" class="text-negative">
              <q-item-section avatar>
                <q-icon name="delete" size="18px" color="negative" />
              </q-item-section>
              <q-item-section>Smazat</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
    </div>

    <div v-if="project.notes" class="karta-notes">{{ project.notes }}</div>

    <div class="karta-stats">
      <div class="stat-item">
        <q-icon name="schedule" size="14px" color="grey-5" />
        <span class="stat-value">{{ formatHours(totalHoursSync) }}</span>
        <span class="stat-label">celkem</span>
      </div>
      <div v-if="unpaidHours > 0" class="stat-item stat-unpaid">
        <q-icon name="payments" size="14px" color="warning" />
        <span class="stat-value text-warning">{{ formatHours(unpaidHours) }}</span>
        <span class="stat-label">nezaplaceno</span>
      </div>
      <q-space />
      <q-icon name="chevron_right" color="grey-4" size="20px" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useZaznamyStore } from '../stores/zaznamy'
import type { Project } from '../db/dexie'

const props = defineProps<{ project: Project }>()
defineEmits<{
  click: []
  edit: [project: Project]
  delete: [project: Project]
}>()

const zaznamyStore = useZaznamyStore()

// Pre-compute from store for performance
const workEntries = computed(() =>
  zaznamyStore.workEntries.filter((e) => e.projectId === props.project.id),
)

const totalHoursSync = computed(() =>
  workEntries.value.reduce((s, e) => s + e.hours, 0),
)

const unpaidHours = computed(() =>
  workEntries.value.filter((e) => !e.isPaid).reduce((s, e) => s + e.hours, 0),
)

function formatHours(h: number) {
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  if (mins === 0) return `${hrs} h`
  return `${hrs}:${String(mins).padStart(2, '0')} h`
}
</script>

<style scoped lang="scss">
.stavba-karta {
  padding: 14px 16px;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.1s;

  &:active {
    transform: scale(0.99);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  }
}

.karta-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 6px;
}

.color-badge {
  width: 4px;
  min-height: 32px;
  border-radius: 2px;
  flex-shrink: 0;
  margin-top: 2px;
}

.karta-info {
  flex: 1;
  min-width: 0;
}

.karta-nazev {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.karta-adresa {
  font-size: 12px;
  color: #757575;
  display: flex;
  align-items: center;
  gap: 2px;
  margin-top: 2px;
}

.karta-notes {
  font-size: 13px;
  color: #616161;
  margin: 4px 0 10px 14px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.karta-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #F5F5F5;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-size: 13px;
  font-weight: 600;
  color: #424242;
}

.stat-label {
  font-size: 11px;
  color: #9E9E9E;
}
</style>
