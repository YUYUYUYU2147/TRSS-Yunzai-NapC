import moment from "moment";
import fetch from "node-fetch";
import schedule from "node-schedule";

/** 需要续火的群 */
const GROUP_LIST = [1017577979]

/** 需要续火的好友 */
const BUDDY_LIST = [];

/** 续火开始提示群聊 */
const GROUP_ID = 

async function SLEEP(ms) { return new Promise((resolve) => setTimeout(resolve, ms)) }
async function SEND(TEXT) { Bot.pickGroup(GROUP_ID).sendMsg(TEXT); logger.mark(TEXT) }

/** 秒，分钟，时，日，月，星期 */
schedule.scheduleJob('0 0 0 * * *', async () => { // 每日中午12点0分0秒执行
    SEND("开始执行[群&好友续火]")
    const DATE_TIME_STRING = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");

    const COPYWRITING = (await (await fetch('https://oiapi.net/API/Sentences')).json())['message']
    const MSG = [COPYWRITING]
    SEND(`续火文案：${COPYWRITING}`)

    for (var i = 0; i < BUDDY_LIST.length; i++) {
        let key = BUDDY_LIST[i];
        logger.mark(`正在发送消息到好友: ${key}`);
        try {
            Bot.pickUser(key * 1).sendMsg(MSG);
        } catch (error) {
            logger.error(`发送消息到好友 ${key} 失败: ${error}`);
            continue;
        }
        await SLEEP(50000);
    }

    for (var i = 0; i < GROUP_LIST.length; i++) {
        let key = GROUP_LIST[i];
        logger.mark(`正在发送消息到群组: ${key}`);
        try {
            Bot.pickGroup(key * 1).sendMsg(MSG);
        } catch (error) {
            logger.error(`发送消息到群组 ${key} 失败: ${error}`);
            continue;
        }
        await SLEEP(50000);
    }
    const EXECUTIONTIME = moment.utc(moment((moment(Date.now()).format("YYYY-MM-DD HH:mm:ss")), "YYYY-MM-DD HH:mm:ss").diff(moment(DATE_TIME_STRING, "YYYY-MM-DD HH:mm:ss"))).format("HH:mm:ss");
    SEND(`[群&好友续火]执行结束\n耗时：${EXECUTIONTIME}\n群组数量：[${GROUP_LIST.length}] 好友数量：[${BUDDY_LIST.length}]`)

});
