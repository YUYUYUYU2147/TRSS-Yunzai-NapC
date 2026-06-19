import plugin from '../../lib/plugins/plugin.js'
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { Readable } from 'stream'
import { finished } from 'stream/promises'

/**
 * 棉宝魔法配置区 (｡•̀ᴗ-)✧
 */
const CD_SECONDS = 3
const ALLOWED_GROUPS = [] // 这里填入允许的群号，例如 [123, 456]。如果是空的 [] 则所有群都生效哦！
const ENABLE_PRIVATE = false // 是否开启私聊响应？true为开启，false为关闭 (๑>◡<๑)

// --- 跨时空记忆区 ---
const lastReplyTime = {}
const tempLists = {} 

export class QA extends plugin {
  constructor() {
    super({
      name: '棉宝-全能问答',
      event: 'message',
      priority: 100, // 提升优先级 (。-`ω´-) 从5000改为100
      rule: [
        {
          // 这里的正则也升级，兼容换行符
          reg: '^~添加(模糊|精确)问[\\s\\S]*答[\\s\\S]*$',
          fnc: 'addQA'
        },
        {
          reg: '^~问答列表$',
          fnc: 'listQA'
        },
        {
          reg: '^~(删除问答|问答删除)[\\s\\S]*$',
          fnc: 'deleteQA'
        },
        {
          reg: '.*',
          fnc: 'handleQA',
          log: false
        }
      ]
    })
    this.baseDir = path.join(process.cwd(), 'plugins/example/qadata')
    this.dataPath = path.join(this.baseDir, 'qadata.jsonl')
  }

  getIdentifier(e) {
    if (e.isGroup) return `group:${e.group_id}`
    return `user:${e.user_id}`
  }

