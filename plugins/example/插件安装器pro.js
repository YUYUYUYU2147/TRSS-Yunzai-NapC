import plugin from '../../lib/plugins/plugin.js';
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { exec } = require("child_process");
import fetch from "node-fetch";
import fs from 'fs'

let plugins_list_url = `https://raw.gitcode.com/feng-07/chajian/raw/main/cjazq.json`
let pluginsList_temp

// ===== pro版配置（纯JS对象，不依赖yaml） =====
let CONFIG = {
  pluginsListUrl: plugins_list_url,
  pluginsDir: './plugins',
  npmRegistry: 'https://registry.npmmirror.com',
  protectedPlugins: ['example', 'genshin', 'system', 'other'],
  gitTimeout: 60000,
  syncPluginsListUrl: false,
  napcatHttpPort: '',
  napcatHttpUrl: '',
  auth: {
    'github.com': { token: '' },
    'gitee.com': { token: '' },
    'gitcode.com': { token: '' }
  }
}

function loadConfig() {
  try {
    const yamlContent = fs.readFileSync('./plugins/example/config.yaml', 'utf8')
    const parsed = simpleYamlParse(yamlContent)
    if (parsed) {
      for (var k in parsed) {
        CONFIG[k] = parsed[k]
      }
      if (parsed.auth) {
        for (var p in parsed.auth) {
          if (!CONFIG.auth[p]) CONFIG.auth[p] = {}
          for (var k2 in parsed.auth[p]) {
            CONFIG.auth[p][k2] = parsed.auth[p][k2]
          }
        }
      }
    }
  } catch (e) {
    // 配置文件不存在时使用默认值
  }
}

function simpleYamlParse(text) {
  var obj = {}
  var lines = text.split('\n')
  var currentObj = obj
  var stack = []
  for (var li = 0; li < lines.length; li++) {
    var line = lines[li].trim()
    if (!line || line[0] === '#') continue
    var idx = line.indexOf(':')
    if (idx < 1) continue
    var key = line.substring(0, idx).trim()
    var val = line.substring(idx + 1).trim()
    // 去引号
    if ((val[0] === '"' && val[val.length - 1] === '"') || (val[0] === "'" && val[val.length - 1] === "'")) {
      val = val.substring(1, val.length - 1)
    }
    if (val === '{}' || val === '') {
      currentObj[key] = {}
      stack.push(currentObj)
      currentObj = currentObj[key]
    } else {
      if (val === 'true') val = true
      else if (val === 'false') val = false
      else if (/^\d+$/.test(val)) val = parseInt(val, 10)
      currentObj[key] = val
      while (stack.length > 0) {
        currentObj = stack.pop()
        break
      }
    }
  }
  return obj
}

loadConfig()

/**
 * 作者：千奈千祁(2632139786) - Pro增强版
 * Gitee主页：Gitee.com/QianNQQ
 * 
 * 该插件所有版本发布于 该仓库(https://gitee.com/qiannqq/yunzai-plugin-JS)
 * 本插件及该仓库的所有插件均遵循 GPL3.0 开源协议
 * 
 * 请勿使用本插件进行盈利等商业活动行为
 */

export class example2 extends plugin {
    constructor () {
      super({
        name: '插件管理器',
        dsc: '插件管理器@OAuth2认证增强版Pro',
        event: 'message',
        priority: -1,
        rule: [
          {
            reg: '^#插件(列表|市场|大全)$',
            fnc: 'showPluginList'
          },{
            reg: '^#安装插件\\s*(https?://|git@).+$',
            fnc: 'installPluginFromUrl'
          },{
            reg: '^#安装插件(.*)$',
            fnc: 'installPluginByName'
          },{
            reg: '^#已安装插件(列表)?$',
            fnc: 'showInstalledPlugins'
          },{
            reg: '^#(删除|卸载)插件(.*)$',
            fnc: 'uninstallPlugin'
          },{
            reg: '^#搜索插件(.*)$',
            fnc: 'searchPlugin'
          },{
            reg: '^#搜索(github|gitcode)?仓库(.+)$',
            fnc: 'searchRepository'
          },
          {
            reg: '^#[Gg][Ii][Tt][Hh][Uu][Bb]搜索(.+)$',
            fnc: 'searchRepositoryShort'
          },
          {
            reg: '^#[Gg][Ii][Tt][Cc][Oo][Dd][Ee]搜索(.+)$',
            fnc: 'searchRepositoryShort'
          },
          {
            reg: '^#插件管理器(重置|初始化)(配置)?$',
            fnc: 'resetConfig'
          },
          {
            reg: '^#插件管理器重载配置$',
            fnc: 'reloadConfigCmd'
          }
        ]
      })
    }

