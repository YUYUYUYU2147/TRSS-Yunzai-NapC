import fetch from 'node-fetch'

export async function NameCardContent() {
  let res = await fetch('https://newsnow.busiyi.world/api/s?id=baidu').catch(() => {})
  if (!res) return '百度热搜获取失败'
  res = await res.json()
  let item = res?.items?.[0]
  if (item) {
    let t = item.title
    return t.length <= 8 ? '百度热搜:' + t : t
  }
  return '百度热搜获取失败'
}
