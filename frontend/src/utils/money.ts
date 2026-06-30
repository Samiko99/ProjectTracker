// Formátování částky s libovolnou měnou (uživatel ji zadává jako text, např. Kč, €, EUR).
export function formatMoney(amount: number, currency = 'Kč'): string {
  const n = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 }).format(
    Math.round(amount),
  )
  return `${n} ${currency || 'Kč'}`.trim()
}
