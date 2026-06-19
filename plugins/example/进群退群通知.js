import fetch from 'node-fetch';

const voiceAPI = 'https://yuyin.3198550236.fun/';
const defaultSpeaker = '琪亚娜天穹游侠薪炎之律者终焉之律者'; // 设置默认语音角色

async function synthesizeVoice(text, speaker = defaultSpeaker, speed = 1.0) {
    const url = `${voiceAPI}tts?text=${encodeURIComponent(text)}&speaker=${speaker}&speed=${speed}`;
    logger.mark('[语音] 合成URL:', url);
    return url;
}

async function downloadVoice(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`下载语音失败: ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return `base64://${buffer.toString('base64')}`;
}

class Voice {
    static async sendVoice(e, text, speaker = defaultSpeaker, speed = 1.0) {
        try {
            const url = await synthesizeVoice(text, speaker, speed);
            // napcat兼容：先下载音频再转base64发送
            const base64 = await downloadVoice(url);
            await e.reply({ type: 'record', file: base64 });
            logger.mark('[语音] 发送成功');
        } catch (error) {
            logger.error('[语音] 发送失败:', error.message);
            // 失败时发文字兜底
            await e.reply(text);
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

        // 调试：先删除旧缓存，确保每次都能触发
        await redis.del(key);
        
        // 如需启用冷却，注释掉上面那行即可
        // if (await redis.get(key)) {
        //     logger.mark('[进群] 冷却中，跳过');
        //     return;
        // }
        await redis.set(key, '1', { EX: cooldown });

        const speakerKey = 'newcomer_speaker';
        const speaker = await getCurrentSpeaker(speakerKey, defaultSpeaker);
        logger.mark('[进群] 角色:', speaker, '文本:', welcomeText);
        
        await Voice.sendVoice(e, welcomeText, speaker);
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
        
        await Voice.sendVoice(e, leaveText, speaker);
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
                }
            ]
        });
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
