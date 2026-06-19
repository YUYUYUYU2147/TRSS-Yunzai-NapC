import os from 'os'
export function NameCardContent() {
  let pct = ((1 - os.freemem() / os.totalmem()) * 100).toFixed(1)
  return `内存占用${pct}%`
}
