import { Context, Schema, Service, Fragment, SendOptions, Bot } from 'koishi'

declare module 'koishi' {
  interface Context {
    sendPrivateMessage(channel: string | Send.Channel, content: Fragment, options?: SendOptions): Promise<string[]>
    sendMessage(channel: string | Send.Channel, content: Fragment, guildId?: string, options?: SendOptions): Promise<string[]>
  }
}

function parsePlatform(channel: string | Send.Channel) {
  let platform: string, channelId: string
  if (typeof channel === 'string') {
    const index = channel.indexOf(':', channel.startsWith('sandbox:') ? 8 : 0)
    platform = channel.slice(0, index)
    channelId = channel.slice(index + 1)
  } else {
    const {} = { platform, channelId } = channel
  }
  return [platform, channelId]
}

class Send extends Service {
  static readonly methods = ['sendPrivateMessage', 'sendMessage']
  static readonly using = ['database']

  constructor(ctx: Context, private config: Send.Config) {
    super(ctx, '__send__', true)
  }

  async sendPrivateMessage(channel: string | Send.Channel, content: Fragment, options?: SendOptions) {
    let bot: Bot
    const [platform, channelId] = parsePlatform(channel)
    if (platform.includes(':'))
      bot = this.ctx.bots[platform]
    if (!bot) {
      bot = this.ctx.bots.find(b => b.platform === platform)
    }
    if (bot) return await bot.sendPrivateMessage(channelId, content, options)
  }

  async sendMessage(channel: string | Send.Channel, content: Fragment, guildId?: string, options?: SendOptions) {
    let bot: Bot
    const [platform, channelId] = parsePlatform(channel)
    if (platform.includes(':'))
      bot = this.ctx.bots[platform]
    if (!bot) {
      const { assignee } = (await this.ctx.database.getChannel(platform, channelId, ['assignee'])) || {}
      bot ||= this.ctx.bots[`${platform}:${assignee}`]
      bot ||= this.ctx.bots.find(b => b.platform === platform)
    }
    if (bot) return await bot.sendMessage(channelId, content, guildId, options)
  }

}

namespace Send {
  export interface Config {}

  export const Config: Schema<Config> = Schema.object({})

  export interface Channel {
    platform: string
    channelId: string
  }
}

Context.service('__send__', Send)

export default Send