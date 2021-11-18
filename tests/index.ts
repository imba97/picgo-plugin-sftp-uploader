/**
 * 测试用
 * npm run hhh
 */

import SSHClient from '../src/sshClient'
;(async () => {
  await SSHClient.instance.init({
    url: '',
    path: '',
    uploadPath: '',
    host: '',
    port: 22,
    username: '',
    privateKey: ''
  })

  const local = 'tsconfig.json'
  const remote = '/home/pi/test/a/b/c/abc/tsconfig.json'

  // 上传文件
  await SSHClient.instance.upload(local, remote)

  await SSHClient.instance
    .chown(remote, 'root')
    .then((res) => {
      console.log('修改用户、用户组')
    })
    .catch((err) => {
      console.log(err)
    })

  SSHClient.instance.close()
})()
