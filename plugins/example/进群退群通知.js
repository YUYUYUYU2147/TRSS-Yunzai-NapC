import fs from 'fs/promises'
import path from 'path'

const vitsApiBase = 'http://127.0.0.1:5091'
const speakers = [
  '派蒙','凯亚','安柏','丽莎','琴','香菱','枫原万叶','迪卢克','温迪','可莉','早柚','托马','芭芭拉',
  '优菈','云堇','钟离','魈','凝光','雷电将军','北斗','甘雨','七七','刻晴','神里绫华','戴因斯雷布',
  '雷泽','神里绫人','罗莎莉亚','阿贝多','八重神子','宵宫','荒泷一斗','九条裟罗','夜兰','珊瑚宫心海',
  '五郎','散兵','女士','达达利亚','莫娜','班尼特','申鹤','行秋','烟绯','久岐忍','辛焱','砂糖',
  '胡桃','重云','菲谢尔','诺艾尔','迪奥娜','鹿野院平藏',
  '丽塔','伊甸','八重樱','刻晴bh3','卡莲','卡萝尔','姬子','布洛妮娅','希儿','帕朵菲莉丝',
  '幽兰黛尔','德丽莎','格蕾修','梅比乌斯','渡鸦','爱莉希雅','琪亚娜','符华','维尔薇',
  '芽衣','菲谢尔bh3','阿波尼亚','空律','识律'
]

const defaultSpeaker = '派蒙';

/** vits-yunzai-plugin HTTP API 语音合成 */
async function apiTts(text, speaker) {
  const speakerName = speakers.find(s => s.includes(speaker) || speaker.includes(s)) || defaultSpeaker
  const synthRes = await fetch(`${vitsApiBase}/api/synthesize`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ speaker: speakerName, text })
  })
  if (!synthRes.ok) throw new Error(`API合成失败: ${synthRes.status}`)
  const synthData = await synthRes.json()
  if (!synthData.ok) throw new Error(`API合成错误: ${synthData.message || '未知'}`)

  const audioUrl = `${vitsApiBase}${synthData.data.audioUrl}`
  const audioRes = await fetch(audioUrl)
  if (!audioRes.ok) throw new Error(`获取音频失败: ${audioRes.status}`)
  const rawBuf = Buffer.from(await audioRes.arrayBuffer())

  const tmpIn = `/tmp/voice-${Date.now()}-raw.wav`
  const tmpOut = `/tmp/voice-${Date.now()}.wav`
  await fs.writeFile(tmpIn, rawBuf)
  await Bot.exec(`ffmpeg -y -i "${tmpIn}" -acodec pcm_s16le -ar 24000 -ac 1 "${tmpOut}"`, { timeout: 10000 })
  await fs.unlink(tmpIn).catch(() => {})
  const buf = await fs.readFile(tmpOut)
  await fs.unlink(tmpOut).catch(() => {})
  return `base64://${buf.toString('base64')}`
}

class Voice {
    static async sendVoice(e, text, speaker = defaultSpeaker) {
        try {
            const url = await apiTts(text, speaker)
            await e.reply(segment.record(url))
            logger.mark('[语音] vits API发送成功')
        } catch (err) {
            logger.warn('[语音] vits API失败:', err.message)
        }
    }
}

function getRandomMessage(messages) {
    return messages[Math.floor(Math.random() * messages.length)];
}

async function getCurrentSpeaker(key, fallbackSpeaker) {
    const speaker = await redis.get(key);
    return speaker || fallbackSpeaker;
}

// ==================== 进群欢迎 ====================

class Newcomer extends plugin {
    constructor() {
        super({
            name: '欢迎新人',
            dsc: '新人入群欢迎',
            event: 'notice.group.increase',
        });
    }