  // 使用 Node.js 原生 fetch 下载图片 (无需安装 axios)
  async downloadImg(url) {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true })
    }
    const name = `img_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`
    const imgPath = path.join(this.baseDir, name)
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      
      const fileStream = fs.createWriteStream(imgPath)
      // 将 fetch 的 body 转换为可读流并保存
      await finished(Readable.fromWeb(response.body).pipe(fileStream))
      return name
    } catch (e) {
      console.error('[棉宝QA] 图片下载失败：', e)
      return null
    }
  }

  getDataLines() {
    if (!fs.existsSync(this.dataPath)) return []
    try {
      const content = fs.readFileSync(this.dataPath, 'utf-8')
      return content.split('\n').map(l => l.trim()).filter(line => {
        if (!line) return false
        try {
          JSON.parse(line)
          return true
        } catch (e) {
          return false
        }
      })
    } catch (e) {
      return []
    }
  }

  saveData(lines) {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true })
    }
    fs.writeFileSync(this.dataPath, lines.join('\n') + '\n', 'utf-8')
  }

  checkCD(e) {
    // --- 棉宝的访问权限判定 (。-`ω´-) ---
    if (e.isGroup) {
      if (ALLOWED_GROUPS.length > 0 && !ALLOWED_GROUPS.includes(e.group_id)) {
        return false
      }
    } else {
      if (!ENABLE_PRIVATE) {
        return false
      }
    }

    const id = this.getIdentifier(e)
    const now = Date.now()
    if (lastReplyTime[id] && (now - lastReplyTime[id]) < CD_SECONDS * 1000) {
      return false
    }
    lastReplyTime[id] = now
    return true
  }

  async addQA(e) {
    // 权限校验：主人或管理员。注意：私聊时 e.isAdmin 可能为 false，所以主人判断在前
    if (!e.isMaster && !e.isAdmin) {
      await e.reply("(｡•́︿•̀｡) 只有管理员才能教我新知识哦！")
      return true
    }

    // 重点：使用 [\\s\\S]* 来匹配包括换行在内的所有内容 (。-`ω´-)
    const reg = /^~添加(模糊|精确)问([\s\S]*)答([\s\S]*)$/
    const match = e.msg.match(reg)
    if (!match) return false

    const type = match[1]
    const q = match[2].trim()
    let a = match[3].trim()
    const f = type === '模糊' ? 1 : 0

    // 图片处理：支持直接获取消息里的图片
    if (e.img && e.img.length > 0) {
      const imgName = await this.downloadImg(e.img[0])
      if (imgName) {
        a += ` [img:${imgName}]`
      }
    }

    const lines = this.getDataLines()
    lines.push(JSON.stringify({ f, q, a }))
    
    try {
      this.saveData(lines)
      await e.reply(`(๑>◡<๑) 我已经把新知识记下来啦！\n类型：${type}问\n问题：${q}`)
    } catch (err) {
      await e.reply(`(｡>ㅅ<｡) 呜呜，记笔记失败了：${err.message}`)
    }
    return true
  }

  async listQA(e) {
    const id = this.getIdentifier(e)
    const lines = this.getDataLines()
    if (lines.length === 0) {
      await e.reply('(｡•́︿•̀｡) 棉宝的口袋空空，还没有问答数据呢。')
      return true
    }
    tempLists[id] = lines

    const MAX_ANS_LEN = 30 // 答案限制30个字符
    let formattedLines = []
    for (let i = 0; i < lines.length; i++) {
      try {
        const item = JSON.parse(lines[i])
        const type = item.f === 1 ? '[模糊]' : '[精确]'
        let ans = item.a
        if (ans.length > MAX_ANS_LEN) {
          ans = ans.substring(0, MAX_ANS_LEN) + '...'
        }
        formattedLines.push(`${i + 1}. ${type} ${item.q} -> ${ans}`)
      } catch (err) {
        formattedLines.push(`${i + 1}. [损坏的数据]`)
      }
    }

    if (lines.length <= 10) {
      // 10组以内直接回复
      let msg = ['(๑>◡<๑) 我的知识库清单：\n', ...formattedLines]
      msg.push('\n使用指令~删除问答+编号进行删除，多个编号之间用，分割')
      await e.reply(msg.join('\n'))
    } else {
      // 超过10组使用合并转发消息
      let msgNodes = []
      msgNodes.push({
        message: '(๑>◡<๑) 我的知识库清单：',
        nickname: Bot.nickname,
        user_id: Bot.uin
      })

      // 每10个一组进行分页
      for (let i = 0; i < formattedLines.length; i += 10) {
        let chunk = formattedLines.slice(i, i + 10)
        msgNodes.push({
          message: chunk.join('\n'),
          nickname: Bot.nickname,
          user_id: Bot.uin
        })
      }

      msgNodes.push({
        message: '使用指令~删除问答+编号进行删除，多个编号之间用，分割',
        nickname: Bot.nickname,
        user_id: Bot.uin
      })

      // 注意：Bot.makeForwardMsg 的参数格式可能因版本而异，这里采用标准格式
      let forwardMsg = await Bot.makeForwardMsg(msgNodes)
      await e.reply(forwardMsg)
    }
    return true
  }

  async deleteQA(e) {
    // 权限校验 (。-`ω´-)
    if (!e.isMaster && !e.isAdmin) {
      await e.reply("(｡•́︿•̀｡) 只有管理员才能抹掉我的记忆哦！")
      return true
    }

    const id = this.getIdentifier(e)
    if (!tempLists[id]) {
      await e.reply('(｡>ㅅ<｡) 请先发送 ~问答列表 查看编号后再进行删除操作哦！')
      return true
    }
    const reg = /^~(删除问答|问答删除)([\s\S]*)$/
    const match = e.msg.match(reg)
    const numStr = (match[2] || '').trim()
    if (!numStr) {
      await e.reply('(｡•́︿•̀｡) 主人还没告诉我要删掉哪个编号呢！')
      return true
    }
    const indices = numStr.split(/,|，/).map(n => parseInt(n.trim()) - 1).filter(n => !isNaN(n))
    const oldLines = tempLists[id]
    const linesToDelete = []
    const newLines = []
    for (let i = 0; i < oldLines.length; i++) {
      if (indices.includes(i)) {
        linesToDelete.push(oldLines[i])
        try {
          const item = JSON.parse(oldLines[i])
          const imgMatch = item.a.match(/\[img:(.*?)\]/)
          if (imgMatch) {
            const imgPath = path.join(this.baseDir, imgMatch[1])
            if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath)
          }
        } catch (e) {}
      } else {
        newLines.push(oldLines[i])
      }
    }
    try {
      this.saveData(newLines)
      await e.reply(`(๑˃ᴗ˂)ﻭ 已经成功抹掉这 ${linesToDelete.length} 组记忆。`)
    } catch (err) {
      await e.reply(`(｡>ㅅ<｡) 呜呜，删除失败了：${err.message}`)
    }
    delete tempLists[id]
    return true
  }

  async handleQA(e) {
    if (e.user_id === Bot.uin || e.user_id === e.self_id) return false
    if (!fs.existsSync(this.dataPath)) return false
    if (e.msg && e.msg.startsWith('~')) return false

    const fileStream = fs.createReadStream(this.dataPath)
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    })

    let matchedItem = null
    const userMsg = (e.msg || "").trim()
    for await (const line of rl) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const item = JSON.parse(trimmed)
        if (item.f === 1 && userMsg.includes(item.q)) { matchedItem = item; break }
        if (item.f === 0 && userMsg === item.q.trim()) { matchedItem = item; break }
      } catch (err) {}
    }

    if (matchedItem && this.checkCD(e)) {
      let reply = matchedItem.a
      const imgMatch = reply.match(/\[img:(.*?)\]/)
      if (imgMatch) {
        const text = reply.replace(/\[img:.*?\]/g, '').trim()
        let imgName = imgMatch[1]
        
        if (imgName.includes('\\') || imgName.includes('/')) {
          imgName = path.basename(imgName)
        }
        
        const imgPath = path.join(this.baseDir, imgName)
        
        if (fs.existsSync(imgPath)) {
          const base64 = fs.readFileSync(imgPath, 'base64')
          await e.reply([text, segment.image(`base64://${base64}`)])
        } else {
          let lostMsg = text ? `${text}\n` : ''
          await e.reply(`${lostMsg}(｡>ㅅ<｡) 呜呜，这张图片好像在异世界走丢了...`)
        }
      } else {
        await e.reply(reply)
      }
      return true
    }
    return false
  }
}