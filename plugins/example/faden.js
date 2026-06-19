import plugin from '../../lib/plugins/plugin.js';
import fetch from 'node-fetch'

const faden_api = 'http://113.31.103.19:8848/'

export class Mio extends plugin {
  constructor(e) {
    super({
      name: '澪',
      dsc: '自己做着玩的',
      event: 'message',
      priority: 999999999999999,
      rule: [{
        fnc: 'faden'
      }]
    });
  }

  async get_poker(e, qq) {
    let poker = null
    for (let i = 0; i < 3; i++) {
      try {
        const group_member = e.group.pickMember(qq, false)
        poker = await group_member?.info || await group_member?.getInfo?.()
        if (poker) break
      } catch (error) {
        console.error('[Mio] get_poker 错误：', error)
        return false
      }
    }
    if (poker == null) {
      return null
    }
    const name = (poker.title || poker.card || poker.nickname)
    return name
  }

  async faden(e) {
    // 用完整原始消息判断是否以 !! 结尾
    let fullMsg = e.raw_message || e.msg
    if (!/[！！]{2}$/.test(fullMsg)) {
      return;
    }

    // 确定目标 QQ
    let targetQq = e.user_id
    for (const m of e.message) {
      if (m.type === 'at') {
        targetQq = m.qq
        break
      }
    }

    const name = await this.get_poker(e, targetQq)
    if (!name) return;

    console.log('[Mio][当场发电][' + name + ']')

    let url = new URL('', faden_api);
    url.searchParams.set('name', name)
    url.searchParams.set('t', new Date().getTime())

    try {
      let response = await fetch(url.toString());
      if (response.status === 200) {
        let json = await response.json();
        await this.reply(json.text, true)
      } else {
        await e.reply('连接api接口失败！错误原因：' + response.statusText)
      }
    } catch (err) {
      logger.error('连接api接口失败！错误原因：', err)
      await e.reply('连接api接口失败！错误原因：' + err)
    }
  }
}
