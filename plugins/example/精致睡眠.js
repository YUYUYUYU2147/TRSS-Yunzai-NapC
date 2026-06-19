/**
 * 发送 精致睡眠 喜提8小时禁言
 */

var replayMsg = "该睡觉咯，祝你今晚好梦"; //可以自定义回复内容

var muteTime = 8 * 60 * 60; //禁言时间，单位秒

import plugin from "../../lib/plugins/plugin.js";
import { segment } from "oicq";

export class example extends plugin {
    constructor() {
        super({
            /** 功能名称 */
            name: "精致睡眠",
            /** 功能描述 */
            dsc: "简单开发示例",
            /** https://oicqjs.github.io/oicq/#events */
            event: "message",
            /** 优先级，数字越小等级越高 */
            priority: 5000,
            rule: [
                {
                    /** 命令正则匹配 */
                    reg: "^#?(精致睡眠|jjsm)",
                    /** 执行方法 */
                    fnc: "jjsm",
                },
            ],
        });
    }
    async jjsm(e) {
        if (!e.group.is_owner && !e.group.is_admin) {
            //机器人不是管理那没法禁言嘛~
            return false;
        }
        e.group.muteMember(e.user_id, muteTime);
        e.reply([segment.at(e.user_id), ` ${replayMsg}`]);
        return true;
    }
}
