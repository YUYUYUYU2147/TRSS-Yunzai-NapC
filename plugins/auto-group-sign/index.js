import schedule from 'node-schedule'
import fs from 'node:fs'

const cfgPath = './data/autoGroupSign.json'

function loadCfg() {
  try {
    return JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
  } catch {
    const cfg = { hour: 0, minute: 0 }
    fs.mkdirSync('./data', { recursive: true })
    fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2))
    return cfg
  }
}

async function doSign(bot) {
  if (!bot || typeof bot.sendApi !== 'function') return

  try {
    const res = await bot.sendApi('get_group_list')
    const groups = res?.data || (Array.isArray(res) ? res : [])
    if (!groups.length) return

    let count = 0
    for (const g of groups) {
      const gid = g.group_id
      if (!gid) continue
      try {
        const r = await bot.sendApi('send_group_sign', { group_id: gid })
        if (r?.retcode === 0) count++
        await new Promise(r => setTimeout(r, 1000))
      } catch (e) {
        logger.warn(`[自动群打卡][${bot.uin}] 群 ${gid} 打卡失败: ${e.message}`)
      }
    }
    logger.mark(`[自动群打卡][${bot.uin}] 完成 ${count}/${groups.length} 个群`)
  } catch (err) {
    logger.error(`[自动群打卡][${bot.uin}] 异常:`, err)
  }
}

async function tick() {
  const cfg = loadCfg()
  const now = new Date()
  if (now.getHours() !== cfg.hour || now.getMinutes() !== cfg.minute) return

  const bots = Bot?.bots && typeof Bot.bots === 'object'
    ? Object.values(Bot.bots).filter(b => b && typeof b.sendApi === 'function')
    : []
  for (const bot of bots) await doSign(bot.uin)
}

const JOB_NAME = 'auto-group-sign-check'
if (schedule.scheduledJobs[JOB_NAME]) schedule.scheduledJobs[JOB_NAME].cancel()
schedule.scheduleJob(JOB_NAME, '* * * * *', tick)

export class autoGroupSign extends plugin {
  constructor() {
    super({
      name: '自动群打卡',
      dsc: '每天定时自动群打卡（支持多Bot）',
      event: 'message',
      priority: 5000,
    })
  }
}
