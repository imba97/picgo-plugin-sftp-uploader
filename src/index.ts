import picgo from 'picgo'
import { IImgInfo } from 'picgo/dist/src/types'

import fs from 'fs'
import crypto from 'crypto'

import scp2 from 'scp2'

interface IScpLoaderUserConfig {
  url: string
  path: string
  uploadPath: string
  host: string
  port: number
  usernameAndPrivateKey: string
  password?: string
}

interface IScpLoaderPathInfo {
  path: string
  uploadPath: string
}

export = (ctx: picgo) => {

  const config = (ctx: picgo) => {
    let userConfig = ctx.getConfig<IScpLoaderUserConfig>('picBed.ssh-scp-uploader')
    if (!userConfig) {
      userConfig = {
        url: '',
        path: '',
        uploadPath: '/uploads/{year}/{month}',
        host: '',
        port: 22,
        usernameAndPrivateKey: ''
      }
    }
    return [
      {
        name: 'url',
        type: 'input',
        default: userConfig.url,
        required: true,
        message: 'https://imba97.cn',
        alias: '域名地址'
      },
      {
        name: 'path',
        type: 'input',
        default: userConfig.path,
        required: true,
        message: '/uploads/{year}/{month}/{fullName}',
        alias: '网址路径'
      },
      {
        name: 'uploadPath',
        type: 'input',
        default: userConfig.uploadPath,
        required: true,
        message: '/blog/uploads/{year}/{month}/{fullName}',
        alias: '文件路径'
      },
      {
        name: 'host',
        type: 'input',
        default: userConfig.host,
        required: true,
        message: 'Host by ssh.',
        alias: 'SSH 地址'
      },
      {
        name: 'port',
        type: 'input',
        default: userConfig.port,
        required: true,
        message: 'Port by ssh.',
        alias: '端口'
      },
      {
        name: 'usernameAndPrivateKey',
        type: 'input',
        default: userConfig.usernameAndPrivateKey,
        required: true,
        message: '有私钥则填 用户名“竖线”私钥路径',
        alias: '用户名|私钥'
      },
      {
        name: 'password',
        type: 'input',
        default: userConfig.password || '',
        required: false,
        message: '有私钥则填私钥密码',
        alias: '密码/私钥密码'
      }
    ]
  }

  const handle = async (ctx: picgo) => {

    let userConfig: IScpLoaderUserConfig = ctx.getConfig('picBed.ssh-scp-uploader')
    if (!userConfig) {
      throw new Error("Can't find uploader config")
    }

    let input = ctx.input
    let output = ctx.output

    // 循环所有图片信息 上传
    for(let i in input) {

      let localPath = input[i]

      await upload(output[i], localPath, userConfig)
      .then(path => {

        let imgUrl = `${/\/$/.test(userConfig.url) ? userConfig.url.substr(0, userConfig.url.length) : userConfig.url}${path}`

        delete output[i].buffer

        output[i].url = imgUrl
        output[i].imgUrl = imgUrl

      })
      .catch(err => {
        ctx.log.error('SSH SCP 发生错误，请检查用户名、私钥和密码是否正确')
        throw new Error(err)
      })

    }

    return ctx
  }

  const upload = (output: IImgInfo, localPath: string, userConfig: IScpLoaderUserConfig) : Promise<string> => {

    // 格式化路径
    let resultPath = formatPath(output, userConfig)

    return new Promise(function (resolve, reject) {

      let usernameAndPrivateKey = userConfig.usernameAndPrivateKey.split('|')

      let username = usernameAndPrivateKey[0]
      let privateKey = typeof usernameAndPrivateKey[1] !== 'undefined' ? usernameAndPrivateKey[1] : ''

      // 构造不同的登录信息
      let loginInfo = privateKey !== '' ? {
        // 有私钥
        username: username,
        privateKey: fs.readFileSync(privateKey),
        passphrase: userConfig.password
      } : {
        // 无私钥
        username: username,
        password: userConfig.password
      }

      scp2.scp(localPath, {
        host: userConfig.host,
        port: userConfig.port,
        path: `${resultPath.uploadPath}`,
        ...loginInfo
      }, function(err) {
        if(err) reject(err)
        // 上传成功
        resolve(resultPath.path)
      })
    })

  }

  const formatPath = (output: IImgInfo, userConfig: IScpLoaderUserConfig) : IScpLoaderPathInfo => {
    // 获取日期
    let date = new Date()

    // 格式化数据
    let formatData = {

      // 路径
      year: `${date.getFullYear()}`,
      month: date.getMonth() < 9 ? `0${date.getMonth() + 1}` : `${date.getMonth() + 1}`,

      // 文件名
      fullName: output.fileName,
      fileName: output.fileName.replace(output.extname, ''),
      hash16: crypto.createHash('md5').update(output.base64Image ? output.base64Image : output.buffer.toString()).digest('hex').substr(0, 16),
      hash32: crypto.createHash('md5').update(output.base64Image ? output.base64Image : output.buffer.toString()).digest('hex'),

      // 后缀名
      ext: output.extname.replace('.', ''),
    }
    // 未格式化路径
    let pathInfo: IScpLoaderPathInfo = {
      path: userConfig.path,
      uploadPath: userConfig.uploadPath
    }
    // 替换后的路径
    let formatPath: IScpLoaderPathInfo = {
      path: '',
      uploadPath: ''
    }

    for(let key in pathInfo) {
      // 匹配 {} 内容
      let out = 0
      let reg = /(?:{(\w+)})/g
      formatPath[key] = pathInfo[key]
      let result: RegExpExecArray
      while(result = reg.exec(pathInfo[key])) {

        // 替换文本
        formatPath[key] = formatPath[key].replace(result[0], formatData[result[1]])

        // 避免死循环 一般没啥问题
        out++
        if(out > 100) break
      }

    }

    return formatPath
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
