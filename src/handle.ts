import type { IPicGo } from 'picgo'
import type { SFTPLoaderUserConfig } from './config'
import Client from './client'
import { getPcigoConfig } from './config'
import { PLUGINS_ID } from './constants'
import { useUploader } from './upload'

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

  // 初始化 SFTP 客户端
  const client = Client.instance
  await client.init(config)
  const { upload, uploadBuffer } = useUploader(ctx, client, config)

  // 循环所有图片信息 上传
  for (let i = 0; i < input.length; i++) {
    const localPath = input[i]
    const buffer = output[i].buffer

    const uploadPromise = buffer
      ? uploadBuffer(buffer, i, output)
      : upload(localPath, i, output)

    await uploadPromise
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

  // 关闭连接
  client.close()

  return ctx
}
