/**
 * 介绍：随机发送一张沙雕图，图库在https://gitee.com/bling_yshs/ys-dio-pic-repo，下载后放入yunzai-bot/data/ys-dio-pic下，也就是会得到yunzai-bot/data/ys-dio-pic/abc.image
 * 样例：吊图
 * 样例(回复一张图片时)：添加吊图
 * 样例(回复一张图片时)：删除吊图
 */
import plugin from '../../lib/plugins/plugin.js'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

// 检查是否有data/ys-dio-pic文件夹，没有则创建
let dioDir = './data/ys-dio-pic'
if (!fs.existsSync(dioDir)) {
  fs.mkdirSync(dioDir)
}
// 检查是否有data/ys-old文件夹，没有则创建
let oldDir = './data/ys-old'
if (!fs.existsSync(oldDir)) {
  fs.mkdirSync(oldDir)
}

// 创建图片信息记录文件
const picInfoPath = path.join(dioDir, 'pic_info.json')
if (!fs.existsSync(picInfoPath)) {
  fs.writeFileSync(picInfoPath, '{}')
}

// 创建黑名单文件
const blacklistPath = path.join(dioDir, 'blacklist.json')
if (!fs.existsSync(blacklistPath)) {
  fs.writeFileSync(blacklistPath, '[]')
}

export class example extends plugin {
  constructor () {
    super({
      name: 'ys-沙雕图-reborn',
      dsc: 'ys-沙雕图-reborn',
      event: 'message',
      priority: 5000,
      rule: [{
        reg: '^#?(弔图|吊图|沙雕图)$', fnc: 'sendDio'
      }, {
        reg: '^#?添加(弔图|吊图|沙雕图)', fnc: 'addDio'
      }, {
        reg: '^#?删除(弔图|吊图|沙雕图)', fnc: 'delDio'
      }, {
        reg: '^#?审查(弔图|吊图|沙雕图)', fnc: 'checkDio'
      }, {
        reg: '^#?(弔图|吊图|沙雕图)(十连|10连)$', fnc: 'sendDioTen'
      }, {
        reg: '^#?封禁吊图发送者\\s*(\\d+)$', fnc: 'banUser'
      }, {
        reg: '^#?查询吊图', fnc: 'queryPic'
      }]
    })
  }

  async sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 移动有问题的图片到ys-old文件夹并群聊提醒
  async moveProblematicImage (fileName, groupId, reason = '发送失败') {
    try {
      // 创建当前日期的文件夹
      let date = new Date()
      let year = date.getFullYear()
      let month = String(date.getMonth() + 1).padStart(2, '0')
      let day = String(date.getDate()).padStart(2, '0')
      let newDir = path.join(oldDir, `${year}-${month}-${day}`)
      if (!fs.existsSync(newDir)) {
        fs.mkdirSync(newDir, { recursive: true })
      }

      // 移动文件
      let sourcePath = path.join(dioDir, fileName)
      let targetPath = path.join(newDir, fileName)

      if (fs.existsSync(sourcePath)) {
        fs.renameSync(sourcePath, targetPath)

        // 群聊提醒
        try {
          let message = [
            `检测到问题图片已自动处理：\n`,
            `文件名：${fileName}\n`,
            `原因：${reason}\n`,
            `已移动到：${newDir}\n`,
            `时间：${new Date().toLocaleString()}`
          ]

          await Bot.pickGroup(groupId).sendMsg(message)
        } catch (err) {
          console.log('群聊提醒失败:', err)
        }

        return true
      }
    } catch (err) {
      console.log('移动图片失败:', err)
    }
    return false
  }

  // 检查用户是否在黑名单中
  isUserBanned (userId) {
    const blacklist = JSON.parse(fs.readFileSync(blacklistPath, 'utf8'))
    return blacklist.includes(userId.toString())
  }

