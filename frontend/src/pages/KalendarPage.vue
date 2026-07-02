<template>
  <q-page class="kalendar-page">
    <div class="page-header">
      <h1 class="page-title">{{ t('calendar.title') }}</h1>
      <div class="view-toggle">
        <q-btn-toggle
          v-model="calView"
          toggle-color="primary"
          unelevated
          dense
          size="sm"
          no-caps
          :options="[
            { label: t('calendar.month'), value: 'dayGridMonth' },
            { label: t('calendar.week'), value: 'timeGridWeek' },
            { label: t('calendar.day'), value: 'timeGridDay' },
          ]"
          @update:model-value="changeView"
        />
      </div>
    </div>

    <div class="calendar-wrapper q-pa-sm">
      <FullCalendar ref="calendarRef" :options="calendarOptions" />
    </div>

    <!-- Day preview dialog -->
    <q-dialog v-model="showDayPreview" position="bottom" class="bottom-sheet-dialog">
      <q-card class="dialog-card">
        <div class="drag-handle" />
        <div class="q-pa-md">
          <div class="text-subtitle1 text-weight-bold q-mb-sm">{{ previewDateLabel }}</div>
          <div v-if="previewEvents.length === 0" class="text-caption text-grey-5 q-py-md text-center">
            {{ t('calendar.noEntries') }}
          </div>
          <div
            v-for="ev in previewEvents"
            :key="ev.id"
            class="preview-event"
            :style="{ borderLeftColor: ev.color }"
            @click="goToProject(ev.extendedProps?.projectId)"
          >
            <div class="preview-title">{{ ev.title }}</div>
            <div class="preview-time" v-if="ev.extendedProps?.time">{{ ev.extendedProps.time }}</div>
            <div class="preview-notes" v-if="ev.extendedProps?.notes">{{ ev.extendedProps.notes }}</div>
          </div>
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import csLocale from '@fullcalendar/core/locales/cs'
import enLocale from '@fullcalendar/core/locales/en-gb'
import type { CalendarOptions, EventInput } from '@fullcalendar/core'
import { useStavbyStore } from '../stores/stavby'
import { useZaznamyStore } from '../stores/zaznamy'
import { useNastaveniStore } from '../stores/nastaveni'
import { format, parseISO } from 'date-fns'
import { t, locale, dateFnsLocale } from '../i18n'

const router = useRouter()
const stavbyStore = useStavbyStore()
const zaznamyStore = useZaznamyStore()
const nastaveniStore = useNastaveniStore()

const calendarRef = ref()
const calView = ref('dayGridMonth')
const showDayPreview = ref(false)
const previewDate = ref('')
const previewEvents = ref<EventInput[]>([])

const previewDateLabel = computed(() => {
  if (!previewDate.value) return ''
  try {
    return format(parseISO(previewDate.value), 'EEEE d. MMMM yyyy', { locale: dateFnsLocale() })
  } catch {
    return previewDate.value
  }
})

const calendarEvents = computed((): EventInput[] => {
  return zaznamyStore.workEntries
    // Záznamy smazaných zakázek do kalendáře nepatří
    .filter((e) => !e.deletedAt && stavbyStore.getProjectById(e.projectId))
    .map((entry) => {
      const project = stavbyStore.getProjectById(entry.projectId)
      const collabName = entry.collaboratorId
        ? nastaveniStore.getCollaboratorName(entry.collaboratorId)
        : null
      const workTypeName = entry.workTypeId
        ? nastaveniStore.getWorkTypeName(entry.workTypeId)
        : null

      const timeStr =
        entry.startTime && entry.endTime
          ? `${entry.startTime} – ${entry.endTime}`
          : `${entry.hours} h`

      return {
        id: entry.id,
        title: project?.name ?? t('nav.jobs'),
        start: entry.startTime
          ? `${entry.date}T${entry.startTime}`
          : entry.date,
        end: entry.endTime ? `${entry.date}T${entry.endTime}` : undefined,
        allDay: !entry.startTime,
        backgroundColor: project?.color ?? '#E65100',
        borderColor: project?.color ?? '#E65100',
        textColor: '#fff',
        extendedProps: {
          projectId: entry.projectId,
          time: timeStr,
          notes: entry.notes,
          collaborator: collabName,
          workType: workTypeName,
          hours: entry.hours,
        },
      }
    })
})

const calendarOptions = computed(
  (): CalendarOptions => ({
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
    locale: locale.value === 'en' ? enLocale : csLocale,
    initialView: calView.value,
    headerToolbar: {
      left: 'prev',
      center: 'title',
      right: 'next',
    },
    height: 'auto',
    contentHeight: 'auto',
    events: calendarEvents.value,
    eventClick: (info) => {
      info.jsEvent.preventDefault()
      const dateStr = format(info.event.start!, 'yyyy-MM-dd')
      openDayPreview(dateStr)
    },
    dateClick: (info) => {
      openDayPreview(info.dateStr)
    },
    eventDisplay: 'block',
    dayMaxEvents: 3,
    navLinks: true,
    navLinkDayClick: (date) => {
      calView.value = 'timeGridDay'
      changeView('timeGridDay')
      calendarRef.value?.getApi().gotoDate(date)
    },
  }),
)

function changeView(view: string) {
  calendarRef.value?.getApi().changeView(view)
}

function openDayPreview(dateStr: string) {
  previewDate.value = dateStr
  previewEvents.value = calendarEvents.value.filter((ev) => {
    const evDate = typeof ev.start === 'string'
      ? ev.start.split('T')[0]
      : ev.start ? format(ev.start as Date, 'yyyy-MM-dd') : null
    return evDate === dateStr
  })
  showDayPreview.value = true
}

function goToProject(projectId?: string) {
  if (!projectId) return
  showDayPreview.value = false
  router.push(`/stavba/${projectId}`)
}

onMounted(async () => {
  await stavbyStore.loadProjects()
  await zaznamyStore.loadAllEntries()
})
</script>

<style scoped lang="scss">
.kalendar-page {
  min-height: 100vh;
}

.page-header {
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 7px;
}

.view-toggle {
  flex-shrink: 0;
}

.calendar-wrapper {
  background: white;
  border-radius: 12px;
  margin: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.preview-event {
  border-left: 4px solid;
  padding: 8px 12px;
  margin-bottom: 8px;
  background: #FAFAFA;
  border-radius: 0 8px 8px 0;
  cursor: pointer;
  transition: background 0.15s;

  &:active { background: #F0F0F0; }

  .preview-title {
    font-weight: 600;
    font-size: 14px;
    color: #1A1A1A;
  }

  .preview-time {
    font-size: 12px;
    color: #757575;
    margin-top: 2px;
  }

  .preview-notes {
    font-size: 12px;
    color: #9E9E9E;
    font-style: italic;
    margin-top: 2px;
  }
}
</style>

<style lang="scss">
/* FullCalendar global overrides */
.fc {
  font-family: 'Roboto', sans-serif;
  font-size: 13px;

  .fc-toolbar-title {
    font-size: 16px;
    font-weight: 600;
    text-transform: capitalize;
  }

  .fc-daygrid-event {
    border-radius: 4px;
    font-size: 11px;
    padding: 1px 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .fc-day-today {
    background: #FFF8F5 !important;
  }

  .fc-col-header-cell {
    font-weight: 600;
    font-size: 11px;
    color: #9E9E9E;
    text-transform: uppercase;
  }

  .fc-button {
    background: transparent !important;
    color: #424242 !important;
    border: none !important;
    box-shadow: none !important;
    font-size: 18px !important;
    padding: 4px 8px !important;
  }
}
</style>
