import plugin from "../../lib/plugins/plugin.js";
import cfg from "../../lib/config/config.js";

export class example extends plugin {
  constructor() {
    super({
      name: "ys禁言",
      dsc: "简单开发示例",
      event: "message",
      priority: 5000,
      rule: [
        {
          reg: "^(解除)?禁言",
          fnc: "mutePeople",
        },
      ],
    });
  }
  // 定义转换函数
  async parseMuteTime(text) {
    const regex = /禁言(\d+)(秒|分|小时|天)?(\d+)?(秒|分|)?/;
    const matches = text.match(regex);

    if (!matches) {
      return null;
    }

    const [, num1, unit1, num2, unit2] = matches;

    let seconds = parseInt(num1, 10);

    if (unit1 === "分" || unit2 === "分") {
      seconds *= 60;
    } else if (unit1 === "小时" || unit2 === "小时") {
      seconds *= 3600;
    } else if (unit1 === "天") {
      seconds *= 86400;
    }

    if (num2 && unit2 === "秒") {
      seconds += parseInt(num2, 10);
    }

    return seconds;
  }

  async mutePeople(e) {
    const textArray = e.message
      .filter((obj) => obj.type === "text") // 过滤出 type 为 'text' 的对象
      .map((obj) => obj.text); // 提取每个对象中的 text 属性

    const combinedText = textArray.join("");

    if (!e.member.is_owner || !e.member.is_admin) {
      return false;
    }
    //自己不是群主或者管理员没法禁言
    if (!e.group.is_owner && !e.group.is_admin) {
      return false;
    }
    //别禁言主人
    if (e.at == cfg.masterQQ) {
      e.reply("居然想禁言主人，岂有此理ヽ(｀⌒´メ)ノ");
      return true;
    }

    let msg = e.message.find((item) => item.type == "at");
    if (!msg) {
      e.reply("请输入 禁言@xxx");
      return false;
    }

    let atQQ = e.at;

    //别禁言自己
    if (atQQ == e.self_id) {
      e.reply(`我禁我自己是吧`);
      return false;
    }

    let theObjectOfAtQQ = e.group.pickMember(atQQ);

    if (theObjectOfAtQQ.is_owner) {
      e.reply(`群主你都敢禁言╭(°A°\`)╮`);
      return false;
    }

    if (theObjectOfAtQQ.is_admin) {
      e.reply(`管理员你都敢禁言╭(°A°\`)╮`);
      return false;
    }

    let muteTimeText = combinedText;
    let replyMsg = "禁言成功";
    //如果muteTimeText是"解除"开头，则设置mutetime为0
    if (muteTimeText.startsWith("解除")) {
      muteTimeText = "禁言0秒";
      replyMsg = "解除禁言成功";
    }
    muteTimeText = muteTimeText.replace(/\s/g, "");
    let muteTime = await this.parseMuteTime(muteTimeText);
    e.group.muteMember(atQQ, muteTime);
    e.reply(replyMsg);
  }
}
