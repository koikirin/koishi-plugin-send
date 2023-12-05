import { Bot, Context, Fragment, Schema, Universal } from 'koishi'

declare module 'koishi' {
  interface Context {
    sendPrivateMessage(channel: string | Send.Channel, content: Fragment, options?: Universal.SendOptions): Promise<string[]>
    sendMessage(channel: string | Send.Channel, content: Fragment, guildId?: string, options?: Universal.SendOptions): Promise<string[]>
  }

  namespace Universal {
      interface SendOptions {
          source?: string
      }
  }

  interface Events {
    'send/sendPrivateMessage'(
      caller: Context,
      candidate: Bot,
      channel: Send.Channel,
      content: Fragment,
      options?: Universal.SendOptions
    ): Promise<Bot>

    'send/sendMessage'(
      caller: Context,
      candidate: Bot,
      channel: Send.Channel,
      content: Fragment,
      guildId?: string,
      options?: Universal.SendOptions
    ): Promise<Bot>
  }
}

function parsePlatform(channel: string | Send.Channel) {
  let platform: string, channelId: string
  if (typeof channel === 'string') {
    const index = channel.indexOf(':', channel.startsWith('sandbox:') ? 8 : 0)
    platform = channel.slice(0, index)
    channelId = channel.slice(index + 1)
  } else {
    // eslint-disable-next-line no-empty-pattern
    const {} = { platform, channelId } = channel
  }
  return [platform, channelId]
}

class Send {
  static filter = false
  static inject = ['database']

  constructor(ctx: Context) {
    ctx.provide('sendPrivateMessage')
    ctx.provide('sendMessage')

    ctx.sendPrivateMessage = sendPrivateMessage
    ctx.sendMessage = sendMessage
  }
}

async function sendPrivateMessage(this: Context, channel: string | Send.Channel, content: Fragment, options: Universal.SendOptions = {}) {
  let bot: Bot
  const [platform, channelId] = parsePlatform(channel)
  if (platform.includes(':')) { bot = this.bots[platform] }
  if (!bot) {
    bot = this.bots.find(b => b.platform === platform)
  }
  bot = await this.serial('send/sendPrivateMessage', this, bot as any, { platform, channelId }, content, options)
  if (bot) return await bot.sendPrivateMessage(channelId, content, '', options)
}

async function sendMessage(this: Context, channel: string | Send.Channel, content: Fragment, guildId?: string, options: Universal.SendOptions = {}) {
  let bot: Bot
  const [platform, channelId] = parsePlatform(channel)
  if (platform.includes(':')) { bot = this.bots[platform] }
  if (!bot) {
    const { assignee } = (await this.database.getChannel(platform, channelId, ['assignee'])) || {}
    bot ||= this.bots[`${platform}:${assignee}`]
    bot ||= this.bots.find(b => b.platform === platform)
  }
  bot = await this.serial('send/sendMessage', this, bot as any, { platform, channelId }, content, guildId, options)
  if (bot) return await bot.sendMessage(channelId, content, guildId, options)
}

namespace Send {
  export interface Config {}

  export const Config: Schema<Config> = Schema.object({})

  export interface Channel {
    platform: string
    channelId: string
  }
}

export default Send
