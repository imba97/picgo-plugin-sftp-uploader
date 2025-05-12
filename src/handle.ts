import type { IPicGo } from 'picgo'
import type { SFTPLoaderUserConfig } from './config'
import { getPcigoConfig } from './config'
import { PLUGINS_ID } from './constants'
import { upload } from './upload'

export async function handle(ctx: IPicGo): Promise<any> {
  const userConfig: SFTPLoaderUserConfig = ctx.getConfig(
    `picBed.${PLUGINS_ID}`
  )

  if (!userConfig) {
    throw new Error('Can\'t find uploader config')
  }

  // 获取配置
  const configItem = await getPcigoConfig(userConfig)
  const config = configItem[userConfig.site]

  const input = ctx.input
  const output = ctx.output

  // 循环所有图片信息 上传
  for (const i in input) {
    const localPath = input[i]

    // 上传
    await upload(ctx, output[i], localPath)
      .then((path) => {
        const imgUrl = `${
          /\/$/.test(config.url)
            ? config.url.slice(0, config.url.length)
            : config.url
        }${path}`

        output[i].url = imgUrl
        output[i].imgUrl = imgUrl
      })
      .catch((err) => {
        ctx.log.error('SFTP 发生错误，请检查用户名、私钥和密码是否正确')
        ctx.log.error(err)
        ctx.emit('notification', {
          title: 'SFTP 错误',
          body: '请检查用户名、私钥、密码、权限是否正确',
          text: ''
        })
      })
  }

  return ctx
}
