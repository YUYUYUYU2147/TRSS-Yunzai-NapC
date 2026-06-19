//插件作者：馨儿（2311417356） 于2023/02/14编写，未经允许禁止转发.
//首发群云溪院(789125977)，一切群外传播皆视为倒卖狗
//适配 LLOneBot/NapCat 版本

let botname = '琪宝' // 此处修改为自己的Bot名字.
let master = '姐姐' // 此处修改为主人自定义名字.

//图库链接
let img_1 = `http://i.imgtg.com/2023/02/16/dvmpi.jpg`
let img_2 = `http://i.imgtg.com/2023/02/16/dvpYX.jpg`
let img_3 = `http://i.imgtg.com/2023/02/16/dvP5t.gif`
let img_4 = `http://i.imgtg.com/2023/02/16/dvRKx.jpg`
let img_5 = `http://i.imgtg.com/2023/02/16/dvH1U.jpg`
let img_6 = `http://i.imgtg.com/2023/02/16/dyPPP.jpg`
let img_7 = `http://i.imgtg.com/2023/02/16/dyAvM.jpg`
let img_8 = `http://i.imgtg.com/2023/02/16/dvSpc.jpg`
let img_9 = `http://i.imgtg.com/2023/02/16/dvV01.gif`
let img_10 = `http://i.imgtg.com/2023/02/16/dvYwI.jpg`
let img_11 = `http://i.imgtg.com/2023/02/16/dyoXN.jpg`

export class chuo extends plugin {
  constructor() {
    super({
      name: '不要这样对主人辣',
      dsc: '戳一戳主人图片回复',
      event: 'notice.group.poke',
      priority: -100000,
      rule: [{
        reg: '',
        fnc: 'chuomaster'
      }]
    })
  }
  async chuomaster(e) {
    logger.info('[戳一戳生效]')
    // 安全打印（避免循环引用）
    const safeKeys = Object.keys(e).filter(k => k !== 'runtime' && k !== 'group' && k !== 'bot')
    const safeInfo = {}
    for (const k of safeKeys) {
      const v = e[k]
      if (typeof v === 'object' && v !== null) {
        safeInfo[k] = `[${typeof v}: ${Object.keys(v).join(',')}]`
      } else {
        safeInfo[k] = v
      }
    }
    logger.info(`[戳一戳调试] 事件字段:`, safeInfo)
    logger.info(`[戳一戳调试] raw_event:`, e.raw_event ? (typeof e.raw_event === 'string' ? e.raw_event.slice(0, 500) : JSON.stringify(e.raw_event).slice(0, 500)) : '无')

    // LLOneBot/NapCat 下，尝试多种可能的字段名获取操作者ID
    const pokerId = e.operator_id || e.user_id || e.nick_id || e.from_id || e.qq
    const targetId = e.target_id || e.to_id || e.self_id

    logger.info(`[戳一戳调试] 操作者ID(pokerId): ${pokerId}, 被戳者ID(targetId): ${targetId}`)

    // 获取主人列表，兼容不同配置方式
    let masterQQ = []
    try {
      if (Bot && Bot.cfg && Bot.cfg.masterQQ) {
        masterQQ = Bot.cfg.masterQQ
        logger.info(`[戳一戳调试] 从 Bot.cfg.masterQQ 获取到: ${JSON.stringify(masterQQ)}`)
      }
    } catch (err) { logger.info(`[戳一戳调试] Bot.cfg 获取失败:`, err.message) }
    
    if (masterQQ.length === 0 && e.runtime && e.runtime.cfg && e.runtime.cfg.masterQQ) {
      masterQQ = e.runtime.cfg.masterQQ
      logger.info(`[戳一戳调试] 从 e.runtime 获取到: ${JSON.stringify(masterQQ)}`)
    }

    if (masterQQ.length === 0) {
      logger.info('[戳一戳调试] 未找到主人配置，跳过判断直接回复')
    }

    // 检查被戳的是不是主人（如果没有配置主人则对所有戳都回复）
    let isMaster = true
    if (masterQQ.length > 0) {
      isMaster = masterQQ.includes(Number(targetId)) || masterQQ.includes(String(targetId))
    }
    if (!isMaster) {
      return false
    }
    logger.info('[戳一戳调试] 确认是主人，准备回复')

    // 黑名单
    let blackList = []
    if (blackList.includes(Number(pokerId)) || blackList.includes(String(pokerId))) {
      return false
    }

    // 戳一戳回复
    let choose = Math.round(Math.random() * 11)
    let msgList

    if (choose == 1) {
      msgList = [
        segment.at(pokerId),
        `坏人，你对${master}干嘛呢!`,
        segment.image(img_1)
      ]
    } else if (choose == 2) {
      msgList = [
        segment.at(pokerId),
        `你太坏了，${botname}要为${master}报仇!`,
        segment.image(img_2)
      ]
    } else if (choose == 3) {
      msgList = [
        segment.at(pokerId),
        `${master}是${botname}的，你不可以这样对${master}`,
        segment.image(img_3)
      ]
    } else if (choose == 4) {
      msgList = [
        segment.at(pokerId),
        `你很可爱哦~${botname}很喜欢你（才怪））~`,
        segment.image(img_4)
      ]
    } else if (choose == 5) {
      msgList = [
        segment.at(pokerId),
        `坏人，${botname}记住你了!`,
        segment.image(img_5)
      ]
    } else if (choose == 6) {
      msgList = [
        segment.at(pokerId),
        `${botname}劝你去欺负那边那个佬佬`,
        segment.image(img_6)
      ]
    } else if (choose == 7) {
      msgList = [
        segment.at(pokerId),
        `${botname}咬洗你！`,
        segment.image(img_7)
      ]
    } else if (choose == 8) {
      msgList = [
        segment.at(pokerId),
        `${botname}做了一个伟大的决定！`,
        segment.image(img_8)
      ]
    } else if (choose == 9) {
      msgList = [
        segment.at(pokerId),
        `${botname}生气了，你老欺负${master}`,
        segment.image(img_9)
      ]
    } else if (choose == 10) {
      msgList = [
        segment.at(pokerId),
        `你个坏人！${botname}要喊人了！`,
        segment.image(img_10)
      ]
    } else {
      msgList = [
        segment.at(pokerId),
        `不！许！碰！${botname}的${master}！`,
        segment.image(img_11)
      ]
    }

    e.reply(msgList, true)
    return false
  }
}
