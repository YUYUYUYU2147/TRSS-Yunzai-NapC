import plugin from '../../lib/plugins/plugin.js'
import fs from 'fs'
import path from 'path'
import os from 'os'
import lodash from 'lodash'

const cfgPath = './data/autoGroupName.json'
const modelDir = path.join(import.meta.dirname, 'model/autoGroupName')

function defaultConfig() {
  return {
    enable: false,
    interval: 30,
    notGroup: [],
    nickname: '',
    userSuffix: '',
    active: ['SystemTime']
  }
}

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
  } catch {
    const cfg = defaultConfig()
    fs.mkdirSync(path.dirname(cfgPath), { recursive: true })
    fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2))
    return cfg
  }
}

function saveConfig(cfg) {
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2))
}

function getModelFiles() {
  try {
    if (!fs.existsSync(modelDir)) fs.mkdirSync(modelDir, { recursive: true })
    return fs.readdirSync(modelDir).filter(f => f.endsWith('.js')).map(f => f.replace('.js', ''))
  } catch { return [] }
}

async function loadModelSuffix(name) {
  let filePath = path.join(modelDir, `${name}.js`)
  if (!fs.existsSync(filePath)) return ''
  try {
    let url = 'file://' + (os.platform() === 'win32' ? '/' : '') + filePath + '?t=' + Date.now()
    let { NameCardContent } = await import(url)
    if (typeof NameCardContent === 'function') {
      let result = NameCardContent()
      if (result instanceof Promise) result = await result
      return result || ''
    }
  } catch (e) {
    logger.error(`[自动群名片] 模型 ${name} 加载失败: ${e}`)
  }
  return ''
}

async function getSuffix(cfg) {
  let acts = cfg.active || ['SystemTime']
  if (!Array.isArray(acts)) acts = [acts]
  let name = acts[Math.floor(Math.random() * acts.length)]
  if (name === 'UserSuffix') return cfg.userSuffix || ''
  return await loadModelSuffix(name)
}

function getTaskGroups(cfg) {
  let all = []
  for (let [gid, info] of Bot.gl) {
    try {
      let uid = info?.bot_id
      if (!uid) continue
      let member = Bot.pickMember(gid, uid)
      if (member?.role) all.push(gid)
    } catch {}
  }
  return lodash.difference(all, cfg.notGroup || [])
}

export class autoGroupName extends plugin {
  constructor() {
    super({
      name: '自动群名片',
      dsc: '定时更新群名片',
      event: 'message',
      priority: 4644,
      rule: [
        { reg: '^#*更新群名片', fnc: 'CardTask' },
        { reg: '^#(启用|开启|关闭|停用)自动群名片', fnc: 'toggleEnable' },
        { reg: '^#(设置|修改)自动群名片间隔(\\d+)', fnc: 'setUpdateInterval' },
        { reg: '^(#|自动化)*(切换|更改|设置)群?(名片|昵称)(前缀|自定义后缀)(.*)?$', fnc: 'setNickname' },
        { reg: '^(#|自动化)*(切换|更改|设置)(群)?(名片|昵称)(样式|格式|后缀).*', fnc: 'tabGroupCard' },
        { reg: '^(#|自动化)*(群)?(名片|昵称)(样式|格式|后缀|列表|一览|统计)+$', fnc: 'sendTabList' }
      ]
    })
  }

  async init() {
    let cfg = loadConfig()
    if (cfg.enable) {
      this._timer = setInterval(() => this.CardTask(), (cfg.interval || 30) * 60 * 1000)
      setTimeout(() => this.CardTask(), 8000)
    }
  }

  get appConfig() { return loadConfig() }
  set appConfig(v) { saveConfig(v) }

