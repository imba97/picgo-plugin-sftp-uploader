import { IImgInfo } from 'picgo/dist/src/types'

import picgo from 'picgo'
import { formatPath } from './util'
import { getPcigoConfig, IScpLoaderUserConfig } from './config'

import SSHClient from './sshClient'

/**
 * 上传处理函数
 * @param ctx picgo
 * @param output picgo output
 * @param localPath 本地路径
 * @returns 上传后的网址路径
 */
export default async function upload(
  ctx: picgo,
  output: IImgInfo,
  localPath: string
): Promise<string> {
  let userConfig: IScpLoaderUserConfig = ctx.getConfig(
    'picBed.ssh-scp-uploader'
  )

  if (!userConfig) {
    throw new Error("Can't find uploader config")
  }

  const configItem = await getPcigoConfig(userConfig)
  const config = configItem[userConfig.site]

  // 格式化路径
  const pathInfo = formatPath(output, config)

  return new Promise(async (resolve, reject) => {
    // 连接
    await SSHClient.instance.init(config)

    // ctx.log.info(JSON.stringify(pathInfo))

    // 上传
    await SSHClient.instance
      .upload(localPath, pathInfo.uploadPath)
      .catch((err) => {
        reject(err)
      })

    // 修改用户、用户组
    if (config.fileUser)
      await SSHClient.instance
        .chown(pathInfo.uploadPath, config.fileUser)
        .catch((err) => {
          reject(err)
        })

    // 关闭
    SSHClient.instance.close()

    resolve(pathInfo.path)
  })
}
