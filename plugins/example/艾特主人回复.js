import plugin from '../../lib/plugins/plugin.js'
import cfg from '../../lib/config/config.js'
import https from 'https'
import http from 'http'

export class atmaster extends plugin {
    constructor() {
        super({
            name: '艾特主人回复',
            dsc: '艾特主人回复',
            event: 'message',
            priority: -999999999999999,
            rule: [{
                reg: '',
                fnc: 'atmaster'
            }]
        })
    }

    // 下载图片并转为 base64
    async getImageBase64(url) {
        return new Promise((resolve, reject) => {
            let client = url.startsWith('https') ? https : http
            client.get(url, { timeout: 10000 }, (res) => {
                // 处理重定向
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    return this.getImageBase64(res.headers.location).then(resolve).catch(reject)
                }
                let chunks = []
                res.on('data', chunk => chunks.push(chunk))
                res.on('end', () => {
                    let buf = Buffer.concat(chunks)
                    let ext = url.split('.').pop().split('?')[0] || 'jpg'
                    if (!['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext.toLowerCase())) {
                        ext = 'jpg'
                    }
                    resolve('base64://' + buf.toString('base64'))
                })
            }).on('error', reject).on('timeout', () => {
                reject(new Error('下载超时'))
            })
        })
    }

    async atmaster(e) {
        try {
            // 获取主人QQ列表
            let master = cfg.masterQQ
            let masterList = []
            if (Array.isArray(master)) {
                masterList = master.map(m => String(m))
            } else if (master) {
                masterList = [String(master)]
            }

            // 提取消息中所有 at 的 QQ
            let atQQList = []

            if (e.message && Array.isArray(e.message)) {
                for (let i = 0; i < e.message.length; i++) {
                    let msg = e.message[i]
                    if (msg && msg.type === 'at') {
                        let qq = msg.qq || msg.data?.qq
                        if (qq) atQQList.push(String(qq))
                    }
                }
            }

            if (e.raw_message && typeof e.raw_message === 'string') {
                let re = /\[CQ:at,qq=(\d+)\]/g
                let m
                while ((m = re.exec(e.raw_message)) !== null) {
                    atQQList.push(m[1])
                }
            }

            // 检查是否艾特了主人
            let isAtMaster = false
            for (let qq of atQQList) {
                if (masterList.includes(qq)) {
                    isAtMaster = true
                    break
                }
            }

            if (!isAtMaster) return false

            // 图片API列表，逐个尝试
            let apis = [
                'https://t.alcy.cc/moe',
                'https://www.dmoe.cc/random.php',
                'https://api.yimian.xyz/img?type=moe',
                'https://api.vvhan.com/api/acgimg',
            ]

            let imgBase64 = null
            for (let api of apis) {
                try {
                    console.log('[atmaster] 尝试:', api)
                    imgBase64 = await this.getImageBase64(api)
                    if (imgBase64) break
                } catch (err) {
                    console.log('[atmaster] 失败:', api, err.message)
                }
            }

            if (!imgBase64) {
                await e.reply('抱歉，所有图片API都挂了，稍后再试吧~', true)
                return true
            }

            if (e.isMaster) {
                await e.reply("主人，你一定是想看看图片.\n改善下心情的对吧.", true)
                await e.reply([{ type: 'image', file: imgBase64 }], true)
                return true
            }

            await e.reply(["给你张图，别打扰主人！", { type: 'image', file: imgBase64 }], true)
            return true

        } catch (err) {
            console.log('[atmaster] 错误:', err.message)
            return false
        }
    }
}
