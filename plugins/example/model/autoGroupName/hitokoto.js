export async function NameCardContent() {
  try {
    let res = await fetch('https://v1.hitokoto.cn/')
    if (!res) return ''
    let data = await res.json()
    return data.hitokoto || ''
  } catch {
    return ''
  }
}
