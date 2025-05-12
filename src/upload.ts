import type { Buffer } from 'node:buffer'
import type { IImgInfo, IPicGo } from 'picgo'
import type Client from './client'
import type { SFTPLoaderPathInfo, SFTPLoaderUserConfigItem } from './config'
import fs from 'node:fs'
import { formatPath } from './util'

export function useUploader(
  ctx: IPicGo,
  client: typeof Client.instance,
  config: SFTPLoaderUserConfigItem
) {
  // 公共上传逻辑
  const doUpload = async (
    fileOrBuffer: string | Buffer,
    pathInfo: SFTPLoaderPathInfo
  ) => {
    let uploadPath = fileOrBuffer
    let tmpFile: string | undefined
    if (typeof fileOrBuffer !== 'string') {
      tmpFile = await bufferToTempFile(fileOrBuffer)
      uploadPath = tmpFile
    }
    await client.upload(uploadPath as string, pathInfo.uploadPath)
    if (tmpFile) {
      try {
        fs.unlinkSync(tmpFile)
      }
      catch (e) {
        ctx.log?.warn?.('临时文件删除失败: %o', e)
      }
    }
    if (config.fileUser) {
      await client.chown(pathInfo.uploadPath, config.fileUser)
    }
    return pathInfo.path
  }

  // 处理本地路径上传
  const upload = async (localPath: string, idx: number, output: IImgInfo[]) => {
    const pathInfo = formatPath(output[idx], config)
    return doUpload(localPath, pathInfo)
  }

  // 处理 Buffer 上传
  const uploadBuffer = async (buffer: Buffer, idx: number, output: IImgInfo[]) => {
    const pathInfo = formatPath(output[idx], config)
    return doUpload(buffer, pathInfo)
  }

  // Buffer 转临时文件
  async function bufferToTempFile(buffer: Buffer): Promise<string> {
    // 只在必须时用临时文件
    const tmpDir = fs.mkdtempSync('picgo-sftp-')
    const tmpFile = `${tmpDir}/${Date.now()}`
    fs.writeFileSync(tmpFile, buffer)
    return tmpFile
  }

  return {
    upload,
    uploadBuffer
  }
}
