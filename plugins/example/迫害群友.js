import plugin from '../../lib/plugins/plugin.js'
import fetch from 'node-fetch'
import { segment } from "oicq";
import lodash from "lodash";

let list = [1258716469]//禁止迫害的QQ

export class slander extends plugin {
    constructor() {
        super({
            name: '迫害群友',
            dsc: '快去迫害你的群友吧',
            /** https://oicqjs.github.io/oicq/#events */
            event: 'message',
            priority: 1000,
            rule: [
                {
                    reg: '^#迫害(.*)$',
                    fnc: 'slander'
                }
            ]
        })
    }

    async slander(e) {
        console.log(e)
        if (!e.isGroup) {//不是群聊
            e.reply("就咱俩，你想怎么迫害？")
            return true;
        }
        if(!e.at&&e.msg){
            e.reply("请at你要迫害的人哦")
            return true;
        }

        if (e.atme && !e.at && !e.atall) return false;

        let targetQQ = e.at//获取迫害对象QQ
        if(list.indexOf(targetQQ) > -1) {
            e.reply("这位大人禁止被迫害");
            return true;
        }

        let targetName = e.message[1].text.replace("@", "");//获得迫害对象名字
        let Random = Math.floor(Math.random() * 7);//获取随机数
        let msg
        //选择不同的迫害话语(因为已经return了所以不用break)
        switch (Random) {
            case 0:
                let url = `https://zy.xywlapi.cc/qqcx?qq=${targetQQ}` //接口调用
                let response = await fetch(url); //调用接口获取数据
                let res = await response.text(); //结果json字符串转对象
                if (res.status == 200) {
                    let phone = res.phone.substring(res.phone.length - 4);
                    msg = [
                        segment.at(targetQQ),
                        `尾号${phone}的客户您好！我这边是菜鸟驿站的，您宝[私密发货]购买的#疯狂榨J绝赞嚣张款雌性小m魔 已经到了，请凭借取件码745015在今天下午21:00点前取件。您预留的电话打不通，短信也不回，所以在群里直接跟您说了，希望您不要介意。`
                    ]
                } else {
                    msg = [
                        segment.at(targetQQ),
                        "尊敬的客户您好！我这边是菜鸟驿站的，您宝[私密发货]购买的#疯狂榨J绝赞嚣张款雌性小m魔 已经到了，请凭借取件码745015在今天下午21:00点前取件。您预留的电话打不通，短信也不回，所以在群里直接跟您说了，希望您不要介意。"
                    ]
                }
                e.reply(msg)
                return true;
            case 1:
                msg = [
                    segment.at(targetQQ),
                    `亲爱的${targetName}先生，我们注意到您已经近1年没有登入PornHub了，请允许我们问候一声您是否一切如常。从您上次访问我们网站以后，我们已经更新了很多您喜欢的男同性恋电影。\n希望能很快再见到你。\n-----PornHub管理员`
                ]
                e.reply(msg)
                return true;
            case 2:
                msg = [
                    segment.at(targetQQ),
                    `亲爱的${targetName}先生，你好，终于联系到您了，我是淘宝客服，给你打电话打不通，whatsapp也不回，看见你在这里只好给你留言了。\n你寄回的充气娃娃我们已经帮您修好了，马上给您寄回去，但请你别这么残暴的对她，她毕竟只是个娃娃，下次您温柔点毕竟不是钢铁制成的，寄回来的时候在场的工作人员看了都哭了！\n其实我看着也想哭，那玩意惨不忍睹啊，你说你前面也就算了，后面你都不放过，毕竟有些人有那些特殊的嗜好，我也不说了，嘴巴都变形了，好吧我承认嘴巴也是正常的，关键是鼻孔，耳孔你是怎么进去的？我就纳闷了。还有最后一个就是尼玛的肚脐眼。\n草，你也是特么人才，最后还给特么差评，这事我已经报警了，你等着吧，还有心情在这玩游戏。`
                ]
                e.reply(msg)
                return true;
            case 3:
                msg = [
                    segment.at(targetQQ),
                    `亲爱的${targetName}先生，你好，终于联系到您了，你上次託我幫你問的事情，我已經問過了，不能勃起可能是因為手淫過頻導致的，手淫過頻容易導致前列腺發炎，可能會引起不孕不育，嚴重者甚至會導致陽痿，打你手機沒人接，只能在這裡給你留言了。`
                ]
                e.reply(msg)
                return true;
            case 4:
                msg = [
                    segment.at(targetQQ),
                    `竟然是${targetName}先生!!!他真的很强，在各大服务器中穿梭，关于他的信息人们知道的很少，只知道他的枪，很快。\n曾经有人和${targetName}打了一把竞技，只用了5分钟就赢下了比赛。\n自此，人们知道了，除了枪快，他的意识也是无敌。\n还有一次在KZ服，最高难度的图，人们看到了一个新的记录，BOT的名字赫然写着${targetName}，完成时间为32秒。\n关于他的传说太多太多。\n无数人都在感叹，为什么会有这样一个完美的存在。\n直到，上周我带他去大保健。\n我刚脱下衣服准备办事，他就来敲我的房门。\n“你结束了？”\n他只是点了点头，什么也没说。\n我才发现，老天还是公平的。`
                ]
                e.reply(msg)
                return true;
            case 5:
                msg = [
                    segment.at(targetQQ),
                    `${targetName},亲，很抱歉打扰您。在这回复您，我们实属无奈之举。您的订单号:E6592322425155您在本店限时抢购的A36e型号的增强版女用*蛋红版和开*蕾丝情趣内衣给了我们差评。严重影响了小店的销量。希望您能在百忙之中修改为好评。谢谢。您的电话打不通，旺旺也没回话，我们这也是无奈之举，望您谅解！`
                ]
                e.reply(msg)
                return true;
            case 6:
                msg = [
                    segment.at(targetQQ),
                    `${targetName},您好！亲爱的会员，\n我们已经注意到您已1周没有登入哔哩哔哩，\n请容许我们询问一声您的生活无恙？从您加入大会员至此已满五年，我们已经帮你收集且分类您最喜爱的视频，发现您看男性互相口交视频标签次数非常频繁！于是我们已经优先把最新男同志视频额外发送到您的本月赠送清单里，希望您会喜欢。\nBy--哔哩哔哩管理员`
                ]
                e.reply(msg)
                return true;
            default:
                return false;
        }
    }
}