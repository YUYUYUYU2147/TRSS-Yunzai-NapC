export class zako extends plugin {
  constructor() {
    super({
      name: "变南梁",
      dsc: "变杂南梁",
      event: "message",
      priority: -114514,
      rule: [
        {
          reg: /^#?变杂鱼(.*)/m,
          fnc: "zako",
        },
        {
          reg: "^#?不变杂鱼$",
          fnc: "unZako",
        },
      ],
    });
  }

  async zako(e) {
    if (!(e.group.is_admin || e.group.is_owner)) {
      e.reply("没管理变什么杂鱼？", true);
      return;
    }
    
    let qq = e.at;
    if (!qq) {
      qq = e.user_id;
    } else {
      if (!e.isMaster && !e.member.is_admin && !e.member.is_owner) {
        qq = e.user_id; 
        const Member = e.group.pickMember(qq);
        const Memberinfo = Member.info || await Member.getInfo();
        const name = Memberinfo.card || Memberinfo.nickname;
        const zakoname = "小杂鱼『" + name + "』♡";
        await e.group.setCard(qq, zakoname);
        e.reply("你什么也不是，还是把你变杂鱼吧", true);
        return true;
      }
    }
    qq = Number(qq) || e.user_id;
    
    const Member = e.group.pickMember(qq);
    if (!Member) {
      e.reply("未找到指定的成员。", true);
      return;
    }
    
    const Memberinfo = Member.info || await Member.getInfo();
    const name = Memberinfo.card || Memberinfo.nickname;
    if (name.includes('杂鱼')) {
      e.reply("你已经是大杂鱼了，不能再大了哦~", true);
      return;
    }
  
    const zakoname = "小杂鱼『" + name + "』♡";
    await redis.set(`original_name:${qq}`, name, 'EX', 86400 * 10);
    await e.group.setCard(qq, zakoname);
    
    let message = "已将你变成小杂鱼~";
    if (qq !== e.user_id) {
      message = "已将TA变成小杂鱼~";
    }
    e.reply(message, true);
  }
  async unZako(e) {
    if (!(e.group.is_admin || e.group.is_owner)) {
      e.reply("没管理怎么变回原样？", true);
      return;
    }
    const originalName = await redis.get(`original_name:${e.user_id}`);
    if (!originalName) {
      e.reply("你还没有变成小杂鱼哦~", true);
      return;
    }

    await e.group.setCard(e.user_id, originalName);
    e.reply("已将你恢复原状~", true);
    await redis.del(`original_name:${e.user_id}`);
  }
}