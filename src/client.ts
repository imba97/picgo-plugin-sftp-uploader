import type { Buffer } from 'node:buffer'
import type { ConnectConfig } from 'ssh2'
import type { SFTPLoaderUserConfigItem } from './config'
import fs from 'node:fs'
import path from 'node:path'
import ssh2 from 'ssh2'

export default class Client {
  private static _instance: Client
  private static _client: ssh2.Client

  /**
   * SFTP 实例
   */
  private _sftp: ssh2.SFTPWrapper

  /**
   * 是否连接
   */
  private _isConnected = false

  /**
   * 用户配置
   */
  private _userConfig: SFTPLoaderUserConfigItem

  /**
   * 类 单例
   */
  public static get instance(): Client {
    if (!this._instance) {
      this._instance = new Client()
    }

    return this._instance
  }

  /**
   * SSH 客户端 单例
   */
  public static get client(): ssh2.Client {
    if (!this._client) {
      this._client = new ssh2.Client()
    }

    return this._client
  }

  /**
   * 初始化 SSH
   */
  public init(config: SFTPLoaderUserConfigItem) {
    return new Promise((resolve, reject) => {
      this._userConfig = config

      // 构造不同的登录信息
      const loginInfo: ConnectConfig
        = typeof config.privateKey !== 'undefined' && config.privateKey !== ''
          ? {
              // 有私钥
              username: config.username,
              privateKey: fs.readFileSync(config.privateKey),
              passphrase: config.passphrase
            }
          : {
              // 无私钥
              username: config.username,
              password: config.password
            }

      Client.client
        .on('ready', () => {
          // 连接成功
          this._isConnected = true
          resolve(null)
        })
        .on('error', (err) => {
          reject(err)
        })
        .connect({
          host: config.host,
          port: config.port || 22,
          ...loginInfo
        })
    })
  }

  /**
   * 上传逻辑
   */
  public upload(local: string, remote: string): Promise<null> {
    if (!this._isConnected) {
      throw new Error('SSH 未连接')
    }

    return new Promise((resolve, reject) => {
      const executeAsync = async () => {
        try {
          const sftp = await this.sftp
          await this.mkdir(remote)
          resolve(this.doUpload(sftp, local, remote))
        }
        catch (error) {
          reject(error)
        }
      }

      executeAsync()
    })
  }

  /**
   * 上传
   * @param sftp SFTP 实例
   * @param local 本地路径
   * @param remote 远程路径
   */
  private doUpload(
    sftp: ssh2.SFTPWrapper,
    local: string,
    remote: string
  ): Promise<null> {
    return new Promise((resolve, reject) => {
      sftp.fastPut(local, remote, (err) => {
        if (err)
          reject(err)

        resolve(null)
      })
    })
  }

  /**
   * 创建文件夹
   * @param dirPath 文件夹路径
   * @param index 嵌套文件夹的 当前 index
   */
  private mkdir(dirPath: string | string[], index: number = 0): Promise<null> {
    return new Promise((resolve) => {
      const executeAsync = async () => {
        const sftp = await this.sftp

        const dirs = !Array.isArray(dirPath)
          ? path.dirname(dirPath).replace(/^\//, '').split('/')
          : dirPath

        const fullPath = `${dirs
          .map((p, _index) => (_index <= index ? `/${p}` : ''))
          .join('')}`

        sftp.exists(fullPath, (isExists) => {
        // 没文件夹 创建
          if (!isExists) {
            sftp.mkdir(
              fullPath,
              {
                mode: this._userConfig.dirMode || '0755'
              },
              () => {
              // 下一级目录
                if (index < dirs.length - 1) {
                  resolve(this.mkdir(dirs, index + 1))
                }
                else {
                  resolve(null)
                }
              }
            )
          }
          else {
          // 下一级目录
            if (index < dirs.length - 1) {
              resolve(this.mkdir(dirs, index + 1))
            }
            else {
              resolve(null)
            }
          }
        })
      }

      executeAsync()
    })
  }

  /**
   * 更改文件所属的用户、用户组
   * @param remote 远程路径
   * @param user 用户
   * @param group 用户组
   */
  public chown(remote: string, user: string, group?: string): Promise<null> {
    let _user: string
    let _group: string

    // 没写 group
    if (!group) {
      // 判断 user 是否有 :
      const isGroup = user.includes(':')
      // 有分组的情况
      if (isGroup) {
        // 分割 user
        const userSplit = user.split(':')

        // 设置用户和用户组
        _user = userSplit[0]
        _group = userSplit[1]
      }
      else {
        // 没分组的情况 视为用户名和分组名一致
        _user = user
        _group = user
      }
    }
    else {
      // 写了 group
      _user = user
      _group = group
    }

    return this.exec(`sudo chown ${_user}:${_group} ${remote}`)
  }

  /**
   * 关闭
   */
  public close(): void {
    this._sftp.end()
    this._sftp = null
    Client.client.end()
  }

  /**
   * 获取 SFTP 实例
   */
  private get sftp(): Promise<ssh2.SFTPWrapper> {
    if (this._sftp)
      return Promise.resolve(this._sftp)

    return new Promise((resolve, reject) => {
      Client.client.sftp((err, sftp) => {
        if (err)
          reject(err)

        this._sftp = sftp
        resolve(sftp)
      })
    })
  }

  /**
   * 执行 shell 命令
   * @param script 命令
   */
  private exec(script: string): Promise<null> {
    return new Promise((resolve, reject) => {
      Client.client.exec(script, (err, stream) => {
        if (err)
          reject(err)

        stream
          .on('close', () => {
            resolve(null)
          })
          .on('data', (data: Buffer) => {
            if (data)
              resolve(null)
            else reject(new Error('执行失败1'))
          })
          .stderr
          .on('data', (data: Buffer) => {
            if (data)
              resolve(null)
            else reject(new Error('执行失败2'))
          })
      })
    })
  }
}
