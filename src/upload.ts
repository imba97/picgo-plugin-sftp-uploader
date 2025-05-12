import type { IImgInfo, IPicGo } from 'picgo'
import type { SFTPLoaderUserConfig } from './config'
import Client from './client'
import { getPcigoConfig } from './config'

import { formatPath } from './util'

export async function upload(
  ctx: IPicGo,
  output: IImgInfo,
  localPath: string
): Promise<string> {
  const userConfig: SFTPLoaderUserConfig = ctx.getConfig('picBed.sftp-uploader')

  if (!userConfig) {
    throw new Error('Can\'t find uploader config')
  }

  const configItem = await getPcigoConfig(userConfig)
  const config = configItem[userConfig.site]

  // 格式化路径
  const pathInfo = formatPath(output, config)

  return new Promise((resolve, reject) => {
    const executeAsync = async () => {
      try {
        // 连接
        await Client.instance.init(config)

        // 上传
        await Client.instance.upload(localPath, pathInfo.uploadPath)

        // 修改用户、用户组
        if (config.fileUser) {
          await Client.instance.chown(pathInfo.uploadPath, config.fileUser)
        }

        // 关闭
        Client.instance.close()

        resolve(pathInfo.path)
      }
      catch (err) {
        reject(err)
      }
    }

    executeAsync()
  })
}
