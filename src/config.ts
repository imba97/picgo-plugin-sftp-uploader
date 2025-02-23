import type { PicGo } from 'picgo'

import fs from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import process from 'node:process'

import env from './env'

export function config(ctx: PicGo) {
  let userConfig = ctx.getConfig<ISftpLoaderUserConfig>(
    `picBed.${env.PLUGINS_ID}`
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
      message: 'D:/sshScpUploaderConfig.json',
      alias: '配置文件'
    }
  ]
}

export function getPcigoConfig(userConfig: ISftpLoaderUserConfig): Promise<Record<string, ISftpLoaderUserConfigItem>> {
  return new Promise((resolve, reject) => {
    // 兼容 https
    let request: typeof http | typeof https | null = null

    if (userConfig.configFile.startsWith('https')) {
      request = https
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    }
    else if (userConfig.configFile.startsWith('http')) {
      request = http
    }

    // 如果是网址 则用 http 否则是本地 用 fs
    if (request !== null) {
      // 网络
      request
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
    }
    else {
      // 本地
      resolve(JSON.parse(fs.readFileSync(userConfig.configFile).toString()))
    }
  })
}

export interface ISftpLoaderUserConfig {
  site: string
  configFile: string
}

export interface ISftpLoaderUserConfigItem {
  url: string
  path: string
  uploadPath: string
  host: string
  port: number
  username: string
  password?: string
  privateKey?: string
  passphrase?: string
  fileUser?: string
  dirMode?: string
}

export interface ISftpLoaderPathInfo {
  path: string
  uploadPath: string
}
