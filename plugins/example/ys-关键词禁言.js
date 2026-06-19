/**
 * 关键词禁言
 */

var keywords = "关键词1|关键词2|关键词3"; // “|”是或者的意思

var muteTime = 1 * 1 * 60; //禁言时间，单位秒

import plugin from "../../lib/plugins/plugin.js";

export class example extends plugin {
    constructor() {
        super({
            name: "ys-关键词禁言",
            dsc: "ys-关键词禁言",
            event: "message",
            priority: 5,
            rule: [
                {
                    reg: keywords,
                    fnc: "keywordsMute",
                },
            ],
        });
    }
    async keywordsMute(e) {
        await e.group.muteMember(e.sender.user_id, muteTime);
        return true;
    }
}
