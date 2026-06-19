/**
 * 留言插件
 * 样例：留言@真寻 明天晚上帮我打原
 * 当真寻在下次在群里发言时，机器人会回复：xxx给你留言：明天晚上帮我打原
 */

import plugin from "../../lib/plugins/plugin.js";
import fs from "fs";

//设置触发关键词
let regKeywords = `^#?(留言|ly|提醒|tx)`;
let regKeywordsFull = new RegExp(regKeywords);

//生成默认文件
if (!fs.existsSync("./data/liuyan")) {
  fs.mkdirSync("./data/liuyan");
}
if (!fs.existsSync("./data/liuyan/temp.json")) {
  fs.writeFileSync("./data/liuyan/temp.json", "[]"); // 使用 fs.writeFileSync 创建文件
}

// 读取文件
let temp = JSON.parse(fs.readFileSync("./data/liuyan/temp.json"));
let tempTable = [];
//将文件写入程序临时缓存
for (let i = 0; i < temp.length; i++) {
  tempTable.push({
    targetUserQQ: temp[i].targetUserQQ,
    senderQQ: temp[i].senderQQ,
    senderNickname: temp[i].senderNickname,
    result: temp[i].result,
  });
}
//全局监听消息
Bot.on("message", async (e) => {
  if (!e.group) {
    return;
  }
  //如果某条消息的来源QQ存在于缓存中，就发送缓存中的消息
  for (let i = tempTable.length - 1; i >= 0; i--) {
    if (tempTable[i].targetUserQQ == e.sender.user_id) {
      e.reply(tempTable[i].senderNickname + "(" + tempTable[i].senderQQ + ") 给你留言：");
      console.log(tempTable[i].result);
      e.reply(e.group.makeForwardMsg(JSON.parse(tempTable[i].result)));
      //回复完就从缓存里删除这条消息
      tempTable.splice(i, 1);
      //更新本地磁盘中的消息
      fs.writeFileSync("./data/liuyan/temp.json", JSON.stringify(tempTable));
    }
  }
});
export class example extends plugin {
  constructor() {
    super({
      name: "留言插件",
      dsc: "留言给群友",
      event: "message",
      priority: 5000,
      rule: [
        {
          reg: regKeywords,
          fnc: "liuyan",
        },
      ],
    });
  }
  async liuyan(e) {
    let thisMsg = e.message;
    let thisMsgSenderQQ = e.sender.user_id;
    let thisMsgSenderNickname = e.sender.nickname;
    let thisMsgWillSendToQQ = 12345;

    let thisMsgIsReply = false;
    if ("source" in e) {
      thisMsgIsReply = true;
    }

    //定义变量
    let willSendMessage = [];
    let haveFirstAt = false;
    let haveFirstKeyword = false;

    //如果此消息没有回复某条消息
    if (!thisMsgIsReply) {
      //遍历消息的每一条内容
      thisMsg.forEach((msg) => {
        //获取第一个at的qq号，肯定是目标QQ
        if (!haveFirstAt) {
          if (msg.type === "at") {
            thisMsgWillSendToQQ = msg.qq;
            haveFirstAt = true;
            return;
          }
        }
        //忽略第一个关键词
        if (msg.type === "text") {
          if (!haveFirstKeyword) {
            if (msg.text.match(regKeywordsFull)) {
              msg.text = msg.text.replace(regKeywordsFull, "");
              haveFirstKeyword = true;
            }
          }
          if (msg.text == "") {
            return;
          }
        }
        willSendMessage.push(msg);
      });
      if (!haveFirstAt) {
        e.reply("使用格式：留言@xxx 帮我清下体力");
        return;
      }

      //构造转发消息，参数user_id,message,nickname
      let fakeMsg = [];
      if (willSendMessage.length != 0) {
        fakeMsg.push({
          user_id: thisMsgSenderQQ,
          message: willSendMessage,
          nickname: thisMsgSenderNickname,
        });
      }

      if (fakeMsg.length == 0) {
        return;
      }

      //处理追加消息
      let obj = tempTable.find((item) => item.targetUserQQ == thisMsgWillSendToQQ && item.senderQQ == thisMsgSenderQQ);
      if (!obj) {
        tempTable.push({
          targetUserQQ: thisMsgWillSendToQQ,
          senderQQ: thisMsgSenderQQ,
          senderNickname: thisMsgSenderNickname,
          result: JSON.stringify(fakeMsg),
        });
        e.reply("新建留言成功!");
      } else {
        obj.result = JSON.parse(obj.result).concat(fakeMsg);
        obj.result = JSON.stringify(obj.result);
        e.reply("追加留言成功!");
      }
    }

    //如果此消息是回复某条消息
    if (thisMsgIsReply) {
      //得到消息seq，再根据seq得到历史消息内容
      let originSeq = e.source.seq;
      let originE = await e.group.getChatHistory(originSeq, 1);
      //返回是数组，所以需要取第一个
      originE = originE[0];
      let originMsg = originE.message;

      let originSenderQQ = originE.sender.user_id;
      let originSenderNickname = originE.sender.nickname;

      let fakeMsg = [];
      fakeMsg.push({
        user_id: originSenderQQ,
        message: originMsg,
        nickname: originSenderNickname,
      });

      let haveSecondAt = false;
      thisMsg.forEach((msg) => {
        if (msg.type === "at") {
          if (!haveFirstAt) {
            haveFirstAt = true;
            thisMsgWillSendToQQ = msg.qq;
            return;
          }
          if (!haveSecondAt) {
            thisMsgWillSendToQQ = msg.qq;
            haveSecondAt = true;
            return;
          }
        }
        if (msg.type === "text") {
          if (!haveFirstKeyword) {
            if (msg.text.match(regKeywordsFull)) {
              msg.text = msg.text.replace(regKeywordsFull, "");
              haveFirstKeyword = true;
            }
          }
          if (msg.text == "") {
            return;
          }
        }
        willSendMessage.push(msg);
      });
      if (!haveFirstAt) {
        e.reply("使用格式：留言@xxx 你好");
        return;
      }
      if (willSendMessage.length != 0) {
        fakeMsg.push({
          user_id: thisMsgSenderQQ,
          message: willSendMessage,
          nickname: thisMsgSenderNickname,
        });
      }

      if (fakeMsg.length == 0) {
        return;
      }

      let obj = tempTable.find((item) => item.targetUserQQ == thisMsgWillSendToQQ && item.senderQQ == thisMsgSenderQQ);
      if (!obj) {
        tempTable.push({
          targetUserQQ: thisMsgWillSendToQQ,
          senderQQ: thisMsgSenderQQ,
          senderNickname: thisMsgSenderNickname,
          result: JSON.stringify(fakeMsg),
        });
        e.reply("新建留言成功!");
      } else {
        obj.result = JSON.parse(obj.result).concat(fakeMsg);
        obj.result = JSON.stringify(obj.result);
        e.reply("追加留言成功!");
      }
    }
    fs.writeFileSync("./data/liuyan/temp.json", JSON.stringify(tempTable));
    return;
  }
}
