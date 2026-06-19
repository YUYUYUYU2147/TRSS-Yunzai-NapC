import moment from 'moment'

export class fytj extends plugin {
  constructor() {
    super({
      name: '发言统计',
      dsc: '统计',
      event: 'message.group',
      priority: -Infinity,
      rule: [
        {
          reg: "^#?(我的)?(水群|氵群)(统计|记录)$|^我有多(水|氵)$",
          fnc: 'queryChatTime'
        },
        {
          reg: "^#?(水群|氵群)(排行|排名|排行榜)$",
          fnc: 'rankChatTime'
        },
        {
          reg: "",
          fnc: 'fytj',
          log: false
        }
      ]
    });
    this.task = [
      {
        cron: '0 0 0 * * ?',
        name: '清除水群数据',
        log: false,
        fnc: () => this.clearData()
      },
    ];

    // 配置项
    this.baseProbability = 0.0001; // 默认的基础概率
    this.maxProbability = 0.2; // 最大调整后的概率
    this.maxChatTime = 9000; // 当累计聊天时间达到这个值时，概率达到最大，默认设置2.5h
    this.n = 360; // 假设 n 秒作为阈值(有效氵群时间)，建议180-600之间
    this.cooldownTime = 3600; // 设置随机回复一小时的冷却(每个人独立)
  }

  async fytj(e) {
  if (e.adapter_name == 'TelegramBot' || e.adapter_name == 'QQBot' || e.adapter_name == 'WeChat') {
      return false;
    }
    const groupKeyPrefix = `group:${e.group_id}:user:${e.user_id}`;
    const lastMessageTimeKey = `${groupKeyPrefix}:lastTime`;
    const chatTimeKey = `${groupKeyPrefix}:chatTime`;
    const messageCountKey = `${groupKeyPrefix}:messageCount`;
    const lastReplyKey = `${groupKeyPrefix}:lastReply`;
    let currentTime = Date.now();

    let lastMessageTime = await redis.get(lastMessageTimeKey);
    const userCardKey = `group:${e.group_id}:userCard:${e.user_id}`;
    await redis.set(userCardKey, e.sender.card);

    let messageCount = await redis.get(messageCountKey);
    if (messageCount) {
      await redis.del(messageCountKey);
      messageCount = parseInt(messageCount) + 1;
    } else {
      messageCount = 1;
    }
    await redis.set(messageCountKey, messageCount.toString());
    const monthKey = `Yz:count:sendMsg:month:${moment().month() + 1}`;
    await redis.incr(monthKey);

    if (!lastMessageTime) {
      await redis.set(lastMessageTimeKey, currentTime.toString());
      return false;
    }
    let timeDiff = (currentTime - parseInt(lastMessageTime)) / 1000;

    if (timeDiff <= this.n) {
      let currentChatTime = await redis.get(chatTimeKey);
      let newChatTime = currentChatTime ? parseFloat(currentChatTime) + timeDiff : timeDiff;
      await redis.set(chatTimeKey, newChatTime.toString());
    } else {
      let currentChatTime = await redis.get(chatTimeKey);
      let newChatTime = currentChatTime ? parseFloat(currentChatTime) + 60 : 60;
      await redis.set(chatTimeKey, newChatTime.toString());
    }
    await redis.set(lastMessageTimeKey, currentTime.toString());

    let lastReplyTime = await redis.get(lastReplyKey);
    if (lastReplyTime && (currentTime - parseInt(lastReplyTime)) / 1000 < this.cooldownTime) {
      return false;
    }
    let chatTime = await redis.get(chatTimeKey);
    let adjustedProbability = this.adjustReplyProbability(chatTime);
    if (Math.random() < adjustedProbability) {
      let timeStr = this.formatChatTime(chatTime);
      e.reply([segment.at(e.user_id), ` 你今天已经水群 ${timeStr} 了! (已发送${messageCount}条消息)`]);
      await redis.set(lastReplyKey, currentTime.toString());
    }
    return false;
  }

