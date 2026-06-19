export function NameCardContent() {
  let now = new Date()
  let h = now.getHours(), m = now.getMinutes()
  if (h < 10) h = '0' + h
  if (m < 10) m = '0' + m
  return `${h}:${m}`
}
