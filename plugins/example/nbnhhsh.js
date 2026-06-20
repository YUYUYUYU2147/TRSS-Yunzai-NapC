import plugin from '../../lib/plugins/plugin.js'

const API_URL = 'https://lab.magiconch.com/api/nbnhhsh/guess'

export class nbnhhsh extends plugin {
  constructor() {
    super({
      name: '缩写查询',
      event: 'message',
      priority: 5000,
      rule: [
        { reg: '^#?(缩写|啥意思)\\s*(.+)$', fnc: 'query' },
        { reg: '^[A-Za-z0-9]{2,20}$', fnc: 'autoQuery', log: false }
      ]
    })
  }

  async query(e) {
    let word = e.msg.replace(/^#?(缩写|啥意思)\s*/, '').trim()
    if (!word) return e.reply('用法：缩写 yyds', true)
    await this.fetchAndReply(e, word, false)
    return true
  }

  async autoQuery(e) {
    if (!e?.raw_message || e.raw_message.length > 20) return
    if (typeof e.message === 'string') return
    if (e.message?.some?.(i => i.type === 'image' || i.type === 'face' || i.type === 'mface' || i.type === 'video' || i.type === 'at')) return
    if (e.source || e.quote || e.hasReply) return
    await this.fetchAndReply(e, e.raw_message, true)
    return true
  }

  async fetchAndReply(e, word, auto) {
    try {
      let r = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: word })
      })
      let data = await r.json()
      if (!Array.isArray(data) || !data.length) return auto ? undefined : e.reply('未找到该缩写的含义', true)
      let trans = data[0].trans || data[0].inputting
      if (!trans?.length) return auto ? undefined : e.reply('未找到该缩写的含义', true)
      if (auto && trans.length === 1 && /^(脸|图片|图像|照片|文件|视频|音频|声音|文本|文字)$/.test(trans[0])) return
      e.reply(trans.join('、'), true)
    } catch (err) {
      if (!auto) e.reply('查询失败，请稍后再试', true)
    }
  }
}