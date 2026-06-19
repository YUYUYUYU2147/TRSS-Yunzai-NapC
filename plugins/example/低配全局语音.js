import { segment } from "oicq";
import fetch from "node-fetch";
import cfg from "../../lib/config/config.js";
import plugin from "../../lib/plugins/plugin.js";
import { createRequire, syncBuiltinESMExports } from "module";

const dir = "./data/ys_yuyin";
const jsonPath = "./data/ys_yuyin/json";
const soundPath = "./data/ys_yuyin/yuyin";
const require = createRequire(import.meta.url);
const fs = require("fs");
const path = require("path");

var keyword = "";

if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}

if (!fs.existsSync(jsonPath)) {
    fs.mkdirSync(jsonPath);
}

if (!fs.existsSync(soundPath)) {
    fs.mkdirSync(soundPath);
}

if (!fs.existsSync(jsonPath + "/data.json")) {
    fs.writeFileSync(jsonPath + "/data.json", "[]");
}

if (!fs.existsSync(dir + "/newConfig.json")) {
    fs.writeFileSync(dir + "/newConfig.json", "[]");
}

let newConfig = JSON.parse(fs.readFileSync(dir + "/newConfig.json"));

//读取开关配置
let isEnable = newConfig.isEnable || "enable";

//读取禁用群配置
let disableGroup = newConfig.disableGroup || [];
disableGroup = Object.values(disableGroup);

//读取json文件
var soundKeywords = [];
let data = fs.readFileSync(jsonPath + "/data.json");
let dataJson = JSON.parse(data);
//遍历json文件，将所有的关键词放入soundKeywords数组中
for (let i = 0; i < dataJson.length; i++) {
    soundKeywords.push(dataJson[i].keyword);
}

//监听关键词
Bot.on("message", async (e) => {
    if (isEnable == "enable") {
        if (e.group) {
            if (disableGroup.indexOf(e.group.group_id.toString()) != -1) {
                return false;
            }
        }
        if (e.message[0].type == "text") {
            let text = e.message[0].text;
            if (soundKeywords.indexOf(text) != -1) {
                //如果text在soundKeywords中，就发送语音
                let md5 = "";
                let fileExtensionName = "";
                for (let i = 0; i < dataJson.length; i++) {
                    if (dataJson[i].keyword == text) {
                        md5 = dataJson[i].md5;
                        fileExtensionName = dataJson[i].fileExtensionName;
                    }
                }
                e.reply(
                    segment.record(soundPath + "/" + md5 + fileExtensionName)
                );
            }
        }
    }
});

export class example extends plugin {
    constructor() {
        super({
            name: "低配全局语音",
            dsc: "简单开发示例",
            event: "message",
            priority: 5000,
            rule: [
                {
                    reg: "^#?(关闭|开启)语音$",
                    fnc: "switchONOFF",
                },
                {
                    reg: "^#?添加语音",
                    fnc: "add",
                },
                {
                    reg: "^#?语音列表",
                    fnc: "show",
                },
                {
                    reg: "^#?删除语音",
                    fnc: "del",
                },
                {
                    reg: "^#?(关闭|开启)本群语音$",
                    fnc: "groupSwitch",
                },
            ],
        });
    }
    async writeConfig() {
        //将newConfig对象写入文件
        fs.writeFileSync(
            dir + "/newConfig.json",
            JSON.stringify({
                isEnable: isEnable,
                disableGroup: disableGroup,
            })
        );
    }
    async groupSwitch(e) {
        if (!e.group) {
            return false;
        }
        if (e.user_id != cfg.masterQQ) {
            e.reply("只有主人才能使用此功能");
            return;
        }
        let msg = e.message[0];
        let text = msg.text;
        let groupID = e.group.group_id.toString();
        if (text.includes("开启")) {
            for (let index = 0; index < disableGroup.length; index++) {
                const element = disableGroup[index];
                if (element == groupID) {
                    disableGroup.splice(index, 1);
                }
            }
            //写入配置文件
            this.writeConfig();
            e.reply(`开启成功`);
        }
        if (text.includes("关闭")) {
            if (disableGroup.indexOf(groupID) != -1) {
                e.reply(`已经禁用了`);
                return false;
            }
            disableGroup.push(groupID);
            //写入配置文件
            this.writeConfig();
            e.reply(`关闭成功`);
        }
        return true;
    }

