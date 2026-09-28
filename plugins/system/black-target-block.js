import cfg from '../../lib/config/config.js'

/**
 * 阻止任何人通过 @ 黑名单用户来触发指令
 * 主人不受限制。
 */
export class blackTargetBlock extends plugin {
  constructor () {
    super({
      name: '黑名单目标拦截',
      dsc: '被拉黑用户被他人@作为指令目标时也不允许触发',
      event: 'message',
      priority: -99999
    })
  }

  async accept (e) {
    if (e.isMaster || !e.isGroup || !Array.isArray(e.message)) return false

    const blackUser = cfg.getOther()?.blackUser || []
    if (!blackUser.length) return false

    const blackSet = new Set(blackUser.map(String))
    const botSet = new Set([e.self_id, ...(Array.isArray(Bot.uin) ? Bot.uin : [Bot.uin])]
      .filter(Boolean)
      .map(String))
    const atList = e.message
      .filter(i => i?.type === 'at')
      .map(i => String(i.qq || i.data?.qq || i.id || i.data?.id || ''))
      .filter(qq => qq && !botSet.has(qq))

    // 只拦截 @ 被拉黑的真人用户；@机器人自身不能被这个插件拦截
    if (!atList.some(qq => blackSet.has(qq))) return false

    // 只拦截“有可能触发指令”的消息，避免普通聊天 @ 黑名单用户也被插件处理。
    const isCommand = e.only_reply_at || /^[#*%&!￥]/.test(e.msg || '')
    if (!isCommand) return false

    return 'return'
  }
}
