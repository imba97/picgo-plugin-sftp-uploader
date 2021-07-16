import picgo from 'picgo'
import http from 'http'
import fs from 'fs'

export const config = (ctx: picgo) => {
  let userConfig = ctx.getConfig<IScpLoaderUserConfig>(
    'picBed.ssh-scp-uploader'
  )

  if (!userConfig) {
    userConfig = {
      site: '',
      configFile: ''
    }
  }

  return [
    {
      name: 'site',
      type: 'input',
      default: userConfig.site,
      required: true,
      message: 'imba97',
      alias: '网站标识'
    },
    {
      name: 'configFile',
      type: 'input',
      default: userConfig.configFile,
      required: true,
      message: 'C:/sshScpUploaderConfig.json',
      alias: '配置文件'
    }
  ]
}

export const getFtpConfig = (
  userConfig: IScpLoaderUserConfig
): Promise<{ [key: string]: IScpLoaderUserConfigItem }> => {
  return new Promise((resolve, reject) => {
    // 如果是网址 则用 http 否则是本地 用 fs
    if (/^http/.test(userConfig.configFile)) {
      // 网络
      http
        .get(userConfig.configFile, (res) => {
          if (res.statusCode !== 200) {
            reject(res.statusCode)
            res.resume()
            return
          }

          res.setEncoding('utf8')

          let body = ''
          res.on('data', (chunk) => {
            body += chunk
          })
          res.on('end', () => {
            res.resume()
            resolve(JSON.parse(body))
          })
        })
        .on('error', (e) => {
          reject(e.message)
        })
    } else {
      // 本地
      resolve(JSON.parse(fs.readFileSync(userConfig.configFile).toString()))
    }
  })
}

export interface IScpLoaderUserConfig {
  site: string
  configFile: string
}

export interface IScpLoaderUserConfigItem extends Object {
  url: string
  path: string
  uploadPath: string
  host: string
  port: number
  usernameAndPrivateKey: string
  password?: string
}

export interface IScpLoaderPathInfo {
  path: string
  uploadPath: string
}
