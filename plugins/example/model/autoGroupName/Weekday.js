const days = ['日', '一', '二', '三', '四', '五', '六']
export function NameCardContent() {
  return `星期${days[new Date().getDay()]}`
}
