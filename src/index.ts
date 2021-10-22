import picgo from 'picgo'

import upload from './upload'
import { config, getPcigoConfig, IScpLoaderUserConfig } from './config'

export = (ctx: picgo) => {
  const handle = async (ctx: picgo) => {
    let userConfig: IScpLoaderUserConfig = ctx.getConfig(
      'picBed.ssh-scp-uploader'
    )

    if (!userConfig) {
      throw new Error("Can't find uploader config")
    }

    // 获取配置
    const configItem = await getPcigoConfig(userConfig, ctx)
    const config = configItem[userConfig.site]

    const input = ctx.input
    const output = ctx.output

    // 循环所有图片信息 上传
    for (let i in input) {
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
          ctx.log.error('SSH SCP 发生错误，请检查用户名、私钥和密码是否正确')
          ctx.log.error(err)
          ctx.emit('notification', {
            title: 'SSH SCP 错误',
            body: '请检查用户名、私钥、密码、权限是否正确',
            text: ''
          })
        })
    }

    return ctx
  }

  const register = () => {
    ctx.helper.uploader.register('ssh-scp-uploader', {
      handle,
      config,
      name: 'SSH SCP 上传'
    })
  }
  return {
    uploader: 'ssh-scp-uploader',
    register
  }
}
