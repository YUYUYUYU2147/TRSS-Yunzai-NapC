/**
 * 舔狗日记插件
 * 样例：#舔狗日记 或者 #tg
 * 返回样例：你跟他打完游戏了吧，也不知道他有没有在游戏里凶你。如果你不高兴了一定要告诉我哦，我会一直陪伴你的。今天厂长看我表现好，奖了我一百块钱奖金，我现在就给你打过去，给你买小乔的青蛇皮肤，别人有的你也会有。
 */

import fetch from "node-fetch";
import plugin from "../../lib/plugins/plugin.js";

export class example extends plugin {
    constructor() {
        super({
            name: "舔狗日记",
            dsc: "简单开发示例",
            event: "message",
            priority: -5000,
            rule: [
                {
                    reg: "^#(舔狗日记|tg)",
                    fnc: "tg",
                },
            ],
        });
    }
    async tg(e) {
        const response = await fetch("https://v.api.aa1.cn/api/tiangou/");
        if (!response.ok) {
            e.reply("舔狗API故障，请反馈给作者");
            return;
        }
        const text = await response.text();
        const res = text.replace(/<[^>]*>/g, "").trim();
        e.reply(res);
    }
}
