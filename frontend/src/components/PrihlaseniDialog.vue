<template>
  <q-dialog v-model="show" position="bottom" class="bottom-sheet-dialog">
    <q-card class="dialog-card">
      <div class="drag-handle" />

      <div class="dialog-header q-px-md q-pb-sm">
        <div class="dialog-title">
          {{ mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle') }}
        </div>
        <div class="dialog-sub">
          {{ mode === 'login' ? t('auth.loginSub') : t('auth.registerSub') }}
        </div>
      </div>

      <q-separator />

      <div class="q-pa-md">
        <q-input
          v-if="mode === 'register'"
          v-model="form.name"
          :label="t('auth.name')"
          outlined
          dense
          class="q-mb-sm"
        />
        <q-input
          v-model="form.email"
          :label="t('auth.email')"
          type="email"
          outlined
          dense
          class="q-mb-sm"
          autocomplete="email"
        />
        <q-input
          v-model="form.password"
          :label="t('auth.password')"
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
          :label="mode === 'login' ? t('auth.loginBtn') : t('auth.registerBtn')"
          :loading="submitting"
          @click="submit"
        />

        <div class="switch-mode q-mt-md text-center">
          <span class="text-grey-6">
            {{ mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount') }}
          </span>
          <q-btn
            flat
            dense
            no-caps
            color="primary"
            :label="mode === 'login' ? t('auth.goRegister') : t('auth.goLogin')"
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
import { t } from '../i18n'

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
    errorMsg.value = t('auth.fillEmailPass')
    return
  }
  if (mode.value === 'register' && !form.value.name.trim()) {
    errorMsg.value = t('auth.fillName')
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
    $q.notify({ type: 'positive', message: t('auth.loggedIn') })
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
