//作者  860563585
//原作者  https://gitee.com/HanaHimeUnica
//该版本为二改，修改者@玖
// 感谢 https://grok.com/ 的帮助
/*
*    多作者、多图片、自定义图片源
*/

import plugin from '../../lib/plugins/plugin.js'
import common from "../../lib/common/common.js"
import { exec } from 'child_process'

export class srexchange extends plugin {
    constructor() {
        super({
            name: '米家四游资源预估(取图版)',
            dsc: '预估',
            event: 'message',
            priority: -Infinity,
            rule: [
                {
                    reg: '^#?((原神|原石|gs)|(星铁|星琼|sr)|(崩坏三|崩三|水晶|bbb|bh3|！)|(绝区零|绝区|菲林|邦布券|邦布|zzz)|(超炫空间|深渊)|(强袭|强袭战)|(战双|ww))?(前瞻信息|速报|预估|盘点)$',
                    fnc: "mysEstimate"
                },
                {
                    reg: '^#?预估js更新$',
                    fnc: 'handleUpdatejs',
                    permission: 'master'
                }
            ]
        })
    }

    async mysEstimate(e) {
        let api = "https://bbs-api.miyoushe.com/painter/api/user_instant/search/list?keyword="
        let size = "20" // 帖子条数
        let sort_type = "2" // 排序方式
        let args = []
        let maxImages = 10 // 每个帖子最多获取的图片数量
        let Customimages = [] // 自定义图片源

        /* 
                结构 ['帖子标题关键字段', 作者uid, [图片索引数组],'作者名'] 
                ['帖子标题关键字段', 作者uid, [0, 1, 2],'作者名'] 表示取第1、2、3张图片
        */

        // https://bbs-api.miyoushe.com/painter/api/user_instant/search/list?keyword=关键字&uid=作者uid&size=20&offset=0&sort_type=2

        // 动态提示信息
        let gameName = ""
        if (/原神|原石|gs/.test(this.e.msg)) {
            gameName = "原神"
            this.reply(`原石统计获取中，请稍后...`)

            // 自定义图片源：[图片链接, 作者名]
            Customimages = ['https://gitee.com/mingdiandianzhu/miaoresources/raw/master/predict/gs.jpg', '图片里面有作者名']

            args = [
                ['原石资源统计', 285802042, [1], 'HoYo青枫'], /* HoYo青枫 https://www.miyoushe.com/gs/accountCenter/followList?id=285802042       https://bbs-api.miyoushe.com/painter/api/user_instant/search/list?keyword=原石资源统计&uid=285802042&size=20&offset=0&sort_type=2 */
            ]
        }
        if (/星铁|星琼|sr/.test(this.e.msg)) {
            gameName = "崩坏：星穹铁道"
            this.reply(`星琼统计获取中，请稍后...`)

            // 自定义图片源：[图片链接, 作者名]
            Customimages = ['https://gitee.com/mingdiandianzhu/miaoresources/raw/master/predict/sr.jpg', '图片里面有作者名']

            args = [
                ['星琼统计汇总', 137101761, [3], '祈鸢ya'], /* 祈鸢ya https://www.miyoushe.com/sr/accountCenter/followList?id=137101761       https://bbs-api.miyoushe.com/painter/api/user_instant/search/list?keyword=星琼统计汇总&uid=137101761&size=20&offset=0&sort_type=2 */
                ['星琼资源统计', 285802042, [1], 'HoYo青枫'], /* HoYo青枫 https://www.miyoushe.com/sr/accountCenter/followList?id=285802042       https://bbs-api.miyoushe.com/painter/api/user_instant/search/list?keyword=星琼资源统计&uid=285802042&size=20&offset=0&sort_type=2 */
               
            ]
        }
        if (/绝区零|绝区|菲林|邦布券|邦布|zzz/.test(this.e.msg)) {
            gameName = "绝区零"
            this.reply(`菲林统计获取中，请稍后...`)

            // 自定义图片源：[图片链接, 作者名]
            //Customimages = ['', '']


            args = [
                ['绝区零前瞻', 73603011, [0,1,2,3,4,5], '小橙子阿'], /* 祈鸢ya https://www.miyoushe.com/zzz/accountCenter/followList?id=137101761       https://bbs-api.miyoushe.com/painter/api/user_instant/search/list?keyword=菲林统计&uid=137101761&size=20&offset=0&sort_type=2 */
                ['菲林资源统计', 285802042, [0], 'HoYo青枫'], /* HoYo青枫 https://www.miyoushe.com/zzz/accountCenter/followList?id=285802042       https://bbs-api.miyoushe.com/painter/api/user_instant/search/list?keyword=菲林资源统计&uid=285802042&size=20&offset=0&sort_type=2 */
               
            ]
        }
        if (/崩坏三|崩三|水晶|bbb|bh3|！|前瞻信息|前瞻/.test(this.e.msg)) {
            gameName = "崩坏三"
            this.reply(`水晶统计获取中，请稍后...`)

            // 自定义图片源：[图片链接, 作者名]

            

            args = [
                ['水晶统计', 80216695, [0, 1], '五香麻辣小兔头'], /* 五香麻辣小兔头 https://www.miyoushe.com/bh3/accountCenter/followList?id=80216695       https://bbs-api.miyoushe.com/painter/api/user_instant/search/list?keyword=水晶统计&uid=80216695&size=20&offset=0&sort_type=2 */
                 ]
        }
        
        if (/超炫空间|深渊/.test(this.e.msg)) {
            gameName = "超炫空间"
            this.reply(`深渊速报获取中，请稍后...`)

            // 自定义图片源：[图片链接, 作者名]
             //Customimages = ['', '']
                
            
                
             args = [['寂灭', 11956740, [0, 1,3,4,5,6,7,8,9,10,11,12,13,14,15], '残月'],
             ['红莲', 11956740, [0, 1,3,4,5,6,7,8,9,10,11,12,13,14,15], '残月'],
                ['红莲', 15491760, [0, 1,3,4,5,6,7,8,9,10,11,12,13,14,15], '墨之羽'], /* 五香麻辣小兔头 https://www.miyoushe.com/bh3/accountCenter/followList?id=30034179       https://bbs-api.miyoushe.com/painter/api/user_instant/search/list?keyword=深渊日记&uid=322418996&size=50&offset=0&sort_type=2 */
                ['红莲', 30269990, [0, 1,3,4,5,6,7,8,9,10,11,12,13,14,15], '朔守'],    /* 曲终丿人散     https://www.miyoushe.com/bh3/accountCenter/followList?id=30034179       https://bbs-api.miyoushe.com/painter/api/user_instant/search/list?keyword=ios红莲&uid=30034179&size=50&offset=0&sort_type=2 */
            ]
       
}

if (/强袭|强袭战/.test(this.e.msg)) {
            gameName = "强袭战"
            this.reply(`强袭速报获取中，请稍后...`)

            // 自定义图片源：[图片链接, 作者名]
             //Customimages = ['', '']
                
            
                
             args = [['强袭战', 4068738, [0, 1,3,4,5], '洗礼酱'],   
            ]
       
        }
        if (/战双|ww/.test(this.e.msg)) {
            gameName = "战双"
            this.reply(`黑卡预估获取中，请稍后...`)

            // 自定义图片源：[图片链接, 作者名]
           Customimages =  ['https://prod-alicdn-community.kurobbs.com/forum/2d8ba2d58fff418f886ef48cdc0204d020250523.jpeg', '伊甸作战室']
         
       
              args = [
                ['深渊日记', 32241899, [0, 1], '五香麻辣小兔头'], /* 五香麻辣小兔头 https://www.miyoushe.com/bh3/accountCenter/followList?id=80216695       https://bbs-api.miyoushe.com/painter/api/user_instant/search/list?keyword=水晶统计&uid=80216695&size=20&offset=0&sort_type=2 */
                 ]
        }
        // 默认走原神
        if (!gameName) {
            gameName = "原神"
            this.reply(`原石统计获取中，请稍后...`)
            Customimages = ['https://gitee.com/mingdiandianzhu/miaoresources/raw/master/predict/gs.jpg', '图片里面有作者名']
            args = [
                ['原石资源统计', 285802042, [1], 'HoYo青枫'],
            ]
        }
        let msg = []

        // 处理单独图片源
        if (Customimages && Customimages[0]) {
            try {
                // 确保图片链接有效且不为空
                msg.push([`作者：${Customimages[1]}`, segment.image(Customimages[0])])
            } catch (error) {
                console.error(`Failed to fetch extra Genshin image: ${Customimages[0]}`, error)
                // 如果图片请求失败，跳过不影响后续逻辑
            }
        }

        for (let i = 0; i < args.length; i++) {
            let res = await (await fetch(`${api}${encodeURI(args[i][0])}&uid=${encodeURI(args[i][1])}&size=${size}&offset=0&sort_type=${sort_type}`)).json()
            let post = res.data.list[0]?.post?.post
            if (!post || !post.images) continue

            let images = post.images
            let imageIndexes = args[i][2] // 获取图片索引数组
            let authorName = args[i][3] // 获取作者名
            let imageSegments = []

            // 收集该帖子的所有指定图片
            for (let idx of imageIndexes) {
                if (images[idx]) {
                    imageSegments.push(segment.image(images[idx]))
                }
            }

            // 如果有图片，则将【作者名】 标题和所有图片作为一个消息项
            if (imageSegments.length > 0) {
                msg.push([`作者：${authorName}\n${post.subject}`, ...imageSegments])
            }
        }

        if (msg.length > 0) {
            await this.reply(common.makeForwardMsg(e, msg, `${gameName}资源统计来啦~ \n如果出现图片错误，请忽略`))
        } else {
            await this.reply(`未找到${gameName}相关资源统计图片，请稍后再试！`)
        }
        return true
    }


    executeCommand(command) {
        return new Promise((resolve, reject) => {
          exec(command, (error, stdout, stderr) => {
            if (error) {
              reject(new Error(stderr || error.message));
            } else {
              resolve(stdout);
            }
          });
        });
      }

    async handleUpdatejs(e) {
        await e.reply('开始更新预估js，本地修改的内容将重置')
        const command = 'curl -o "./plugins/example/原石星琼邦布水晶预估（取图版）.js" "https://gitee.com/mingdiandianzhu/data/raw/master/mhyfourpredict.js"'
        await this.executeCommand(command);
        await e.reply('预估js更新成功，可能需要重启bot才能生效')
    }
}