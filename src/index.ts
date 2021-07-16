import picgo from 'picgo'
import { IImgInfo } from 'picgo/dist/src/types'

import fs from 'fs'
import scp2 from 'scp2'

import { config, getFtpConfig, IScpLoaderUserConfig } from './config'
import { formatPath } from './util'

export = (ctx: picgo) => {
  const handle = async (ctx: picgo) => {
    let userConfig: IScpLoaderUserConfig = ctx.getConfig(
      'picBed.ssh-scp-uploader'
    )

    if (!userConfig) {
      throw new Error("Can't find uploader config")
    }

    const configItem = await getFtpConfig(userConfig)
    const config = configItem[userConfig.site]

    const input = ctx.input
    const output = ctx.output

    // 循环所有图片信息 上传
    for (let i in input) {
      const localPath = input[i]

      await upload(output[i], localPath)
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
            body: '请检查用户名、私钥和密码是否正确',
            text: ''
          })
        })
    }

    return ctx
  }

  const upload = async (
    output: IImgInfo,
    localPath: string
  ): Promise<string> => {
    let userConfig: IScpLoaderUserConfig = ctx.getConfig(
      'picBed.ssh-scp-uploader'
    )

    if (!userConfig) {
      throw new Error("Can't find uploader config")
    }

    const configItem = await getFtpConfig(userConfig)
    const config = configItem[userConfig.site]

    // 格式化路径
    const pathInfo = formatPath(output, config)

    return new Promise((resolve, reject) => {
      const usernameAndPrivateKey = config.usernameAndPrivateKey.split('|')

      const username = usernameAndPrivateKey[0]
      const privateKey =
        typeof usernameAndPrivateKey[1] !== 'undefined'
          ? usernameAndPrivateKey[1]
          : ''

      // 构造不同的登录信息
      const loginInfo =
        privateKey !== ''
          ? {
              // 有私钥
              username: username,
              privateKey: fs.readFileSync(privateKey),
              passphrase: config.password
            }
          : {
              // 无私钥
              username: username,
              password: config.password
            }

      scp2.scp(
        localPath,
        {
          host: config.host,
          port: config.port,
          path: `${pathInfo.uploadPath}`,
          ...loginInfo
        },
        function (err) {
          if (err) reject(err)
          // 上传成功
          resolve(pathInfo.path)
        }
      )
    })
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
