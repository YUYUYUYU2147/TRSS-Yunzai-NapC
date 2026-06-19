import fs from 'fs/promises'
import puppeteer from '../../lib/puppeteer/puppeteer.js'
import { existsSync } from 'fs'

/**
 * 作者：千奈千祁(2632139786)
 * Gitee主页：Gitee.com/QianNQQ
 * Github主页：Github.com/QianNQQ
 *
 * 该插件所有版本发布于 该仓库(https://gitee.com/qiannqq/yunzai-plugin-JS)
 * 本插件及该仓库的所有插件均遵循 GPL3.0 开源协议
 *
 * 搬运本插件请保留本仓库所有信息，遵守该仓库的协议。并告知插件作者，无需取得回复
 *
 * 请勿使用本插件进行盈利等商业活动行为
 */

// 白名单QQ，除主人外可以查看控制台日志的人。123456789和987654321为示例值
let whiteQQ = [123456789, 987654321]

let rchp = `./resources/cmd.html`

export class example2 extends plugin {
  constructor() {
    super({
      name: '渲染控制台',
      dsc: '',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#?控制台(错误)?日志.*$',
          fnc: 'renderConsole'
        }
      ]
    })
  }
  async renderConsole(e) {
    if(!e.isMaster && !whiteQQ.includes(e.user_id)) return false
    let logDate = new Date().toISOString().split('T')[0]
    let logNumber = 100
    let logPath = `./logs/command.${logDate}.log`
    let cmd = e.msg.replace(/^#?控制台(错误)?日志\s*/, '')
    if (cmd && cmd.match(/(\d+)/)) {
      logNumber = parseInt(cmd.match(/(\d+)/)[1])
      // 限制最大行数避免性能问题
      logNumber = Math.min(logNumber, 1000)
    }
    if(e.msg.includes('错误日志')) {
      logPath = `./logs/error.log`
    }
    let logContent
    try {
      logContent = await fs.readFile(logPath, 'utf-8')
    } catch (err) {
      return e.reply(`读取${logPath}日志失败\n${err}`), true
    }

    if (!logContent || logContent.trim() === '') {
      return e.reply(`${logPath} 日志文件为空`), true
    }

    logContent = this.getLastNLines(logContent, logNumber)
    let logLevelList = {
      'MARK': '90',
      'ERRO': '91',
      'WARN': '93',
      'INFO': '32',
      'DEBU': '94',
    }
    logContent = logContent.map((item) => {
      let logLevel = item.match(/\[(.*?)\]\[(.*?)\]/);
      if (logLevel && logLevelList[logLevel[2]]) {
        let reg = new RegExp(`\\[(.*?)\\]\\[${logLevel[2]}\\]`);
        item = item.replace(reg, `\x1b[${logLevelList[logLevel[2]]}m[${logLevel[1]}][${logLevel[2]}]\x1b[39m`);
      }
      return parseAnsiColors(item);
    })

    try {
      let img = await puppeteer.screenshot('renderC', {
        imgType: "jpeg",
        quality: 100,
        tplFile: rchp,
        data: logContent,
        timeout: 30000,
        retry: 2
      })
      await e.reply(img)
    } catch (renderErr) {
      logger.error(`[渲染控制台] 渲染失败: ${renderErr.message}`)
      return e.reply(`渲染失败: ${renderErr.message}`), true
    }
  }
  getLastNLines(str, n) {
    const lines = str.split('\n');
    return lines.slice(-n);
  }
}

const colorMap = {
  '30': 'color-black',
  '31': 'color-red',
  '32': 'color-green',
  '33': 'color-yellow',
  '34': 'color-blue',
  '35': 'color-magenta',
  '36': 'color-cyan',
  '37': 'color-white',
  '90': 'color-gray',
  '91': 'color-red',
  '92': 'color-green',
  '93': 'color-yellow',
  '94': 'color-blue',
  '95': 'color-magenta',
  '96': 'color-cyan',
  '97': 'color-white'
};

function parseAnsiColors(text) {
  if (!text) return '';
  for (let a in colorMap) {
    let reg = new RegExp(`\x1b\\[${a}m`, 'g')
    text = text.replace(reg, `<span class="${colorMap[a]}">`)
  }
  if(/\x1b\[38;\d;\d+;\d+;\d+m/.test(text)) {
    let rgb = text.match(/\x1b\[38;\d;(\d+);(\d+);(\d+)m/)
    text = text.replace(/\x1b\[38;\d;\d+;\d+;\d+m/, `<span style="color: rgb(${rgb[1]}, ${rgb[2]}, ${rgb[3]})">`)
  }
  return text.replace(/\x1b\[39m/g, '</span>')
}

async function init() {
  if(!existsSync(rchp)) {
    await fs.writeFile(rchp, `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>渲染控制台</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Menlo', 'Monaco', 'Consolas', monospace;
            background-image: url('https://t.alcy.cc/moemp');
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .terminal-container {
            width: 800px;
            min-height: 500px;
            background: rgba(0, 0, 0, 0.8);
            border-radius: 10px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }

        .terminal-header {
            background: linear-gradient(to bottom, #f0f0f0, #e0e0e0);
            height: 40px;
            display: flex;
            align-items: center;
            padding: 0 15px;
            border-bottom: 1px solid #ccc;
        }

        .window-controls {
            display: flex;
            gap: 8px;
        }

        .window-control {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            cursor: pointer;
        }

        .close { background: #ff5f57; }
        .minimize { background: #ffbd2e; }
        .maximize { background: #28ca42; }

        .terminal-title {
            flex: 1;
            text-align: center;
            color: #333;
            font-size: 14px;
            font-weight: 500;
        }

        .terminal-body {
            background: #1e1e1e;
            min-height: calc(500px - 40px);
            padding: 20px;
            overflow-y: auto;
            color: #fff;
            font-size: 14px;
            line-height: 1.6;
        }

        .prompt {
            color: #00ff00;
            margin-bottom: 5px;
        }

        .output {
            margin-bottom: 2px;
            white-space: pre-wrap;
            line-height: 1.4;
            word-break: break-all;
            overflow-wrap: break-word;
        }

        .color-black { color: #000000; }
        .color-red { color: #ff0000; }
        .color-green { color: #00ff00; }
        .color-blue { color: #0000ff; }
        .color-yellow { color: #ffff00; }
        .color-cyan { color: #00ffff; }
        .color-magenta { color: #ff00ff; }
        .color-white { color: #ffffff; }
        .color-gray { color: #808080; }

        .input-line {
            display: flex;
            align-items: center;
        }

        .cursor {
            display: inline-block;
            width: 8px;
            height: 16px;
            background: #fff;
            animation: blink 1s infinite;
            margin-left: 2px;
        }

        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
        }
    </style>
</head>
<body>
    <div class="terminal-container">
        <div class="terminal-header">
            <div class="window-controls">
                <div class="window-control close"></div>
                <div class="window-control minimize"></div>
                <div class="window-control maximize"></div>
            </div>
            <div class="terminal-title">Yunzai</div>
        </div>
        <div class="terminal-body" id="terminalBody">
            {{ each data i }}
                <div class="output">{{@ i }}</div>
            {{/each}}
        </div>
    </div>
</body>
</html>
`, 'utf-8')
  }
}

init()