// Generátor UUID v4, který funguje i mimo zabezpečený kontext.
// crypto.randomUUID() je dostupné jen přes HTTPS nebo na localhostu —
// na http://<IP>:port by spadlo ("crypto.randomUUID is not a function").

export function uuid(): string {
  // 1) Nejlepší varianta (HTTPS / localhost)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  // 2) Fallback přes getRandomValues — funguje i na čistém HTTP
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const b = new Uint8Array(16)
    crypto.getRandomValues(b)
    b[6] = (b[6] & 0x0f) | 0x40 // verze 4
    b[8] = (b[8] & 0x3f) | 0x80 // varianta
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0'))
    return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`
  }

  // 3) Poslední záchrana (Math.random)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
