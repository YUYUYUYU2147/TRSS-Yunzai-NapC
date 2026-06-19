import fetch from 'node-fetch'

export async function NameCardContent() {
  let res = await fetch('https://newsnow.busiyi.world/api/s?id=toutiao').catch(() => {})
  if (!res) return '头条热搜获取失败'
  res = await res.json()
  let item = res?.items?.[0]
  if (item) {
    let t = item.title
    return t.length <= 8 ? '头条热搜:' + t : t
  }
  return '头条热搜获取失败'
}