    async switchONOFF(e) {
        if (e.user_id != cfg.masterQQ) {
            e.reply("只有主人才能使用此功能");
            return;
        }
        let msg = e.message[0];
        let text = msg.text;
        if (text == "开启语音") {
            isEnable = "enable";
            //写入配置文件
            this.writeConfig();
            e.reply("开启成功");
        } else if (text == "关闭语音") {
            isEnable = "disable";
            //写入配置文件
            this.writeConfig();
            e.reply("关闭成功");
        }
        return;
    }
    async del(e) {
        if (e.user_id != cfg.masterQQ) {
            e.reply("只有主人才能使用此功能");
            return;
        }
        let msg = e.message[0];
        let text = msg.text;
        let deLkeyword = text.split("删除语音")[1];
        let data = fs.readFileSync(jsonPath + "/data.json");
        let dataJson = JSON.parse(data);
        for (let i = 0; i < dataJson.length; i++) {
            if (dataJson[i].keyword == deLkeyword) {
                dataJson.splice(i, 1);
            }
        }
        fs.writeFileSync(jsonPath + "/data.json", JSON.stringify(dataJson));

        //删除keyword里面的关键词
        for (let i = 0; i < soundKeywords.length; i++) {
            if (soundKeywords[i] == deLkeyword) {
                soundKeywords.splice(i, 1);
            }
        }
        e.reply("删除成功");
        return;
    }
    async show(e) {
        //输出soundKeywords数组,用逗号隔开
        e.reply("以下是语音关键词列表：" + soundKeywords.join("，"));

        return;
    }

    async add(e) {
        let msg = this.e.message[0];
        let text = msg.text;
        keyword = e.message[0].text.split("添加语音")[1];
        e.reply("请发送语音");
        this.setContext("add2");
        return;
    }

    async add2(e) {
        let Resmsg = this.e.message[0];
        this.finish("add2");
        if (Resmsg.type != "file") {
            e.reply("哼，不发文件就算了 o(￣ヘ￣o＃)");
            return false;
        }
        let md5 = "";
        let url = "";
        let fileExtensionName = "";
        if (Resmsg.type == "file" && "name" in Resmsg == true) {
            let name = Resmsg.name;
            //如果name不是以.mp3|.amr结尾的，就不接受
            if (name.indexOf(".mp3") == -1 && name.indexOf(".amr") == -1) {
                e.reply("不行，我不接受这个文件！");
                return false;
            }
            let fid = Resmsg.fid;
            let oriUrl = await e.group.fs.download(fid);
            url = oriUrl.url;
            md5 = oriUrl.md5;
            fileExtensionName = name.match(/\..+$/)[0];
        }
        //将keyword md5存入json文件
        let soundInfo = {
            keyword: keyword,
            md5: md5,
            fileExtensionName: fileExtensionName,
        };
        //如果临时关键词中不存在此关键词，就追加到json文件中
        if (soundKeywords.indexOf(keyword) == -1) {
            dataJson.push(soundInfo);
            soundKeywords.push(keyword);
            fs.writeFileSync(jsonPath + "/data.json", JSON.stringify(dataJson));
            let record = await fetch(url);
            let SoundStream = fs.createWriteStream(
                soundPath + "/" + md5 + fileExtensionName
            );
            record.body.pipe(SoundStream);
            e.reply("添加成功");
        } else {
            //遍历json文件，如果存在此关键词，就修改md5
            for (let i = 0; i < dataJson.length; i++) {
                if (dataJson[i].keyword == keyword) {
                    dataJson[i].md5 = md5;
                }
            }
            fs.writeFileSync(jsonPath + "/data.json", JSON.stringify(dataJson));
            let record = await fetch(url);
            let SoundStream = fs.createWriteStream(
                soundPath + "/" + md5 + fileExtensionName
            );
            record.body.pipe(SoundStream);
            e.reply("关键词已存在，修改语音成功");
        }
        return;
    }
}
