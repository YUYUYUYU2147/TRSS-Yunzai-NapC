import moment from 'moment';
import fetch from 'node-fetch';
import common from '../../lib/common/common.js';
import Cfg from '../../lib/config/config.js';

/**
 * 编写于2024.09.01
 * [作者] 傅卿何
 * [联系方式: QQ] 3620060826
 */

/** 版本信息
 * [2024.09.01]V1.0: 首发版本，没什么好说的
 * [2024.09.05]V1.1: 增加续火的同时抽字符 (借鉴Yenai-plugin抽字符代码)
 * [2024.09.05]V1.1.1: 小BUG
 * [2024.09.07]V1.1.2: 增加判断主人
 */

/** BotQQ号 */
const QQ = Cfg['2984785736']

/** 配置项 */
const config = {
    delayTime: 60, // 延迟多久推送下一个群，单位：秒
    blacklist: [ // 黑名单群，名单内的群将不会执行续火与打卡，多个群请用英文逗号隔开
        1123445
    ],
    pushPrompt: true, // 是否开启推送提示[true: 开启 | false: 关闭]，开启后将发送续火打卡提示给第一个主人
    text: '火', // 获取诗词失败的默认续火文案
    luckyCharacter: true, // 是否开启抽字符[true: 开启 | false: 关闭]
    isSVIP: false, // 机器人是否是SVIP，[true: 是 | false: 不是]，是SVIP则抽取三次字符
}
export class example extends plugin {
    constructor() {
        super({
            name: '[Task]群打卡&诗词续火',
            dsc: '群打卡&诗词续火',
            event: "message",
            priority: -100000,
            rule: [
                { reg: /^执行(打卡|续火)$/, fnc: 'carryOut' }
            ]
        })
        this.task = {
            name: '[定时任务]群打卡&诗词续火',
            fnc: () => this.a(),
            cron: '0 0 0 * * *' // 每日12点1分开始推送
        }
    }
    async carryOut(e) {
        if (!e.isMaster) return false
        this.a()
    }

    async a() {
        const { delayTime, blacklist, text, luckyCharacter, isSVIP } = config

        send("开始执行[群打卡&诗词续火&抽字符]")
        const timeFormat = 'YYYY-MM-DD HH:mm:ss'
        const dateTimeString = moment(Date.now()).format(timeFormat);

        const linkData = (await (await fetch('https://oiapi.net/API/Sentences')).json())
        const { message, code } = linkData

        let msg = (code !== 1) ? [text] : [message];
        send(`续火文案\r${msg}`)

        const grouoList = (Array.from(new Map(Bot[QQ].gl).keys())).filter(item => !blacklist.includes(item));

        for (const ID of grouoList) {
            logger.mark(`正在发送消息到群组: ${ID}`);

            let tips = ''
            if (luckyCharacter) {
                let n = 1
                if (isSVIP) n = 3
                for (let i = 0; i < n; i++) {
                    let body = JSON.stringify({
                        group_code: ID
                    })
                    let url = `https://qun.qq.com/v2/luckyword/proxy/domain/qun.qq.com/cgi-bin/group_lucky_word/draw_lottery?bkn=${Bot.bkn}`
                    const res = await fetch(url, {
                        method: "POST",
                        headers: {
                            "Content-type": "application/json;charset=UTF-8",
                            "Cookie": Bot?.cookies?.["qun.qq.com"],
                            "qname-service": "976321:131072",
                            "qname-space": "Production"
                        },
                        body
                    }).then(res => res.json()).catch(err => logger.error(err))

                    if (res) {
                        if (res.retcode !== 11005) {
                            if (res.retcode === 0) {
                                if (res.data.word_info) {
                                    let { wording, word_desc } = res.data.word_info.word_info
                                    tips = `\r机器人为本群抽中了字符[${wording}]\r寓意为:[${word_desc}]`
                                    send(`机器人为群[${ID}]抽中了字符[${wording}]`)
                                }
                            }
                        }
                    }
                }
            }
            try {
                Bot[QQ].pickGroup(ID).sendMsg(msg + tips);
                Bot[QQ].pickGroup(ID).sign();
            } catch (error) {
                logger.error(`发送消息到群组 ${ID} 失败: ${error}`);
                continue;
            }
            await common.sleep(delayTime * 1000);
        }
        const executionTime = moment.utc(moment((moment(Date.now()).format(timeFormat)), timeFormat).diff(moment(dateTimeString, timeFormat))).format('HH:mm:ss');
        send(`[群打卡&诗词续火&抽字符]执行结束\n耗时：${executionTime}`)
    }
}

function send(text) {
    if (!config['pushPrompt']) return false
    Bot[QQ].pickFriend(Cfg['masterQQ'][0]).sendMsg(text)
    logger.mark(text)
}