import plugin from "../../lib/plugins/plugin.js";
import moment from "moment"

export class joinTime extends plugin {
  constructor() {
    super({
      name: "进群时间",
      dsc: "查询用户进群时间和在群时长",
      event: "message.group",
      priority: 5000,
      rule: [{
        reg: "^#?(我|他|她)?(进|入)群(时长|时间|多久了)$",
        fnc: "joinTime",
      }]
    });
  }
  
  /** 从 OneBot v11 响应中提取实际数据（兼容包装/未包装两种格式） */
  extractData(raw) {
    if (!raw) return null;
    // OneBot v11 标准格式: { status, retcode, data: {...} }
    if (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)) {
      return raw.data;
    }
    // 已解包格式或数组
    return raw;
  }

  async joinTime(e) {
    try {
      let targetId = e.at || e.user_id;
      const targetStr = String(targetId);
      const isSelf = String(targetId) === String(e.bot?.uin || e.bot?.uin || "");

      let join_time = null;
      let nickname = "";
      let card = "";

      // === 策略1: pickMember (自身有效，缓存中取) ===
      try {
        const member = await e.group.pickMember(targetId);
        nickname = member.nickname || "";
        card = member.card || "";
        if (member.join_time && member.join_time !== 0) {
          join_time = member.join_time;
          console.log(`[进群时间] pickMember 直接获取到 join_time: ${join_time}`);
        }
      } catch (err) {
        console.log("[进群时间] pickMember 失败:", err.message);
      }

      // === 策略2: OneBot v11 get_group_member_info (no_cache=true) ===
      if (!join_time) {
        try {
          const raw = await e.bot.sendApi("get_group_member_info", {
            group_id: Number(e.group_id),
            user_id: Number(targetId),
            no_cache: true
          });
          console.log(`[进群时间] get_group_member_info 原始返回:`, JSON.stringify(raw));

          const data = this.extractData(raw) || raw;
          if (!nickname) nickname = data.nickname || "";
          if (!card) card = data.card || "";

          if (data.join_time && data.join_time !== 0) {
            join_time = data.join_time;
            console.log(`[进群时间] get_group_member_info 获取到 join_time: ${join_time}`);
          } else {
            console.log(`[进群时间] get_group_member_info 中 join_time 为空/0, 可用字段:`, Object.keys(data).join(','));
          }
        } catch (err) {
          console.log("[进群时间] get_group_member_info 调用失败:", err.message);
        }
      }

      // === 策略3: OneBot v11 get_group_member_list (全量拉取，包含join_time) ===
      if (!join_time) {
        try {
          const raw = await e.bot.sendApi("get_group_member_list", {
            group_id: Number(e.group_id),
            no_cache: true
          });
          console.log(`[进群时间] get_group_member_list 返回数量:`, Array.isArray(raw) ? raw.length : (raw.data?.length || 'unknown'));

          const list = this.extractData(raw) || raw;
          if (Array.isArray(list)) {
            for (const m of list) {
              if (String(m.user_id) === targetStr) {
                if (!nickname) nickname = m.nickname || "";
                if (!card) card = m.card || "";
                if (m.join_time && m.join_time !== 0) {
                  join_time = m.join_time;
                  console.log(`[进群时间] get_group_member_list 获取到 join_time: ${join_time}`);
                  break;
                }
              }
            }
            if (!join_time) {
              // 打印第一个成员的字段名用来调试
              console.log(`[进群时间] get_group_member_list[0] 所有字段:`, list[0] ? Object.keys(list[0]).join(',') : 'empty');
            }
          }
        } catch (err) {
          console.log("[进群时间] get_group_member_list 调用失败:", err.message);
        }
      }

      // === 策略4: 遍历 Yunzai 的 getMemberList ===
      if (!join_time) {
        try {
          const memberList = await e.group.getMemberList();
          for (const m of memberList) {
            if (String(m.user_id || m.qq) === targetStr) {
              if (!nickname) nickname = m.nickname || "";
              if (!card) card = m.card || "";
              if (m.join_time && m.join_time !== 0) {
                join_time = m.join_time;
                console.log(`[进群时间] getMemberList 获取到 join_time: ${join_time}`);
                break;
              }
            }
          }
        } catch (err) {
          console.log("[进群时间] getMemberList 失败:", err.message);
        }
      }

      // === 判断结果 ===
      const displayName = card || nickname || targetStr;

      if (!join_time) {
        e.reply(`@${displayName}\n无法获取该成员的进群时间\n（QQ协议限制：仅可查询自己的进群时间）`);
        return true;
      }

      // === 计算进群日期和时长 ===
      console.log(`[进群时间] 最终 join_time: ${join_time}, 类型: ${typeof join_time}`);

      let joinTimestamp = Number(join_time);
      if (isNaN(joinTimestamp) || joinTimestamp <= 0) {
        // 尝试作为字符串解析
        const parsed = Date.parse(String(join_time));
        joinTimestamp = isNaN(parsed) ? 0 : parsed;
      }

      if (!joinTimestamp || joinTimestamp <= 0) {
        e.reply(`@${displayName}\n进群时间数据异常 (值: ${join_time})`);
        return true;
      }

      // 判断秒/毫秒：10位=秒(>2001年)，13位=毫秒
      const digitLen = String(Math.floor(joinTimestamp)).length;
      if (digitLen <= 10) {
        joinTimestamp = joinTimestamp * 1000; // 秒 -> 毫秒
      }

      const joinDate = moment(joinTimestamp).format("YYYY-MM-DD HH:mm:ss");
      const elapsedSec = Math.round((Date.now() - joinTimestamp) / 1000);
      const d = moment.duration(elapsedSec, 'seconds');

      let parts = [];
      const years = Math.floor(d.asYears());
      const months = Math.floor((d.asYears() - years) * 12);
      const days = Math.floor(d.asDays() - years * 365 - months * 30);
      const hours = d.hours();
      const minutes = d.minutes();
      const seconds = d.seconds();

      if (years > 0) parts.push(`${years}年`);
      if (months > 0) parts.push(`${months}个月`);
      if (days > 0) parts.push(`${days}天`);
      if (hours > 0) parts.push(`${hours}时`);
      if (minutes > 0) parts.push(`${minutes}分`);
      if (seconds > 0) parts.push(`${seconds}秒`);
      if (parts.length === 0) parts.push("刚刚进群");

      e.reply(`@${displayName}\n进群日期：${joinDate}\n在群时长：${parts.join('')}`);

    } catch (err) {
      console.error("获取进群时间失败：", err);
      e.reply("查询失败，请稍后再试");
    }
    return true;
  }
}
