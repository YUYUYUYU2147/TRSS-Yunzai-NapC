import plugin from '../../lib/plugins/plugin.js';
import fetch from 'node-fetch';

// 在这里定义您的 Bot 名称
const botName = '琪宝'; // 将 '亚托莉' 替换为您想要的名称，默认为 'Bot'

// API 配置
const API_URL = 'https://v3.alapi.cn/api/abbr';
const API_TOKEN = 'o98tupjcyacpenqglfxhsoekfxzdkm';

export class SuoxiePlugin extends plugin {
  constructor() {
    super({
      name: '缩写查询',
      desc: '查询缩写的具体意思 (支持指令和无指令)',
      event: 'message.group',
      priority: 5000,
      rule: [
        {
          reg: '^#(缩写|啥意思)\s*(.+)$', // 匹配以 #缩写 或 #啥意思 开头
          fnc: 'querySuoxie',
        },
        {
          reg: '^[A-Za-z0-9]+$', // 匹配完全由字母和数字组成的词语（可能是缩写）
          fnc: 'autoQuerySuoxie',
          // 添加预过滤函数，在正则匹配前过滤消息
          log: false, // 关闭此规则的日志记录
          filter: (e) => {
            // 检查原始消息是否存在
            if (!e.raw_message) {
              return false;
            }

            // 检查是否为多条消息（可能包含@等复杂元素）
            if (e.message && Array.isArray(e.message) && e.message.length > 1) {
              return false;
            }

            // 过滤掉图片消息
            if (e.raw_message.includes('{image:') || 
                e.raw_message.includes('[图片') || 
                e.raw_message.includes('image:')) {
              return false;
            }

            // 过滤掉包含@的消息（各种可能的格式）
            if (e.message && e.message.some(item => item.type === 'at') || 
                e.raw_message.includes('@') ||
                e.raw_message.includes('{at:') ||
                e.raw_message.includes('[CQ:at,') ||
                e.msg.includes('@')) {
              return false;
            }

            // 检查群消息是否为最近被@的回复
            if (e.source || e.quote || e.hasReply) {
              return false;
            }

            // 只处理纯字母数字且长度合适的消息（2-20位）
            if (!/^[A-Za-z0-9]+$/.test(e.raw_message) || e.raw_message.length < 2 || e.raw_message.length > 20) {
              return false;
            }

            // 记录日志以便调试
            // console.log(`[缩写查询] 通过过滤: ${e.raw_message}`);

            return true;
          }
        },
      ],
    });
  }

  async querySuoxie(e) {
    const word = e.msg.replace(/^#(缩写|啥意思)\s*/, '').trim();
    if (!word) {
      await e.reply(`请提供要查询的缩写，例如：#缩写 yyds`, true);
      return true;
    }
    await this.fetchAndReply(e, word, false);
    return true;
  }

  async autoQuerySuoxie(e) {
    // 再次确认消息格式
    if (!e.raw_message || e.raw_message.includes('@') || e.raw_message.includes('{at:')) {
      return false;
    }

    // 由于已经在filter中过滤了不需要的消息，这里可以直接处理
    await this.fetchAndReply(e, e.raw_message, true);
    return true;
  }

  async fetchAndReply(e, word, isAutoQuery) {
    const apiUrl = `${API_URL}?token=${API_TOKEN}&abbr=${encodeURIComponent(word)}`;

    try {
      const response = await fetch(apiUrl);
      const result = await response.json();

      if (result.success && result.data && result.data.explain_arr && result.data.explain_arr.length > 0) {
        const meanings = result.data.explain_arr.join('、');

        // 自动查询时，如果结果只有1个且是常见英文单词，不回复（避免误触发）
        if (isAutoQuery && result.data.explain_arr.length === 1) {
          const singleResult = result.data.explain_arr[0];
          // 常见英文单词黑名单
          const commonWords = ['脸', '图片', '图像', '照片', '文件', '视频', '音频', '声音', '文本', '文字'];
          if (commonWords.includes(singleResult)) {
            return;
          }
        }

        const replyMessage = `${botName}自动理解抽象语言：\n${meanings}`;
        await e.reply(replyMessage, true);
      } else if (!isAutoQuery) {
        // 只有指令查询无结果时才提示
        await e.reply(`${botName}自动理解抽象语言：\n未找到该缩写的含义，可能尚未录入。`, true);
      }
      // 自动查询无结果时不回复，避免打扰
    } catch (error) {
      console.error('缩写查询 API 请求失败:', error);
      if (!isAutoQuery) {
        await e.reply(`${botName}自动理解抽象语言：\n缩写查询 API 请求失败，请稍后再试。`, true);
      }
    }
  }
}