  async queryChatTime(e) {
    const groupKeyPrefix = `group:${e.group_id}:user:${e.user_id}`;
    const chatTimeKey = `${groupKeyPrefix}:chatTime`;
    const messageCountKey = `${groupKeyPrefix}:messageCount`;
    let chatTime = await redis.get(chatTimeKey);
    let messageCount = await redis.get(messageCountKey);

    if (chatTime) {
      let timeStr = this.formatChatTime(chatTime);
      e.reply([segment.at(e.user_id), ` 你今天已经水群 ${timeStr} (${messageCount}条消息)`]);
    } else {
      e.reply([segment.at(e.user_id), " 还没有数据呢～说几句话再试试吧～"]);
    }
    return this.fytj(e);
  }

  async rankChatTime(e) {
    const groupId = e.group_id;
    const keys = await redis.keys(`group:${groupId}:user:*:chatTime`);
    const usersChatTimes = {};

    for (let key of keys) {
      const userId = key.split(':')[3];
      const chatTime = await redis.get(key);
      usersChatTimes[userId] = parseFloat(chatTime);
    }

    const sortedUsers = Object.entries(usersChatTimes).sort((a, b) => b[1] - a[1]).slice(0, 10);

    const rankedList = [];
    for (let i = 0; i < sortedUsers.length; i++) {
      const [userId, chatTime] = sortedUsers[i];
      const userCardKey = `group:${groupId}:userCard:${userId}`;
      const userCard = await redis.get(userCardKey);
      const messageCountKey = `group:${groupId}:user:${userId}:messageCount`;
      const messageCount = await redis.get(messageCountKey);
      const timeStr = this.formatChatTime(chatTime);
      rankedList.push(`${i + 1}. 『${userCard}』 (${timeStr},${messageCount}条)`);
      // Add a separator line after each entry except the last one.
      if (i !== sortedUsers.length - 1) {
        rankedList.push('-----------------------------------');
      }
    }

    e.reply(`【${e.group_name}】
=====================
氵群排行榜 (Top 10)
=====================

${rankedList.join('\n')}
`);
  }

  async clearData() {
    logger.mark("开始清除Redis数据...");
    const chatTimeKeys = await redis.keys('group:*:user:*:chatTime');
    const delChatTimePromises = chatTimeKeys.map(key => redis.del(key));
    const lastTimeKeys = await redis.keys('group:*:user:*:lastTime');
    const delLastTimePromises = lastTimeKeys.map(key => redis.del(key));
    const userCardKeys = await redis.keys('group:*:userCard:*');
    const delUserCardPromises = userCardKeys.map(key => redis.del(key));
    const lastReplyKeys = await redis.keys('group:*:user:*:lastReply');
    const delLastReplyPromises = lastReplyKeys.map(key => redis.del(key));
    const messageCountKeys = await redis.keys('group:*:user:*:messageCount');
    const delMessageCountPromises = messageCountKeys.map(key => redis.del(key));

    await Promise.all([
      ...delChatTimePromises,
      ...delLastTimePromises,
      ...delUserCardPromises,
      ...delLastReplyPromises,
      ...delMessageCountPromises
    ]);

    logger.mark("Redis数据清除完成");
  }

  adjustReplyProbability(chatTime) {
    if (chatTime >= this.maxChatTime) {
        return this.maxProbability;
    }
    return this.baseProbability + ((this.maxProbability - this.baseProbability) / this.maxChatTime) * chatTime;
}

  formatChatTime(chatTime) {
    let hours = Math.floor(chatTime / 3600);
    let minutes = Math.floor((chatTime % 3600) / 60);
    let seconds = Math.floor(chatTime % 60);

    let timeStr = "";
    if (hours > 0) {
      timeStr += `${hours} 小时 `;
    }
    if (minutes > 0) {
      timeStr += `${minutes} 分 `;
    }
    if (seconds > 0 || (seconds === 0 && timeStr === "")) {
      timeStr += `${seconds} 秒`;
    }

    return timeStr;
  }
}