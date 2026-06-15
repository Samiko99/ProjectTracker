import { ref } from 'vue'
import { cs, enUS } from 'date-fns/locale'
import { messages } from './messages'

export type Locale = 'cs' | 'en'

const STORAGE_KEY = 'app.locale'

function detect(): Locale {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'cs' || saved === 'en') return saved
  // Podle prohlížeče, jinak čeština
  return navigator.language?.startsWith('en') ? 'en' : 'cs'
}

export const locale = ref<Locale>(detect())

export function setLocale(l: Locale) {
  locale.value = l
  localStorage.setItem(STORAGE_KEY, l)
}

/**
 * Překlad klíče. Čte locale.value reaktivně → šablony se překreslí při změně jazyka.
 * Fallback: en → cs → samotný klíč.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const dict = messages[locale.value] as Record<string, string>
  let str = dict[key] ?? (messages.cs as Record<string, string>)[key] ?? key
  if (params) {
    for (const k of Object.keys(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(params[k]))
    }
  }
  return str
}

// Locale pro date-fns (čte locale.value → reaktivní v šablonách)
export function dateFnsLocale() {
  return locale.value === 'en' ? enUS : cs
}

export function useI18n() {
  return { t, locale, setLocale }
}
