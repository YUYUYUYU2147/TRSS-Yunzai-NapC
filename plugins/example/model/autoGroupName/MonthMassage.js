import moment from 'moment'

export async function NameCardContent() {
  let month = Number(moment().month()) + 1
  let monthKey = 'Yz:count:sendMsg:month:'
  let count = await redis.get(`${monthKey}${month}`) || 0
  return `本月已发送${count}条消息`
}
