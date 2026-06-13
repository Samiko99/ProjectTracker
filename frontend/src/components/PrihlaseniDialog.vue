<template>
  <q-dialog v-model="show" position="bottom" class="bottom-sheet-dialog">
    <q-card class="dialog-card">
      <div class="drag-handle" />

      <div class="dialog-header q-px-md q-pb-sm">
        <div class="dialog-title">
          {{ mode === 'login' ? 'Přihlášení' : 'Registrace' }}
        </div>
        <div class="dialog-sub">
          {{ mode === 'login' ? 'Přihlas se pro synchronizaci dat' : 'Vytvoř si účet pro zálohu a synchronizaci' }}
        </div>
      </div>

      <q-separator />

      <div class="q-pa-md">
        <q-input
          v-if="mode === 'register'"
          v-model="form.name"
          label="Jméno *"
          outlined
          dense
          class="q-mb-sm"
        />
        <q-input
          v-model="form.email"
          label="E-mail *"
          type="email"
          outlined
          dense
          class="q-mb-sm"
          autocomplete="email"
        />
        <q-input
          v-model="form.password"
          label="Heslo *"
          :type="showPassword ? 'text' : 'password'"
          outlined
          dense
          class="q-mb-sm"
          @keyup.enter="submit"
        >
          <template #append>
            <q-icon
              :name="showPassword ? 'visibility_off' : 'visibility'"
              class="cursor-pointer"
              @click="showPassword = !showPassword"
            />
          </template>
        </q-input>

        <div v-if="errorMsg" class="error-box">
          <q-icon name="error_outline" size="16px" />
          {{ errorMsg }}
        </div>

        <q-btn
          unelevated
          color="primary"
          class="full-width q-mt-sm"
          :label="mode === 'login' ? 'Přihlásit se' : 'Zaregistrovat se'"
          :loading="submitting"
          @click="submit"
        />

        <div class="switch-mode q-mt-md text-center">
          <span class="text-grey-6">
            {{ mode === 'login' ? 'Nemáš účet?' : 'Už máš účet?' }}
          </span>
          <q-btn
            flat
            dense
            no-caps
            color="primary"
            :label="mode === 'login' ? 'Zaregistruj se' : 'Přihlas se'"
            @click="toggleMode"
          />
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '../stores/auth'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  'logged-in': []
}>()

const $q = useQuasar()
const authStore = useAuthStore()

const show = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const mode = ref<'login' | 'register'>('login')
const submitting = ref(false)
const showPassword = ref(false)
const errorMsg = ref('')
const form = ref({ name: '', email: '', password: '' })

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      errorMsg.value = ''
      form.value = { name: '', email: '', password: '' }
      mode.value = 'login'
    }
  },
)

function toggleMode() {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  errorMsg.value = ''
}

async function submit() {
  errorMsg.value = ''
  if (!form.value.email.trim() || !form.value.password) {
    errorMsg.value = 'Vyplň e-mail a heslo'
    return
  }
  if (mode.value === 'register' && !form.value.name.trim()) {
    errorMsg.value = 'Vyplň jméno'
    return
  }

  submitting.value = true
  try {
    if (mode.value === 'login') {
      await authStore.login(form.value.email.trim(), form.value.password)
    } else {
      await authStore.register(
        form.value.email.trim(),
        form.value.password,
        form.value.name.trim(),
      )
    }
    $q.notify({ type: 'positive', message: 'Přihlášeno' })
    show.value = false
    emit('logged-in')
  } catch (e) {
    errorMsg.value = (e as Error).message
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
.dialog-header {
  padding-top: 4px;
  .dialog-title {
    font-size: 18px;
    font-weight: 600;
    color: #1a1a1a;
  }
  .dialog-sub {
    font-size: 13px;
    color: #9e9e9e;
    margin-top: 2px;
  }
}

.error-box {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #ffebee;
  color: #c62828;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  margin: 4px 0;
}

.switch-mode {
  font-size: 13px;
}
</style>
