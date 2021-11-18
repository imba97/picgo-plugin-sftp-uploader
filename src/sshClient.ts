import ssh2, { ConnectConfig } from 'ssh2'
import fs from 'fs'
import path from 'path'
import { ISftpLoaderUserConfigItem } from './config'

export default class SSHClient {
  private static _instance: SSHClient
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
  private _userConfig: ISftpLoaderUserConfigItem

  /**
   * 类 单例
   */
  public static get instance() {
    if (!this._instance) {
      this._instance = new SSHClient()
    }

    return this._instance
  }

  /**
   * SSH 客户端 单例
   */
  public static get client() {
    if (!this._client) {
      this._client = new ssh2.Client()
    }

    return this._client
  }

  /**
   * 初始化SSH
   * @param config 用户配置
   * @returns
   */
  public init(config: ISftpLoaderUserConfigItem): Promise<null> {
    return new Promise((resolve, reject) => {
      SSHClient.instance._userConfig = config

      // 构造不同的登录信息
      const loginInfo: ConnectConfig =
        typeof config.privateKey !== 'undefined' && config.privateKey !== ''
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

      SSHClient.client
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
   * @param local 本地路径
   * @param remote 远程路径
   * @returns null
   */
  public upload(local: string, remote: string): Promise<null> {
    if (!this._isConnected) {
      throw new Error('SSH 未连接')
    }

    return new Promise(async (resolve, reject) => {
      const sftp = await this.sftp

      await this.mkdir(remote)

      resolve(this.doUpload(sftp, local, remote))
    })
  }

  /**
   * 上传
   * @param sftp SFTP 实例
   * @param local 本地路径
   * @param remote 远程路径
   * @returns
   */
  private doUpload(
    sftp: ssh2.SFTPWrapper,
    local: string,
    remote: string
  ): Promise<null> {
    return new Promise((resolve, reject) => {
      sftp.fastPut(local, remote, (err) => {
        if (err) reject(err)

        resolve(null)
      })
    })
  }

  /**
   * 创建文件夹
   * @param dirPath 文件夹路径
   * @param index 嵌套文件夹的 当前 index
   * @returns
   */
  private mkdir(dirPath: string | string[], index: number = 0): Promise<null> {
    return new Promise(async (resolve, reject) => {
      const sftp = await this.sftp

      const dirs = !Array.isArray(dirPath)
        ? path.dirname(dirPath).replace(/^\//, '').split('/')
        : dirPath

      let fullPath = `${dirs
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
              } else {
                resolve(null)
              }
            }
          )
        } else {
          // 下一级目录
          if (index < dirs.length - 1) {
            resolve(this.mkdir(dirs, index + 1))
          } else {
            resolve(null)
          }
        }
      })
    })
  }

  /**
   * 更改文件所属的用户、用户组
   * @param remote 远程路径
   * @param user 用户
   * @param group 用户组
   * @returns
   */
  public chown(remote: string, user: string, group?: string) {
    let _user: string
    let _group: string

    // 没写 group
    if (!group) {
      // 判断 user 是否有 :
      const isGroup = user.indexOf(':') !== -1
      // 有分组的情况
      if (isGroup) {
        // 分割 user
        const userSplit = user.split(':')

        // 设置用户和用户组
        _user = userSplit[0]
        _group = userSplit[1]
      } else {
        // 没分组的情况 视为用户名和分组名一致
        _user = user
        _group = user
      }
    } else {
      // 写了 group
      _user = user
      _group = group
    }

    return this.exec(`sudo chown ${_user}:${_group} ${remote}`)
  }

  /**
   * 关闭
   */
  public close() {
    this._sftp.end()
    this._sftp = null
    SSHClient.client.end()
  }

  /**
   * 获取 SFTP 实例
   */
  private get sftp(): Promise<ssh2.SFTPWrapper> {
    if (this._sftp) return Promise.resolve(this._sftp)

    return new Promise((resolve, reject) => {
      SSHClient.client.sftp((err, sftp) => {
        if (err) reject(err)

        this._sftp = sftp
        resolve(sftp)
      })
    })
  }

  /**
   * 执行 shell 命令
   * @param script 命令
   * @returns
   */
  private exec(script: string): Promise<null> {
    return new Promise((resolve, reject) => {
      SSHClient.client.exec(script, (err, stream) => {
        if (err) reject(err)

        stream
          .on('close', () => {
            resolve(null)
          })
          .on('data', (data: Buffer) => {
            if (data) resolve(null)
            else reject(new Error('执行失败1'))
          })
          .stderr.on('data', (data: Buffer) => {
            if (data) resolve(null)
            else reject(new Error('执行失败2'))
          })
      })
    })
  }
}