  // 封禁用户
  async banUser (e) {
    if (!e.isMaster) {
      e.reply('只有主人才能封禁用户')
      return
    }

    const userId = e.msg.match(/^#?封禁吊图发送者\s*(\d+)$/)[1]
    const blacklist = JSON.parse(fs.readFileSync(blacklistPath, 'utf8'))

    if (blacklist.includes(userId)) {
      e.reply('该用户已在黑名单中')
      return
    }

    blacklist.push(userId)
    fs.writeFileSync(blacklistPath, JSON.stringify(blacklist, null, 2))
    e.reply(`已封禁用户 ${userId} 的吊图添加权限`)
  }

  // 查询图片信息
  async queryPic (e) {
    let fileName
    let historyId

    // 检查是否是回复消息
    if (e.adapter_name?.toLowerCase().includes('onebot')) {
      if (e.reply_id) {
        historyId = e.reply_id
        let x = await e.group.getChatHistory(historyId, 1)
        let msgArr = x[0].message
        let targetObj = msgArr.find(item => item.type === 'image')
        if (targetObj) {
          // 下载图片计算MD5
          let response = await fetch(targetObj.url)
          const buffer = await response.arrayBuffer()
          const md5Hash = crypto.createHash('md5').update(Buffer.from(buffer)).digest('hex')
          const ext = path.extname(targetObj.file) || '.jpg'
          fileName = `${md5Hash}${ext}`
        }
      }
    } else {
      if (e.source) {
        historyId = e.source.seq
        let x = await e.group.getChatHistory(historyId, 1)
        let msgArr = x[0].message
        let targetObj = msgArr.find(item => item.type === 'image')
        if (targetObj) {
          // 下载图片计算MD5
          let response = await fetch(targetObj.url)
          const buffer = await response.arrayBuffer()
          const md5Hash = crypto.createHash('md5').update(Buffer.from(buffer)).digest('hex')
          const ext = path.extname(targetObj.file) || '.jpg'
          fileName = `${md5Hash}${ext}`
        }
      }
    }

    // 如果不是通过回复图片查询，则从消息中获取文件名
    if (!fileName) {
      fileName = e.msg.match(/^#?查询吊图\s*(.+)$/)[1]
    }

    const picInfo = JSON.parse(fs.readFileSync(picInfoPath, 'utf8'))

    if (!picInfo[fileName]) {
      e.reply('未找到该图片的信息')
      return
    }

    const picPath = path.join(dioDir, fileName)
    if (!fs.existsSync(picPath)) {
      e.reply('图片文件不存在')
      return
    }

    e.reply([
      segment.image(picPath),
      `添加者：${picInfo[fileName].adder}`
    ])
  }

  async checkDio (e) {
    if (!e.isMaster) {
      e.reply('只有主人才能审查')
      return
    }

    // 检查消息里是否存在日期
    let message = e.raw_message
    let dateReg = /\d{4}.\d{1,2}.\d{1,2}$/
    let dateMatch = message.match(dateReg)
    let date

    if (dateMatch) {
      // 如果用户输入了日期，就使用用户输入的
      date = dateMatch[0]
    } else {
      // 如果用户没输入日期，就使用上次记录的时间
      date = await redis.get('ys:checkDio:lastDate')
      if (!date) {
        e.reply('首次使用请在消息结尾添加日期，格式为2024.5.23')
        return
      }
    }

    // 存入临时redis用于查询
    await redis.set('ys:checkDio:date', date)

    // 从dioDir中找到目标日期以后的图片，计算数量和总大小（单位MB），询问用户是否需要继续审查
    let files = fs.readdirSync(dioDir)
    let targetDate = new Date(date)

    files = files.filter(file => {
      let stats = fs.statSync(path.join(dioDir, file))
      return stats.isFile() && !file.endsWith('.json') && file !== '.git' && stats.mtime > targetDate
    })
    let totalSize = 0
    for (let file of files) {
      let stats = fs.statSync(path.join(dioDir, file))
      totalSize += stats.size
    }
    let totalSizeMB = totalSize / 1024 / 1024
    // 格式化日期为 YYYY-MM-DD
    let formattedDate = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`
    e.reply(`即将审查 ${formattedDate} 至今的所有吊图，共有 ${files.length} 张图片，总大小为 ${totalSizeMB.toFixed(2)} MB，是否继续审查？(是/否)`)
    this.setContext('confirmCheckDio')
  }

  async confirmCheckDio () {
    let message = this.e.raw_message
    if (message === '是') {
      this.finish('confirmCheckDio')
      console.log('开始制作消息')

      // 将当前时间存入redis作为下次审查的起始时间
      let now = new Date()
      let currentDate = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`
      await redis.set('ys:checkDio:lastDate', currentDate)

      // 使用本次查询的日期
      let date = await redis.get('ys:checkDio:date')
      let targetDate = new Date(date)
      let files = fs.readdirSync(dioDir)
      files = files.filter(file => {
        let stats = fs.statSync(path.join(dioDir, file))
        return stats.isFile() && !file.endsWith('.json') && file !== '.git' && stats.mtime > targetDate
      })
      let msgList = []
      let count = 0
      for (let fileName of files) {
        count++
        let filePath = path.join(dioDir, fileName)
        msgList.push({
          user_id: Bot.uin, message: [fileName, segment.image(filePath)]
        })
        if (count % 20 === 0) {
          let send = await this.e.reply(await this.e.group.makeForwardMsg(msgList))
          if (send && send.error) {
            console.log('出错了！')
            // 那么这里尝试直接发送每一张图片，最后汇总标记出有问题图片的md5
            let errorFiles = []
            for (let msg of msgList) {
              let send = await this.e.reply(msg.message)
              if (send && send.error) {
                let fileName = msg.message[0]
                errorFiles.push(fileName)
                // 直接移动有问题的图片
                await this.moveProblematicImage(fileName, this.e.group_id, '审查时发送失败')
              }
            }
            if (errorFiles.length > 0) {
              this.e.reply(`审查发现 ${errorFiles.length} 张问题图片，已自动处理`)
            }
          }
          msgList = []
          await this.sleep(1000)
        }
      }
      if (msgList.length > 0) {
        let send = await this.e.reply(await this.e.group.makeForwardMsg(msgList))
        if (send && send.error) {
          // 处理最后一批的错误图片
          let errorFiles = []
          for (let msg of msgList) {
            let send = await this.e.reply(msg.message)
            if (send && send.error) {
              let fileName = msg.message[0]
              errorFiles.push(fileName)
              // 直接移动有问题的图片
              await this.moveProblematicImage(fileName, this.e.group_id, '审查时发送失败')
            }
          }
          if (errorFiles.length > 0) {
            this.e.reply(`最后一批发现 ${errorFiles.length} 张问题图片，已自动处理`)
          }
        }
      }
      console.log('消息制作完成')
    } else if (message === '否') {
      this.e.reply('已取消审查')
      this.finish('confirmCheckDio')
    } else {
      this.reply('请回复是或否')
    }
  }

  async sendDio (e) {
    // 获取用户QQ号
    const userId = e.user_id
    const cdKey = `ys:sendDio:cd:${userId}`

    // 使用Redis的原子操作进行计数
    let count = await redis.incr(cdKey)

    // 如果是第一次计数，设置过期时间（1分钟）
    if (count === 1) {
      await redis.expire(cdKey, 60)
    }

    // 检查次数是否超限
    if (count > 3) {
      // 获取剩余CD时间
      let ttl = await redis.ttl(cdKey)
      let seconds = Math.ceil(ttl)
      e.reply(`1分钟最多只能看3张吊图哦~\n请等待${seconds}秒后再试`, true, { recallMsg: 5 })
      return
    }

    // 检查文件夹是否存在图片
    let dioPicList = fs.readdirSync(dioDir).filter(file => !file.endsWith('.json') && file !== '.git')
    if (dioPicList.length === 0) {
      e.reply('沙雕图文件夹为空，请执行以下命令获取图片:\ngit clone --depth=1 https://gitee.com/bling_yshs/ys-dio-pic-repo.git ./data/ys-dio-pic')
      return
    }

    // 随机发送一张图片
    let randomFileName = dioPicList[Math.floor(Math.random() * dioPicList.length)]
    let dioTuPath = path.join(dioDir, randomFileName)
    let send = await e.reply(segment.image(dioTuPath))

    // 检查发送是否失败
    if (send && send.error) {
      // 移动有问题的图片
      await this.moveProblematicImage(randomFileName, e.group_id, '单张图片发送失败')
      e.reply('图片发送失败，已自动处理，请重试')
    }
  }

  async addDio (e) {
    // 检查用户是否在黑名单中
    if (this.isUserBanned(e.user_id)) {
      e.reply('您已被封禁，无法添加吊图')
      return
    }

    let historyId
    if (e.adapter_name?.toLowerCase().includes('onebot')) {
      if (!e.reply_id) {
        e.reply('请回复(引用)一张图片，并发送「添加吊图」')
        return
      }
      historyId = e.reply_id
    } else {
      if (!e.source) {
        e.reply('请回复(引用)一张图片，并发送「添加吊图」')
        return
      }
      historyId = e.source.seq
    }
    let x = await e.group.getChatHistory(historyId, 1)
    let msgArr = x[0].message
    console.log(msgArr)
    let targetObj = msgArr.find(item => item.type === 'image')
    if (!targetObj) {
      e.reply('请回复一张图片')
      return
    }

    let targetUrl = targetObj.url
    // 下载图片数据
    let response = await fetch(targetUrl)
    const buffer = await response.arrayBuffer()

    // 计算图片数据的MD5
    const md5Hash = crypto.createHash('md5').update(Buffer.from(buffer)).digest('hex')

    // 获取原始文件扩展名
    const ext = path.extname(targetObj.file) || '.jpg'
    const targetName = `${md5Hash}${ext}`
    let picPath = path.join(dioDir, targetName)

    // 检查目标是否已经存在
    if (fs.existsSync(picPath)) {
      e.reply('没想到吧，已经有人添加过这张吊图了awa', true)
      return
    }

    await fs.promises.writeFile(picPath, Buffer.from(buffer))

    // 记录图片信息
    const picInfo = JSON.parse(fs.readFileSync(picInfoPath, 'utf8'))
    picInfo[targetName] = {
      adder: e.user_id,
      addTime: new Date().toISOString()
    }
    fs.writeFileSync(picInfoPath, JSON.stringify(picInfo, null, 2))

    e.reply('添加成功')
  }

  async deleteFilesByNames (fileNames) {
    let deletedFiles = []
    let notFoundFiles = []
    let deletedImages = []

    for (let fileName of fileNames) {
      // 获取文件名前16位用于匹配
      let filePrefix = fileName.substring(0, 16).toLowerCase()

      // 获取目录下所有文件
      let files = fs.readdirSync(dioDir)
      let matchedFile = files.find(file => file.substring(0, 16).toLowerCase() === filePrefix)

      // 再创建当前日期的文件夹
      let date = new Date()
      let year = date.getFullYear()
      let month = date.getMonth() + 1
      let day = date.getDate()
      let newDir = path.join(oldDir, `${year}-${month}-${day}`)
      if (!fs.existsSync(newDir)) {
        fs.mkdirSync(newDir)
      }

      // 检查是否找到匹配的文件
      if (matchedFile) {
        let matchedFilePath = path.join(dioDir, matchedFile)
        // 不用删除文件，把文件移动到data/ys-old文件夹
        fs.renameSync(matchedFilePath, path.join(newDir, matchedFile))
        deletedFiles.push(matchedFile)
        deletedImages.push(segment.image(path.join(newDir, matchedFile)))
      } else {
        notFoundFiles.push(fileName)
      }
    }

    return { deletedImages, notFoundFiles }
  }

  async delDio (e) {
    if (!e.isMaster) {
      e.reply('只有主人才能删除')
      return
    }

    let historyId
    let hasReply = e.adapter_name?.toLowerCase().includes('onebot') ? e.reply_id : e.source

    if (!hasReply) {
      // 检查消息是否包含多个文件名
      let message = e.raw_message
      let fileNames = message
        .replace(/^删除吊图/, '')
        .split('\n')
        .map(name => name.trim())
        .filter(name => name)

      if (fileNames.length === 0) {
        e.reply('请回复一张图片或者跟上文件名')
        return
      }

      const { deletedImages, notFoundFiles } = await this.deleteFilesByNames(fileNames)

      if (deletedImages.length > 0) {
        e.reply(['删除成功:', ...deletedImages])
      }
      if (notFoundFiles.length > 0) {
        e.reply('未找到文件: ' + notFoundFiles.join(', '))
      }
      return
    }

    historyId = e.adapter_name?.toLowerCase().includes('onebot') ? e.reply_id : e.source.seq

    // 处理引用的图片
    let x = await e.group.getChatHistory(historyId, 1)
    let msgArr = x[0].message
    let targetObj = msgArr.find(item => item.type === 'image')
    if (!targetObj) {
      e.reply('请回复一张图片')
      return
    }

    // 下载图片计算MD5
    let response = await fetch(targetObj.url)
    const buffer = await response.arrayBuffer()
    const md5Hash = crypto.createHash('md5').update(Buffer.from(buffer)).digest('hex')
    const ext = path.extname(targetObj.file) || '.jpg'
    const targetName = `${md5Hash}${ext}`

    console.log('targetName:', targetName)
    let files = fs.readdirSync(dioDir)
    // 只比较前16位
    let foundFile = files.find(item => item.substring(0, 16).toLowerCase() === targetName.substring(0, 16).toLowerCase())

    if (!foundFile) {
      e.reply('删除失败：未找到对应图片')
      return
    }

    const { deletedImages } = await this.deleteFilesByNames([foundFile])
    if (deletedImages.length > 0) {
      e.reply(['删除成功:', ...deletedImages])
    }
  }

  async sendDioTen (e) {
    // 获取用户QQ号
    const userId = e.user_id
    const cdKey = `ys:sendDioTen:cd:${userId}`

    // 使用Redis的原子操作设置CD
    let success = await redis.set(cdKey, '1', {
      EX: 300, // 5分钟CD
      NX: true // 只有当key不存在时才设置
    })

    if (!success) {
      // 获取剩余CD时间
      let ttl = await redis.ttl(cdKey)
      let seconds = Math.ceil(ttl)
      e.reply(`吊图十连CD中，请等待${seconds}秒后再试`, true, { recallMsg: 5 })
      return
    }

    // 检查文件夹是否存在图片
    let dioPicList = fs.readdirSync(dioDir).filter(file => !file.endsWith('.json') && file !== '.git')
    if (dioPicList.length === 0) {
      e.reply('沙雕图文件夹为空，请执行以下命令获取图片:\ngit clone --depth=1 https://gitee.com/bling_yshs/ys-dio-pic-repo.git ./data/ys-dio-pic')
      return
    }

    // 准备十张随机图片
    let msgList = []
    let usedIndexes = new Set()

    for (let i = 0; i < 10; i++) {
      let randomIndex
      do {
        randomIndex = Math.floor(Math.random() * dioPicList.length)
      } while (usedIndexes.has(randomIndex))

      usedIndexes.add(randomIndex)
      let fileName = dioPicList[randomIndex]
      let dioTuPath = path.join(dioDir, fileName)

      msgList.push({
        user_id: Bot.uin,
        message: [
          fileName,
          segment.image(dioTuPath)
        ]
      })
    }

    // 发送转发消息
    let send = await e.reply(await e.group.makeForwardMsg(msgList))
    if (send && send.error) {
      e.reply('十连内容中含有违规图片，正在尝试逐条发送...')
      // 逐条发送，并且记录下有问题的图片
      let errorFiles = []
      for (let msg of msgList) {
        let send = await e.reply(msg.message)
        if (send && send.error) {
          let fileName = msg.message[0]
          errorFiles.push(fileName)
          // 直接移动有问题的图片
          await this.moveProblematicImage(fileName, e.group_id, '十连发送失败')
        }
      }
      if (errorFiles.length > 0) {
        e.reply(`已自动处理 ${errorFiles.length} 张问题图片`)
      }
    }
  }
}