    checkPermission(e) {
      if(!e.isMaster) { e.reply('权限不足，仅主人可用'); return false }
      return true
    }

    /* ================= 合并转发（多种方式兼容） ================= */

    // 安全日志方法（logger.mark 可能不存在）
    _log(msg) {
      try {
        if (typeof logger !== 'undefined' && logger.mark) logger.mark(msg)
        else if (typeof logger !== 'undefined' && logger.info) logger.info(msg)
        else console.log(msg)
      } catch (_) {}
    }
    _warn(msg) {
      try {
        if (typeof logger !== 'undefined' && logger.warn) logger.warn(msg)
        else console.warn(msg)
      } catch (_) {}
    }

    async sendForwardMsg(e, msgList) {
      var selfId = parseInt(e.self_id) || 0
      this._log(`[插件管理器] selfId解析: e.self_id=${e.self_id}, Bot.uin=${Bot && Bot.uin}, 最终selfId=${selfId}`)
      var isGroup = e.isGroup || !!e.group_id
      var MAX_NODES = 90

      // 构建标准 node 数组
      var items = []
      for (var mi = 0; mi < msgList.length; mi++) {
        var item = msgList[mi]
        var text = ''
        if (typeof item.message === 'string') {
          text = item.message
        } else if (Array.isArray(item.message)) {
          for (var ci = 0; ci < item.message.length; ci++) {
            if (item.message[ci].type === 'text') {
              text = item.message[ci].data.text || ''
              break
            }
          }
        } else {
          text = String(item.message || '')
        }
        if (text.length > 3500) text = text.slice(0, 3500) + '...(已截断)'
        var name = String(item.nickname || '插件管理器')
        if (name.length > 35) name = name.slice(0, 35) + '..'
        // 强制使用当前bot的self_id，确保转发消息显示为当前发送者
        var uid = selfId
        items.push({ text: text, name: name, uid: uid })
      }

      function buildNodes(chunk) {
        var nodes = []
        for (var ni = 0; ni < chunk.length; ni++) {
          var i = chunk[ni]
          nodes.push({
            type: 'node',
            data: {
              user_id: i.uid,
              nickname: i.name,
              content: [{ type: 'text', data: { text: i.text } }]
            }
          })
        }
        return nodes
      }

      // ========== 方式1: 分片 makeForwardMsg + 发送（解决 NapCat 大消息截断问题） ==========
      // 优先用 e.bot（当前处理消息的bot）
      var bot = e.bot
      if (!bot) {
        if (Bot && typeof Bot.get === 'function' && e.self_id) {
          try { bot = Bot.get(String(e.self_id)) } catch (_) {}
        }
        if (!bot && typeof Bot.get === 'number' && e.self_id) {
          try { bot = Bot.get(Number(e.self_id)) } catch (_) {}
        }
        if (!bot) bot = Bot
      }

      // 分片构建和发送，避免单次消息太大导致截断
      var CHUNK_SIZE = 60 // 每片最多60条（NapCat限制: 50✓ 80✗ 100✗）
      var totalChunks = Math.ceil(items.length / CHUNK_SIZE)
      this._log(`[插件管理器] 分片发送: 共${items.length}条 → ${totalChunks}片, bot=${bot && bot.uin || '?'}`)

      var allSent = true
      for (var ci = 0; ci < totalChunks; ci++) {
        var cStart = ci * CHUNK_SIZE
        var cEnd = Math.min(cStart + CHUNK_SIZE, items.length)
        var chunkItems = []
        for (var ci2 = cStart; ci2 < cEnd; ci2++) chunkItems.push(items[ci2])

        var yunzaiMsgList = []
        for (var yi = 0; yi < chunkItems.length; yi++) {
          yunzaiMsgList.push({ user_id: chunkItems[yi].uid, message: chunkItems[yi].text })
        }

        try {
          var fwdMsg = null
          if (isGroup && e.group && typeof e.group.makeForwardMsg === 'function') {
            fwdMsg = await e.group.makeForwardMsg(yunzaiMsgList)
          } else if (!isGroup && e.friend && typeof e.friend.makeForwardMsg === 'function') {
            fwdMsg = await e.friend.makeForwardMsg(yunzaiMsgList)
          }

          if (fwdMsg) {
            this._log(`[插件管理器] 第${ci+1}/${totalChunks}片 makeForwardMsg构建成功`)
            // 尝试用正确的bot发送
            if (bot && bot.sendApi) {
              var sendMsgApi2 = isGroup ? 'send_group_msg' : 'send_private_msg'
              var sendParams = isGroup
                ? { group_id: String(e.group_id), message: fwdMsg }
                : { user_id: String(e.user_id), message: fwdMsg }
              try {
                var smResult = await bot.sendApi(sendMsgApi2, sendParams)
                this._log(`[插件管理器] 第${ci+1}/${totalChunks}片 sendApi ${sendMsgApi2}: ${JSON.stringify(smResult).substring(0,120)}`)
              } catch (smErr) {
                this._warn(`[插件管理器] 第${ci+1}片 sendApi失败: ${(smErr.message || smErr).toString().substring(0,80)}, 回退e.reply`)
                await e.reply(fwdMsg)
              }
            } else {
              this._log(`[插件管理器] 第${ci+1}片 使用e.reply发送...`)
              await e.reply(fwdMsg)
            }
          } else {
            this._warn(`[插件管理器] 第${ci+1}片 makeForwardMsg返回空`)
            allSent = false
          }
        } catch (err3) {
          this._warn(`[插件管理器] 第${ci+1}片失败: ${(err3 && err3.message || err3 || '').toString().substring(0, 100)}`)
          allSent = false
        }
        // 片间间隔，NapCat对连续转发消息有频率限制（约2次后可能被限）
        if (ci < totalChunks - 1) await new Promise(function(r) { setTimeout(r, 2000) })
      }

      if (allSent) {
        this._log('[插件管理器] 所有分片发送完成')
        return true
      }
      this._warn('[插件管理器] 部分分片失败，继续尝试后续方式')

      // ========== 方式2: bot.sendApi 发转发消息（LLOneBot可用，NapCat可能失败） ==========
      if (bot && bot.sendApi) {
        var api1 = isGroup ? 'send_group_forward_msg' : 'send_private_forward_msg'
        var totalShards1 = Math.ceil(items.length / MAX_NODES)
        this._log(`[插件管理器] sendApi ${api1} 共${items.length}条 → ${totalShards1}片 (bot=${bot.uin || bot.id || '?'}, selfId=${selfId})`)
        var allOk = true
        for (var s1 = 0; s1 < totalShards1; s1++) {
          var startIdx1 = s1 * MAX_NODES
          var endIdx1 = Math.min(startIdx1 + MAX_NODES, items.length)
          var chunk1 = []
          for (var ci1 = startIdx1; ci1 < endIdx1; ci1++) chunk1.push(items[ci1])
          var nodesB = []
          for (var bi = 0; bi < chunk1.length; bi++) {
            nodesB.push({
              type: 'node',
              data: {
                user_id: selfId,
                nickname: chunk1[bi].name,
                content: chunk1[bi].text
              }
            })
          }
          var params = isGroup
            ? { group_id: String(e.group_id), messages: nodesB }
            : { user_id: String(e.user_id), messages: nodesB }
          try {
            var sendResult = await bot.sendApi(api1, params)
            this._log(`[插件管理器] sendApi 格式B 第${s1+1}/${totalShards1}片完成: ${JSON.stringify(sendResult).substring(0,200)}`)
            // 检查实际发送结果
            if (sendResult && (sendResult.status === 'failed' || sendResult.retcode !== 0)) {
              this._warn(`[插件管理器] sendApi 格式B 第${s1+1}片返回失败状态，尝试格式A`)
              throw new Error('status failed')
            }
          } catch (err1) {
            this._warn(`[插件管理器] sendApi 格式B 第${s1+1}片异常: ${(err1.message || err1 || '').toString().substring(0,120)}`)
            var nodesA = []
            for (var ai = 0; ai < chunk1.length; ai++) {
              nodesA.push({
                type: 'node',
                data: {
                  user_id: selfId,
                  nickname: chunk1[ai].name,
                  content: [{ type: 'text', data: { text: chunk1[ai].text } }]
                }
              })
            }
            params.messages = nodesA
            try {
              sendResult = await bot.sendApi(api1, params)
              this._log(`[插件管理器] sendApi 格式A 第${s1+1}/${totalShards1}片完成: ${JSON.stringify(sendResult).substring(0,200)}`)
              if (sendResult && (sendResult.status === 'failed' || sendResult.retcode !== 0)) {
                this._warn(`[插件管理器] sendApi 格式A 第${s1+1}片返回失败状态`)
                allOk = false
              }
            } catch (err2) {
              this._warn(`[插件管理器] sendApi 格式A 第${s1+1}片异常: ${(err2.message || err2 || '').toString().substring(0,120)}`)
              allOk = false
            }
          }
          if (s1 < totalShards1 - 1) await new Promise(function(r) { setTimeout(r, 1000) })
        }
        if (allOk) {
          this._log('[插件管理器] sendApi全部成功，返回true')
          return true
        }
        this._warn('[插件管理器] sendApi部分失败，继续尝试后续方式')
      } else {
        this._warn(`[插件管理器] sendApi不可用: bot=${!!bot}, sendApi=${!!(bot && bot.sendApi)}`)
      }

      // ========== 方式3: common.makeForwardMsg ==========
      try {
        var common = await this.loadCommonModule()
        if (common && typeof common.makeForwardMsg === 'function') {
          var texts = []
          for (var ti = 0; ti < items.length; ti++) texts.push(items[ti].text)
          this._log('[插件管理器] 尝试 common.makeForwardMsg ...')
          var fwd3 = await common.makeForwardMsg(e, texts, '插件管理器')
          if (fwd3) {
            this._log('[插件管理器] common.makeForwardMsg 成功')
            return await e.reply(fwd3)
          }
        }
      } catch (err4) {
        this._warn(`[插件管理器] common.makeForwardMsg失败: ${(err4 && err4.message || err4 || '').toString().substring(0, 120)}`)
      }

      // ========== 全部失败，文本兜底 ==========
      this._warn('[插件管理器] 所有转发方式均失败，使用文本回复')
      var fallbackLines = []
      for (var fi = 0; fi < items.length; fi++) {
        fallbackLines.push(items[fi].text)
      }
      return await e.reply(fallbackLines.join('\n\n'))
    }