    async accept(e) {
        logger.mark('[进群] 触发, user:', e.user_id, 'group:', e.group_id);
        if (e.user_id === e.self_id) return;

        const name = e.member?.card || e.member?.nickname || e.user_id;
        const welcomeMessages = [
            `欢迎 ${name}！`,
            `欢迎 ${name} 加入我们的群组！`,
            `很高兴见到你，${name}，欢迎！`,
            `新人 ${name} 报到，大家欢迎！`,
            `欢迎 ${name}，希望你在这里玩得开心！`
        ];
        const welcomeText = getRandomMessage(welcomeMessages);
        const cooldown = 30;
        const key = `Yz:newcomers:${e.group_id}`;

        await redis.del(key);
        await redis.set(key, '1', { EX: cooldown });

        const speakerKey = 'newcomer_speaker';
        const speaker = await getCurrentSpeaker(speakerKey, defaultSpeaker);
        logger.mark('[进群] 角色:', speaker, '文本:', welcomeText);
        
        await e.reply(welcomeText)
        Voice.sendVoice(e, welcomeText, speaker).catch(() => {})
    }
}

// ==================== 退群通知 ====================

class OutNotice extends plugin {
    constructor() {
        super({
            name: '退群通知',
            dsc: 'xx退群了',
            event: 'notice.group.decrease'
        });
    }

    async accept(e) {
        logger.mark('[退群] 触发, user:', e.user_id, 'group:', e.group_id);
        if (e.user_id === e.self_id) return;

        const name = e.member?.card || e.member?.nickname || e.user_id;
        const leaveMessages = [
            `${name} 退群了`,
            `${name} 离开了我们的群组`,
            `${name} 再见，希望以后还能见到你`,
            `${name} 永别了`,
            `${name} 离开了，希望他一切顺利`
        ];
        const leaveText = getRandomMessage(leaveMessages);

        const speakerKey = 'outnotice_speaker';
        const speaker = await getCurrentSpeaker(speakerKey, defaultSpeaker);
        logger.mark('[退群] 角色:', speaker, '文本:', leaveText);
        
        await e.reply(leaveText)
        Voice.sendVoice(e, leaveText, speaker).catch(() => {})
    }
}

// ==================== 修改语音角色 ====================

class ModifySpeaker extends plugin {
    constructor() {
        super({
            name: '修改语音角色',
            dsc: '修改进群和退群的语音角色',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#设置进群角色 .+$',
                    fnc: 'setNewcomerSpeaker'
                },
                {
                    reg: '^#设置退群角色 .+$',
                    fnc: 'setOutNoticeSpeaker'
                },
                {
                    reg: '^#AI角色列表$',
                    fnc: 'listAiCharacters'
                }
            ]
        });
    }

    async listAiCharacters(e) {
        if (!e.group?.getAiCharacters) return e.reply('当前后端不支持AI角色查询')
        try {
            const list = await e.group.getAiCharacters(0)
            const chars = list?.data?.characters || list?.characters || list?.data || []
            const names = chars.map(c => c.name || c.character_name || c.character_id || c.id).filter(Boolean)
            if (names.length === 0) {
                e.reply(`未获取到AI角色列表\n原始数据: ${JSON.stringify(list).slice(0, 500)}`)
                return
            }
            e.reply(`可用的AI语音角色(${names.length}个):\n${names.join('、')}`)
        } catch (err) {
            e.reply(`获取AI角色失败: ${err.message}`)
        }
    }

    async setNewcomerSpeaker(e) {
        logger.mark('[设置进群角色] 触发, msg:', e.msg);
        const speaker = e.msg.replace(/^#设置进群角色 /, '').trim();
        try {
            await redis.set('newcomer_speaker', speaker);
            await e.reply(`迎新语音角色已成功设置为：${speaker}`);
        } catch (error) {
            logger.error('Error setting newcomer speaker:', error);
            await e.reply('设置迎新语音角色失败，请稍后再试。');
        }
    }

    async setOutNoticeSpeaker(e) {
        logger.mark('[设置退群角色] 触发, msg:', e.msg);
        const speaker = e.msg.replace(/^#设置退群角色 /, '').trim();
        try {
            await redis.set('outnotice_speaker', speaker);
            await e.reply(`退群通知语音角色已成功设置为：${speaker}`);
        } catch (error) {
            logger.error('Error setting out notice speaker:', error);
            await e.reply('设置退群通知语音角色失败，请稍后再试。');
        }
    }
}

export { Newcomer, OutNotice, ModifySpeaker };
