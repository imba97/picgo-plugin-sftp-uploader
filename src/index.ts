import type { IPicGo } from 'picgo'
import { config } from './config'
import { PLUGINS_ID } from './constants'
import { handle } from './handle'

export default function (ctx: IPicGo): any {
  const register = () => {
    ctx.helper.uploader.register(PLUGINS_ID, {
      handle,
      config,
      name: 'SFTP 上传'
    })
  }

  return {
    uploader: PLUGINS_ID,
    register
  }
}
