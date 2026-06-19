import moment from 'moment'
import common from '../../lib/common/common.js'

// 作用是群友发送消息时概率回复羡慕+消息内容

// 羡慕概率 0.01 表示 1%
const envyProbability = 0.01

// 羡慕开头时复读概率 0.01 表示 1%
const envyStartProbability = 0.99

// 最大羡慕的消息长度
const maxTextLength = 10

// 羡慕消息模板 {{msg}}为消息内容
const envyMsg = [
  '羡慕{{msg}}'
]

export class example extends plugin {
  constructor () {
    super({
      name: '自动羡慕',
      dsc: '自动羡慕',
      event: 'message.group',
      priority: -Infinity,
      rule: [
        {
          reg: '^#?羡慕统计$',
          fnc: 'statistics'
        },
        {
          reg: '',
          fnc: 'envy',
          log: false
        }
      ]
    })
  }

  async statistics (e) {
    if (!e.isMaster) {
      return e.reply('HiyoHiyo~')
    }
    const data = []
    for (let i = 0; i >= -1; i--) {
      const now = moment().add(i, 'days').format('YYYY-MM-DD')
      const msgs = JSON.parse(await redis.get(`envy:${now}`) || '[]')
      if (msgs.length) {
        data.push(now + '\n' + `共${msgs.length}条`)
        data.push(msgs.join('\n'))
      }
    }
    if (!data.length) {
      e.reply('还没有羡慕')
      return true
    }
    e.reply(await common.makeForwardMsg(e, data))
    return true
  }

  envy (e) {
    const msg = e.msg
    if (msg && !msg.startsWith('#')) {
      if (msg.length < maxTextLength && Math.random() < envyProbability) {
        const template = envyMsg[Math.floor(Math.random() * envyMsg.length)]
        e.reply(template.replace('{{msg}}', msg))
        set(msg)
      } else if (msg.startsWith('羡慕') && Math.random() < envyStartProbability) {
        e.reply(msg)
      }
    }
    return false
  }
}

let start = moment().format('YYYY-MM-DD')
const cache = JSON.parse(await redis.get(`envy:${start}`) || '[]')

async function set (msg) {
  const now = moment().format('YYYY-MM-DD')
  if (now !== start) {
    start = now
    cache.length = 0
  }
  cache.push(msg)
  await redis.set(`envy:${start}`, JSON.stringify(cache), { EX: 60 * 60 * 24 * 3 })
}