  async setNickname() {
    let match = /^(#|自动化)*(切换|更改|设置)群?(名片|昵称)(前缀|自定义后缀)(.*)?$/.exec(this.e.msg)
    let type = match[4]
    let str = match[5]?.trim()
    if (!str) {
      this.e.reply(`用法：\n#设置名片${type}[内容]`)
      return
    }
    let cfg = this.appConfig
    if (type === '前缀') cfg.nickname = str
    else if (type === '自定义后缀') cfg.userSuffix = str
    this.appConfig = cfg
    this.e.reply(`${type}已设置为：${str}`)
  }

  async tabGroupCard() {
    if (!this.e.isMaster) return
    let cfg = this.appConfig
    let names = getModelFiles()
    if (!names.length) { this.e.reply('未找到任何模型文件'); return }
    let msg = this.e.msg.replace(/^(#|自动化)*(切换|更改|设置)(群)?(名片|昵称)(样式|格式|后缀)/, '').replace(/，/g, ',').replace(/[^(\d|,)]*/g, '').trim()
    let nums = msg.split(',').map(Number).filter(n => n >= 1 && n <= names.length)
    if (!nums.length) {
      if (Array.isArray(cfg.active)) cfg.active = names[0]
      else {
        let idx = names.indexOf(cfg.active)
        cfg.active = names[(idx + 1) % names.length]
      }
    } else {
      cfg.active = nums.map(n => names[n - 1])
    }
    this.appConfig = cfg
    this.e.reply(`已切换至：${Array.isArray(cfg.active) ? cfg.active.join(', ') : cfg.active}`)
  }

  async sendTabList() {
    let cfg = this.appConfig
    let names = getModelFiles()
    if (!names.length) { this.e.reply('未找到任何模型文件'); return }
    let acts = Array.isArray(cfg.active) ? cfg.active : [cfg.active]
    let list = names.map((name, i) => `${i + 1}. ${name}${acts.includes(name) ? ' ✓' : ''}`)
    this.e.reply(
      '【群名片样式列表】\n' +
      list.join('\n') +
      '\n\n使用 #切换名片样式+序号 切换\n使用 #设置名片前缀[内容] 设置前缀\n使用 #设置名片自定义后缀[内容] 设置固定后缀'
    )
  }

  async setUpdateInterval() {
    if (!this.e.isMaster) return
    let min = parseInt(this.e.msg.match(/(\d+)/)[1])
    if (min < 1) { this.e.reply('间隔至少 1 分钟'); return }
    let cfg = this.appConfig
    cfg.interval = min
    this.appConfig = cfg
    if (cfg.enable) {
      clearInterval(this._timer)
      this._timer = setInterval(() => this.CardTask(), min * 60 * 1000)
    }
    this.e.reply(`自动群名片间隔已设为 ${min} 分钟`)
  }

  async toggleEnable() {
    if (!this.e.isMaster) return
    let on = /启用|开启/.test(this.e.msg)
    let cfg = this.appConfig
    cfg.enable = on
    this.appConfig = cfg
    if (on) {
      this.CardTask(this.e)
      if (!this._timer) this._timer = setInterval(() => this.CardTask(), (cfg.interval || 30) * 60 * 1000)
    } else {
      clearInterval(this._timer)
      this._timer = null
    }
    this.e.reply(`自动群名片已${on ? '启用' : '关闭'}`)
  }

  async CardTask(e) {
    let cfg = this.appConfig
    if (!cfg.enable && !e) return
    let groups = getTaskGroups(cfg)
    let suffix = cfg.userSuffix || await getSuffix(cfg)
    if (!suffix) { if (e) e.reply('未获取到后缀内容'); return }
    let count = 0, errs = []
    for (let gid of groups) {
      let info = Bot.gl.get(gid)
      let uid = info?.bot_id
      if (!uid) continue
      let botNick = '摸鱼ing'
      try { botNick = Bot.pickMember(gid, uid)?.nickname || Bot[uid]?.info?.nickname || botNick } catch {}
      let prefix = cfg.nickname || botNick
      let card = `${prefix}｜${suffix}`
      try {
        let member = Bot.pickMember(gid, uid)
        if (!member) continue
        if (member.card === card) continue
        let group = Bot.pickGroup(gid)
        if (!group?.setCard) continue
        await group.setCard(uid, card)
        count++
        await new Promise(r => setTimeout(r, 2000))
      } catch (err) {
        let msg = err?.message || ''
        let retcode = err?.error?.retcode
        if (msg.includes('未生效')) { count++; continue }
        if (retcode && !msg) msg = `retcode=${retcode}`
        logger.error(`[自动群名片] ${gid} 设置失败: ${msg}`)
        errs.push(`${gid}: ${msg}`)
      }
    }
    logger.info(`[自动群名片] 已更新 ${count}/${groups.length} 个群的名片`)
    if (e) e.reply(`已更新 ${count}/${groups.length} 个群的名片\n当前后缀：${suffix}\n${errs.length ? '失败：\n' + errs.join('\n') : ''}`)
  }
}
