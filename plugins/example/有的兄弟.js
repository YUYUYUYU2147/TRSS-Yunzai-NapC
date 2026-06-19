export class Bro extends plugin {
  constructor() {
    super({
      name: "有的兄弟",
      dsc: "像这样的兄弟还有九个",
      event: "message",
      priority: 5001,
      rule: [
        {
          reg: "((.*)?有(.*)?(吗|嘛)(.*)?|(.*)?有没(.*)?)",
          fnc: "bro"
        },
        {
          reg: "(.*)?能(.*)?(吗|嘛)(.*)?",
          fnc: "canDo"
        },
        {
          reg: "(.*)?会(.*)?(吗|嘛)(.*)?",
          fnc: "willDo"
        },
        {
          reg: "^？$",
          fnc: "wenhao"
        }
      ]
    })
    this.switch = true;
  }

  async bro() {
    if (!this.switch) return false
    await this.reply('有的兄弟，有的');
    return false;
  }

  async canDo() {
    if (!this.switch) return false
  
    const match = this.e.msg.match(/能([\u4e00-\u9fa5])(吗|嘛)(.*)?/);

    if (match && match[1]) {
      const word = match[1]; 
      await this.reply(`包能${word}的`);
    } else {
      await this.reply('包的');
    }
    return false;
  }

  async willDo() {
    if (!this.switch) return false
  
    const match = this.e.msg.match(/会([\u4e00-\u9fa5])(吗|嘛)(.*)?/);

    if (match && match[1]) {
      const word = match[1]; 
      await this.reply(`包会${word}的`);
    } else {
      await this.reply('包会的');
    }
    return false;
  }

  async wenhao() {
    if (!this.switch) return false
    await this.reply('你是有什么心事嘛？');
    return false;
  }
}
