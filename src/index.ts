import type { PicGo } from 'picgo'

import type { ISftpLoaderUserConfig } from './config'
import { config, getPcigoConfig } from './config'
import env from './env'
import upload from './upload'

export default function (ctx: PicGo): any {
  const handle = async (ctx: PicGo): Promise<any> => {
    const userConfig: ISftpLoaderUserConfig = ctx.getConfig(
      `picBed.${env.PLUGINS_ID}`
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
              ? config.url.substr(0, config.url.length)
              : config.url
          }${path}`

          delete output[i].buffer

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

  const register = () => {
    ctx.helper.uploader.register(env.PLUGINS_ID, {
      handle,
      config,
      name: 'SFTP 上传'
    })
  }

  return {
    uploader: env.PLUGINS_ID,
    register
  }
}