    async tryHttpForward(baseUrl, token, api, e, chunk, fmt) {
      var isGroup = e.isGroup || !!e.group_id

      // 构建nodes
      var nodes = []
      for (var ni = 0; ni < chunk.length; ni++) {
        var item = chunk[ni]
        if (fmt === 'A') {
          // OneBot标准格式：user_id + nickname + content(消息段数组)
          nodes.push({
            type: 'node',
            data: {
              user_id: item.uid,
              nickname: item.name,
              content: [{ type: 'text', data: { text: item.text } }],
              time: Math.floor(Date.now() / 1000)
            }
          })
        } else {
          // NapCat兼容格式：uin + name + content(纯文本)
          nodes.push({
            type: 'node',
            data: {
              uin: String(item.uid),
              name: item.name,
              content: item.text
            }
          })
        }
      }

      var bodyKey = (fmt === 'A') ? 'messages' : 'message'
      function makeBody() {
        var obj = {}
        obj[bodyKey] = nodes
        obj[isGroup ? 'group_id' : 'user_id'] = String(isGroup ? e.group_id : e.user_id)
        return obj
      }

      // 尝试不同的认证方式：带token / 不带token
      // 空字符串也算有值(需要测试)，确保两种都试
      var tokenTries = (token && token !== '') ? [token, ''] : ['', '__no_token__']
      for (var ti = 0; ti < tokenTries.length; ti++) {
        var useToken = tokenTries[ti] === '__no_token__' ? '' : tokenTries[ti]
        var headers = { 'Content-Type': 'application/json' }
        if (useToken) headers['Authorization'] = 'Bearer ' + useToken
        var url = baseUrl + '/' + api + (useToken ? '?access_token=' + useToken : '')
        try {
          var res = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(makeBody()),
            signal: this.safeTimeout(60000)
          })
          var data = await res.json()
          if (data.status === 'ok' || data.retcode === 0) {
            logger.mark(`[插件管理器] HTTP${fmt}成功 (token=${useToken ? '有' : '无'})`)
            return true
          }
          var respText = JSON.stringify(data).substring(0, 150)
          // 如果是token相关错误且还没试过无token，跳过继续试无token
          if (useToken && /token|verify|auth|401|403/i.test(respText)) {
            logger.warn(`[插件管理器] HTTP${fmt} token验证失败，重试无token`)
            continue
          }
          logger.warn(`[插件管理器] HTTP${fmt}响应: ${respText}`)
        } catch (err) {
          logger.warn(`[插件管理器] HTTP${fmt}网络错误: ${err.message}`)
          break
        }
      }
      return false
    }

    safeTimeout(ms) {
      try {
        if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
          return AbortSignal.timeout(ms)
        }
      } catch (e) {}
      return undefined
    }

    async resolveNapcatHttpUrl() {
      try {
        // 0. 完整 URL
        if (CONFIG.napcatHttpUrl) {
          var raw = CONFIG.napcatHttpUrl.trim()
          try {
            var u = new URL(raw)
            var token = u.searchParams.get('token') || ''
            var baseUrl = u.protocol + '//' + u.host
            logger.mark(`[插件管理器] 使用完整URL: ${baseUrl} (token=${token ? '有' : '无'})`)
            return { url: baseUrl, token: token }
          } catch (_) {
            logger.warn(`[插件管理器] napcatHttpUrl格式无效: ${raw}`)
          }
        }
        // 1. 手动端口
        if (CONFIG.napcatHttpPort) {
          var port = CONFIG.napcatHttpPort
          for (var hi = 0; hi < 2; hi++) {
            var host = hi === 0 ? '127.0.0.1' : 'localhost'
            try {
              var res = await fetch('http://' + host + ':' + port + '/get_login_info', { signal: this.safeTimeout(3000) })
              if (res.ok) return { url: 'http://' + host + ':' + port, token: '' }
            } catch (_) {}
          }
          logger.mark(`[插件管理器] 使用端口 ${port}（未验证连通性）`)
          return { url: 'http://127.0.0.1:' + port, token: '' }
        }
        // 2. 从 Bot 配置获取
        if (typeof Bot !== 'undefined') {
          // 尝试获取token
          var botToken = ''
          if (Bot.config) botToken = Bot.config.access_token || Bot.config.token || ''
          if (!botToken && Bot.napcat) botToken = Bot.napcat.token || ''

          if (Bot.config && Bot.config.http_url) return { url: Bot.config.http_url.replace(/\/+$/, ''), token: botToken }
          if (Bot.napcat && Bot.napcat.http_url) return { url: Bot.napcat.http_url.replace(/\/+$/, ''), token: botToken }
          if (Bot.config && Bot.config.ws_reverse_url) {
            var m = Bot.config.ws_reverse_url.match(/^https?:\/\/[^\/]+/)
            if (m) return { url: m[0], token: botToken }
          }
          var bp = (Bot.config && (Bot.config.port || Bot.config.http_port)) || 0
          if (bp) return { url: 'http://127.0.0.1:' + bp, token: botToken }
        }
        // 3. 自动探测
        var ports = [3010, 3000, 3001, 5700, 5701, 6099, 6100]
        for (var pp = 3002; pp <= 3020; pp++) ports.push(pp)
        for (hi = 0; hi < 2; hi++) {
          host = hi === 0 ? '127.0.0.1' : 'localhost'
          for (var pi = 0; pi < ports.length; pi++) {
            port = ports[pi]
            try {
              res = await fetch('http://' + host + ':' + port + '/get_login_info', { signal: this.safeTimeout(1500) })
              if (res.ok) {
                var data = await res.json()
                if (data.status === 'ok' || data.retcode === 0) {
                  // 尝试从Bot配置获取token
                  var autoToken = ''
                  if (typeof Bot !== 'undefined') {
                    if (Bot.config) autoToken = Bot.config.access_token || Bot.config.token || ''
                    if (!autoToken && Bot.napcat) autoToken = Bot.napcat.token || ''
                  }
                  logger.mark(`[插件管理器] ✓ 探测到: http://${host}:${port} (token=${autoToken ? '有' : '无'})`)
                  return { url: 'http://' + host + ':' + port, token: autoToken }
                }
              }
            } catch (_) {}
          }
        }
        logger.warn('[插件管理器] 无法探测 NapCat HTTP，请在 config.yaml 设置 napcatHttpUrl')
        return null
      } catch (_) { return null }
    }

    /* ================= common模块延迟加载 ================= */

    _commonCache = null
    _commonPromise = null

    async loadCommonModule() {
      if (this._commonCache) return this._commonCache
      if (this._commonPromise) return this._commonPromise
      this._commonPromise = this._doLoadCommon()
      this._commonCache = await this._commonPromise
      return this._commonCache
    }

    async _doLoadCommon() {
      try {
        // 用动态import加载common模块
        var modPath = '../../lib/common/common.js'
        var m = await import(modPath)
        return m.default || m
      } catch (e) {
        try {
          var m2 = await import('../../../lib/common/common.js')
          return m2.default || m2
        } catch (e2) {
          return null
        }
      }
    }

    /* ================= 插件安装功能 ================= */

    async getplugins() {
      var timestamp = Math.floor(Date.now() / 1000);
      if(!pluginsList_temp?.time || pluginsList_temp.time+3600 <= timestamp) {
        pluginsList_temp = await fetch(CONFIG.pluginsListUrl || plugins_list_url)
        pluginsList_temp = await pluginsList_temp.json()
        pluginsList_temp.time = timestamp
      }
      return pluginsList_temp
    }

    async installPluginByName(e) {
      if (!this.checkPermission(e)) return false
      try {
        var name = e.msg.replace(/#安装插件/, '').trim()
        if (!name) return e.reply('请提供插件名称或 Git 链接')
        var list = await this.getplugins()
        var target = null
        for (var i = 0; i < list.length; i++) {
          if (list[i].pathname === name || list[i].pluginname === name) {
            target = list[i]
            break
          }
        }
        if (!target) return await e.reply('市场中未找到插件：' + name)
        e.msg = '#安装插件 ' + target.url
        return await this.installPluginFromUrl(e)
      } catch (error) {
        logger.error('[插件管理器] 安装插件失败: ' + error.message)
        return e.reply('安装插件时发生错误: ' + error.message)
      }
    }

    async installPluginFromUrl(e) {
      if (!this.checkPermission(e)) return false
      try {
        var rawUrl = e.msg.replace(/#安装插件/, '').trim()
        var cleanUrl = rawUrl.replace(/\.git$/, '')
        var pluginName = this.extractPluginName(cleanUrl)
        var targetPath = (CONFIG.pluginsDir || './plugins') + '/' + pluginName
        if (fs.existsSync(targetPath)) return await e.reply('[' + pluginName + '] 该插件已安装')
        var authConfig = CONFIG.auth || {}
        var domain = this.getDomain(cleanUrl)
        var finalUrl = cleanUrl + '.git'
        if (authConfig[domain] && authConfig[domain].token && authConfig[domain].token !== '') {
          finalUrl = cleanUrl.replace('://', '://oauth2:' + authConfig[domain].token + '@') + '.git'
          await e.reply('检测到私库，已自动应用 OAuth2 认证通道...')
        }
        await e.reply('[' + pluginName + '] 开始下载...')
        var result = await this.execSync(finalUrl, targetPath)
        if (result.error && authConfig[domain] && authConfig[domain].token && authConfig[domain].token !== '') {
          await e.reply('尝试OAuth2认证通道重试...')
          var authUrl = cleanUrl.replace('://', '://oauth2:' + authConfig[domain].token + '@') + '.git'
          result = await this.execSync(authUrl, targetPath)
        }
        if (result.error) return await e.reply('下载失败: ' + result.error.message)
        return await this.installDependencies(pluginName, e)
      } catch (error) {
        logger.error('[插件管理器] URL安装失败: ' + error.message)
        return e.reply('安装插件时发生错误: ' + error.message)
      }
    }

    extractPluginName(url) {
      var parts = url.split('/')
      var last = parts[parts.length - 1]
      if (last) return last
      return 'unknown_plugin'
    }

    getDomain(url) {
      try {
        var u = new URL(url)
        return u.hostname.toLowerCase()
      } catch (e) { return '' }
    }

    async installDependencies(pluginName, e) {
      var pluginPath = (CONFIG.pluginsDir || './plugins') + '/' + pluginName
      if (!fs.existsSync(pluginPath)) return e.reply('[' + pluginName + '] 插件目录不存在')
      if (!fs.existsSync(pluginPath + '/package.json')) {
        return await e.reply('[' + pluginName + '] 下载成功，无需安装依赖')
      }
      await e.reply('[' + pluginName + '] 下载成功，正在安装依赖环境...')
      var cmd = process.platform === 'win32'
        ? 'cd /d "' + pluginPath + '" && npm i --registry=https://registry.npmmirror.com'
        : 'cd "' + pluginPath + '" && pnpm i --registry=https://registry.npmmirror.com'
      var res = await this.execSync(cmd, null)
      if (res.error) {
        return await e.reply('[' + pluginName + '] 安装依赖时出现错误!\n' + (res.stdout || res.stderr || '').substring(0, 800))
      }
      return await e.reply('[' + pluginName + '] 插件安装成功！重启后生效')
    }

    async execSync(cmd, targetPath) {
      var timeout = CONFIG.gitTimeout || 60000
      var fullCmd = targetPath ? ('git clone --depth=1 ' + cmd + ' "' + targetPath + '"') : cmd
      return new Promise(function(resolve) {
        exec(fullCmd, { windowsHide: true }, function(error, stdout, stderr) {
          resolve({ error: error, stdout: stdout, stderr: stderr })
        })
      })
    }

    /* ================= 插件列表显示 ================= */

    async showPluginList(e) {
      if (!this.checkPermission(e)) return false
      try {
        var pluginsList = await this.getplugins()
        var msgList = []
        msgList.push({
          user_id: e.self_id || Bot.uin,
          message: `共${pluginsList.length}个插件`,
          nickname: '插件管理器'
        })
        for (var i = 0; i < pluginsList.length; i++) {
          var item = pluginsList[i]
          var msg = `插件名称:${item.pluginname}\n作者:${item.author}\n简介:${item.describe}\n插件链接:${item.url}\n安装指令:#安装插件${item.pathname}`
          msgList.push({
            user_id: e.self_id,
            message: msg,
            nickname: item.author || '未知'
          })
        }
        await this.sendForwardMsg(e, msgList)
        return true
      } catch (error) {
        logger.error('[插件管理器] 显示插件列表失败: ' + error.message)
        return e.reply('获取插件列表失败: ' + error.message)
      }
    }

    async showInstalledPlugins(e) {
      if (!this.checkPermission(e)) return false
      try {
        var pluginsDir = CONFIG.pluginsDir || './plugins'
        var protectedList = CONFIG.protectedPlugins || ['example', 'genshin', 'system', 'other']
        var files
        try {
          files = fs.readdirSync(pluginsDir, { withFileTypes: true })
        } catch(err) {
          return await e.reply('获取目录失败: ' + err.message)
        }
        var directories = []
        for (var fi = 0; fi < files.length; fi++) {
          if (files[fi].isDirectory()) directories.push(files[fi].name)
        }
        var localPlugins = []
        for (var di = 0; di < directories.length; di++) {
          if (protectedList.indexOf(directories[di]) === -1) localPlugins.push(directories[di])
        }
        if (localPlugins.length === 0) return await e.reply('暂无已安装的插件')
        var cloudPluginsList = await this.getplugins()
        var msgList = []
        for (var li = 0; li < localPlugins.length; li++) {
          var litem = localPlugins[li]
          var info = null
          for (var ci = 0; ci < cloudPluginsList.length; ci++) {
            if (cloudPluginsList[ci].pathname === litem) {
              info = cloudPluginsList[ci]
              break
            }
          }
          if (!info) info = { author: '未知', describe: '暂无', pathname: litem, pluginname: litem, url: '未知' }
          var msg = `插件名称:${info.pluginname}\n作者:${info.author}\n简介:${info.describe}\n插件链接:${info.url}\n卸载指令:#卸载插件${info.pathname}`
          msgList.push({ user_id: e.self_id, message: msg })
        }
        await this.sendForwardMsg(e, msgList)
        return true
      } catch (error) {
        logger.error('[插件管理器] 显示已安装插件失败: ' + error.message)
        return e.reply('获取已安装插件失败: ' + error.message)
      }
    }

    async uninstallPlugin(e) {
      if (!this.checkPermission(e)) return false
      var match = e.msg.match(/^#(删除|卸载)插件(.*)$/)
      var pluginPathname = match ? match[2] : ''
      if (!pluginPathname) return await e.reply('要卸载的插件名为空！')
      var protectedList = CONFIG.protectedPlugins || ['example', 'genshin', 'system', 'other']
      if (protectedList.indexOf(pluginPathname) !== -1) return await e.reply('系统组件不支持卸载')
      var pluginPath = (CONFIG.pluginsDir || './plugins') + '/' + pluginPathname
      if (!fs.existsSync(pluginPath)) return await e.reply('要卸载的插件不存在！')
      try {
        await e.reply('正在卸载插件 [' + pluginPathname + ']...')
        if (process.platform === 'win32') {
          try { fs.rmSync(pluginPath, { recursive: true, force: true }) } catch (_) {
            try { await this.execSync('attrib -r -h -s "' + pluginPath + '\\*.*" /s /d', null) } catch (_) {}
            fs.rmSync(pluginPath, { recursive: true, force: true })
          }
        } else {
          fs.rmSync(pluginPath, { recursive: true, force: true })
        }
        return await e.reply('插件 [' + pluginPathname + '] 卸载成功')
      } catch (err) {
        return await e.reply('插件卸载失败！\n' + err.message)
      }
    }

    async searchPlugin(e) {
      if (!this.checkPermission(e)) return false
      var commsg = e.msg.match(/^#搜索插件(.*)$/)
      if(!commsg) return false
      try {
        var plugins_list = await this.getplugins()
        var keyword = commsg[1].trim()
        var matched = []
        for (var idx = 0; idx < plugins_list.length; idx++) {
          var item = plugins_list[idx]
          if ((item.pathname && item.pathname.indexOf(keyword) !== -1) ||
              (item.pluginname && item.pluginname.indexOf(keyword) !== -1) ||
              (item.author && item.author.indexOf(keyword) !== -1) ||
              (item.describe && item.describe.indexOf(keyword) !== -1)) {
            matched.push(item)
          }
        }
        if(matched.length == 0) return await e.reply(`未搜索到插件！`)
        var msgList = []
        msgList.push({ user_id: e.self_id, message: `搜索到${matched.length}个插件`, nickname: '插件管理器' })
        for(var mi2 = 0; mi2 < matched.length; mi2++) {
          var item = matched[mi2]
          var msg = `插件名称:${item.pluginname}\n作者:${item.author}\n简介:${item.describe}\n插件链接:${item.url}\n安装指令:#安装插件${item.pathname}`
          msgList.push({ user_id: e.self_id, message: msg, nickname: item.author || '未知' })
        }
        await this.sendForwardMsg(e, msgList)
        return true
      } catch(error) {
        logger.error('[插件管理器] 搜索插件失败: ' + error.message)
        return e.reply('搜索插件失败: ' + error.message)
      }
    }

    /* ================= 仓库搜索 ================= */

    async searchRepositoryShort(e) {
      var msg = e.msg || ''
      var keyword = ''
      if (msg.match(/^#[Gg][Ii][Tt][Hh][Uu][Bb]搜索/)) {
        keyword = msg.replace(/^#[Gg][Ii][Tt][Hh][Uu][Bb]搜索/, '').trim()
        e._searchPlatform = 'github'
      } else if (msg.match(/^#[Gg][Ii][Tt][Cc][Oo][Dd][Ee]搜索/)) {
        keyword = msg.replace(/^#[Gg][Ii][Tt][Cc][Oo][Dd][Ee]搜索/, '').trim()
        e._searchPlatform = 'gitcode'
      }
      if (!keyword) return false
      e.msg = '#搜索仓库 ' + keyword
      return await this.searchRepository(e)
    }

    async searchRepository(e) {
      if (!this.checkPermission(e)) return false
      var commsg = e.msg.match(/^#搜索(github|gitcode)?仓库(.+)$/)
      if(!commsg) return false
      var platform = commsg[1] || e._searchPlatform || ''
      var keyword = commsg[2].trim()
      if(!keyword) return e.reply('请提供搜索关键词')
      var platformName = platform === 'gitcode' ? 'GitCode' : 'GitHub'
      await e.reply(`正在${platformName}搜索仓库: ${keyword}`)
      try {
        var repos = []
        if(platform === 'gitcode') {
          repos = await this.searchGitcodeAPI(keyword)
        } else {
          repos = await this.searchGitHubAPI(keyword)
          if(repos.length === 0) {
            await e.reply('GitHub 未找到结果，尝试 GitCode 搜索...')
            repos = await this.searchGitcodeAPI(keyword)
          }
        }
        if(repos.length === 0) return await e.reply('未找到相关仓库')
        var msgList = []
        msgList.push({ user_id: e.self_id, message: `${platformName}搜索到${repos.length}个仓库`, nickname: '插件管理器' })
        for(var ri = 0; ri < repos.length; ri++) {
          var r = repos[ri]
          var rmsg = `仓库名:${r.name}\n描述:${r.description || '暂无'}\n链接:${r.html_url}`
          msgList.push({ user_id: e.self_id, message: rmsg, nickname: r.owner || '未知' })
        }
        await this.sendForwardMsg(e, msgList)
        return true
      } catch(error) {
        logger.error('[插件管理器] 仓库搜索失败: ' + error.message)
        return e.reply('仓库搜索失败: ' + error.message)
      }
    }

    async searchGitHubAPI(query) {
      try {
        var res = await fetch('https://api.github.com/search/repositories?q=' + encodeURIComponent(query) + '&sort=stars&order=desc&per_page=10', {
          headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Yunzai-Plugin-Manager' }
        })
        var data = await res.json()
        if(!data.items) return []
        var result = []
        for(var i = 0; i < Math.min(10, data.items.length); i++) {
          result.push({
            name: data.items[i].full_name,
            description: data.items[i].description,
            html_url: data.items[i].html_url,
            owner: data.items[i].owner ? data.items[i].owner.login : '未知'
          })
        }
        return result
      } catch(e) { return [] }
    }

    async searchGitcodeAPI(query) {
      try {
        var res = await fetch('https://gitcode.com/api/v4/projects?search=' + encodeURIComponent(query) + '&per_page=10', {
          headers: { 'User-Agent': 'Yunzai-Plugin-Manager' }
        })
        var data = await res.json()
        if(!Array.isArray(data)) return []
        var result = []
        for(var i = 0; i < Math.min(10, data.length); i++) {
          result.push({
            name: data[i].name_with_namespace || data[i].name,
            description: data[i].description,
            html_url: data[i].web_url || data[i].http_url_to_repo,
            owner: data[i].namespace ? data[i].namespace.name : '未知'
          })
        }
        return result
      } catch(e) {
        return []
      }
    }

    /* ================= 配置管理 ================= */

    async resetConfig(e) {
      if (!this.checkPermission(e)) return false
      try {
        await e.reply('请手动编辑 ./plugins/example/config.yaml 文件来重置配置\n或删除该文件后重启以重新生成默认配置')
        return true
      } catch (error) {
        logger.error('[插件管理器] 重置配置失败: ' + error.message)
        return e.reply('重置配置失败: ' + error.message)
      }
    }

    async reloadConfigCmd(e) {
      if (!this.checkPermission(e)) return false
      loadConfig()
      await e.reply('配置文件重载成功')
      return true
    }
}
