/**
 * 效果：检测到消息带有Github链接时，自动生成仓库卡片
 */

import plugin from '../../lib/plugins/plugin.js'

export class example extends plugin {
  constructor () {
    super({
      name: 'Github仓库卡片生成',
      dsc: '检测到 Github 仓库链接时生成仓库卡片并发送',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^(https?:\/\/)?(www\.)?github\.com\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)(\.git)?$',
          fnc: 'generateCard'
        }
      ]
    })
  }
  
  async generateCard (e) {
    // 正则匹配 Github 仓库链接
    const regex = /^(https?:\/\/)?(www\.)?github\.com\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)(\.git)?$/g
    const urlMatch = e.raw_message.match(regex)[0]
    // 正则匹配 用户/仓库名
    const repoReg = /(?<=github.com\/).*?(?=.git|$)/g
    const repoMatch = urlMatch.match(repoReg)[0]
    // 生成卡片图片链接
    const pngUrl = `https://socialify.git.ci/${repoMatch}/jpg?description=1&font=Inter&forks=1&language=1&name=1&owner=1&pattern=Circuit%20Board&stargazers=1&theme=Light`
    // 发送图片
    e.reply(segment.image(pngUrl))
  }
}
