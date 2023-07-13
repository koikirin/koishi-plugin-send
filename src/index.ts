import { Context, Schema, Service, Fragment, SendOptions, Bot } from 'koishi'

declare module 'koishi' {
  interface Context {
    sendPrivateMessage(platform: string, channelId: string, content: Fragment, options?: SendOptions): Promise<string[]>
    sendMessage(platform: string, channelId: string, content: Fragment, guildId?: string, options?: SendOptions): Promise<string[]>
  }
}

class Send extends Service {
  static readonly methods = ['sendPrivateMessage', 'sendMessage']
  static readonly using = ['database']

  constructor(ctx: Context, private config: Send.Config) {
    super(ctx, '__send__', true)
  }

  async sendPrivateMessage(platform: string, channelId: string, content: Fragment, options?: SendOptions) {
    let bot: Bot
    if (platform.includes(':'))
      bot = this.ctx.bots[platform]
    else {
      bot = this.ctx.bots.find(b => b.platform === platform)
    }
    if (bot) return await bot.sendPrivateMessage(channelId, content, options)
  }

  async sendMessage(platform: string, channelId: string, content: Fragment, guildId?: string, options?: SendOptions) {
    let bot: Bot
    if (platform.includes(':'))
      bot = this.ctx.bots[platform]
    else {
      const { assignee } = (await this.ctx.database.getChannel(platform, channelId, ['assignee'])) || {}
      bot = this.ctx.bots[`${platform}:${assignee}`]
      bot ||= this.ctx.bots.find(b => b.platform === platform)
    }
    if (bot) return await bot.sendMessage(channelId, content, guildId, options)
  }

}

namespace Send {
  export interface Config {}

  export const Config: Schema<Config> = Schema.object({})

}

Context.service('__send__', Send)

export default Send