/**
 * 介绍：计算今日人品(根据时间和QQ号等概率哈希，所以结果仅供参考)
 * 样例：今日人品
 */

import plugin from '../../lib/plugins/plugin.js'
import fs from 'fs'
import path from 'path'

export class example extends plugin {
  constructor () {
    super({
      name: 'ys-今日人品',
      dsc: 'ys-今日人品',
      event: 'message',
      priority: 5000,
      rule: [{
        reg: '^#?(今日人品|jrrp)$', fnc: 'jrrp'
      }]
    })
  }

  async jrrp (e) {
    let qq = e.sender.user_id
    let today = new Date()
    let past = today.getDate() - 1
    today.setDate(past)
    today.setHours(0, 0, 0, 0)
    let seed = (today * qq).toString()
    let randomNumber = this.hashCode(seed)
    let res = Math.abs(this.hashCode(Math.abs(randomNumber).toString())) % 101
    let comment = this.generateComment(res)

    const dioDir = './data/ys-dio-pic'
    let dioPicList = fs.readdirSync(dioDir)
    if (dioPicList.length === 0) {
      e.reply([
        segment.at(qq),
        '你今天的人品是：',
        comment,
        '\n提示：沙雕图文件夹为空，请执行以下命令获取图片:\ngit clone --depth=1 https://gitee.com/bling_yshs/ys-dio-pic-repo.git'
      ])
      return
    }

    let dioTuPath = path.join(dioDir, dioPicList[Math.floor(Math.random() * dioPicList.length)])
    e.reply([
      segment.at(qq),
      '你今天的人品是：',
      comment,
      segment.image(dioTuPath)
    ])
  }

  /**
   * 生成评论
   *
   * @param {number} num
   */
  generateComment (num) {
    let comment = ''
    switch (true) {
      case (num === 0):
        comment = `${num}！就连班尼特也会为你流泪… 下次一定会更好！(´；ω；\`)`
        break
      case (num < 10):
        comment = `${num}！这一定是「天动万象」的考验，坚持住！(๑•̀ㅂ•́)و✧`
        break
      case (num < 20):
        comment = `${num}… 今天的冒险似乎不太顺利呢，要不去晨曦酒庄喝一杯？(›´ω\`‹ )`
        break
      case (num < 30):
        comment = `${num}，听说璃月港的商人正在打折，去碰碰运气吧！( • ̀ω•́ )✧`
        break
      case (num < 40):
        comment = `${num}！就像香菱的新菜品，虽然有点冒险但充满可能！(๑´ڡ\`๑)`
        break
      case (num < 50):
        comment = `${num}，蒙德城的鸽子都在为你加油哦～(ฅ>ω<*ฅ)`
        break
      case (num === 50):
        comment = `${num}！平衡之道就像岩王帝君的契约～(・ω< )★`
        break
      case (num < 60):
        comment = `${num}，风神的祝福正在路上！(ฅ´ω\`ฅ)`
        break
      case (num < 70):
        comment = `${num}！今天的委托奖励说不定能翻倍哦～(≧ω≦)/`
        break
      case (num < 80):
        comment = `${num}！此等运势，当浮一大「觥」！( ￣▽￣)σ`
        break
      case (num < 90):
        comment = `${num}！此即「雷光千道」般的好运！(๑•̀ᄇ•́)و ✧`
        break
      case (num < 100):
        comment = `${num}！距离「天理」的眷顾只差一步！(ﾉ>ω<)ﾉ`
        break
      case (num === 100):
        comment = `${num}！！！「我，尘世闲游，见此祥瑞」（钟离鼓掌.jpg）`
        break
      default:
        comment = '「星空」中似乎找不到你的运势呢...（派蒙疑惑）'
    }
    return comment
  }

  hashCode (str) {
    let hash = 0
    if (str.length === 0) return hash
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash &= hash
    }
    return hash
  }
}
