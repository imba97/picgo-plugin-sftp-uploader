## picgo-plugin-ssh-scp-uploader

PicGo SSH SCP 上传插件

## 配置

配置分为“插件配置”和“配置文件配置”

**插件配置**是在插件中配置

**配置文件配置**是需要自行创建一个`json`文件进行配置

### 插件配置

名称 | 介绍 | 配置示例
-|-|-
网站标识 | 多个FTP站的标识 | imba97
配置文件 | 配置文件的路径或URL | C:/sshScpUploader.json

**关于配置文件**

可以是本地文件，如 `C:/sshScpUploader.json`

也可以是网络文件，如 `https://imba97.cn/sshScpUploader.json`

### 配置文件配置

配置文件是一个`json`文件，你可以在里面配置多个服务器的信息

例：

```json
{
  "imba97": {
    "url": "https://imba97.cn",
    "path": "/uploads/{year}/{month}/{fullName}",
    "uploadPath": "/www/imba97_cn/uploads/{year}/{month}/{fullName}",
    "host": "1.2.3.4",
    "port": 22,
    "usernameAndPrivateKey": "root|C:/Users/imba97/.ssh/id_rsa",
    "password": ""
  },
  "btools": {
    "url": "https://btools.cc",
    "path": "/uploads/{year}/{month}/{fullName}",
    "uploadPath": "/www/btools_cc/uploads/{year}/{month}/{fullName}",
    "host": "1.2.3.4",
    "port": 22,
    "usernameAndPrivateKey": "root",
    "password": "password233"
  }
}
```

key | 名称 | 介绍 | 配置示例
-|-|-|-
url | 域名地址 | 图片网站的域名 | https://imba97.cn
path | 网址路径 | 图片在网址中的路径 | /uploads/{year}/{month}/{fullName}
uploadPath | 文件路径 | 图片在服务器的真实路径 | /www/wwwroot/blog/uploads/{year}/{month}/{fullName}
host | SSH 地址 | 一般是服务器IP | 233.233.233.233
port | 端口 | 略 | 22
usernameAndPrivateKey | 用户名\|私钥 | 如果有私钥则填 用户名“竖线”私钥路径 | www
password | 密码/私钥密码 | 如果有私钥则填 私钥密码 | password

最终返回的地址是 **域名地址** + **网址路径**

## 路径 Format

路径配置可使用以下参数，使用示例：`/{year}/{month}/{fullName}`，输出示例：`/2020/01/imba97.png`

名称 | 介绍 | 输出示例
-|-|-
year | 当前年份 | 2021
month | 当前月份 | 01
fullName | 图片全名 | imba97.png
fileName | 图片名称 | imba97
hash16 | 图片 MD5 16位 | 68559cae1081d683
hash32 | 图片 MD5 32位 | 68559cae1081d6836e09b043aa0b3af1
ext | 图片后缀名 | png

**注意**：除了`fullName`，其他都需要自行添加后缀名

## 路径配置示例

**网址路径**和**文件路径**的配置示例

比如我服务器有这样一个路径：`/www/wwwroot/blog/uploads/`，图片在里面

我的网站根目录是`/www/wwwroot/blog/`

那么我可以把**网址路径**设置为`/uploads/{year}/{month}/{fullName}`

**文件路径**设置为`/www/wwwroot/blog/uploads/{year}/{month}/{fullName}`

## 用户名|私钥 配置示例

有两种方案

1. **用户名 + 密码**

   一般会用这种方式，只需要在

   **用户名|密钥** 配置SSH连接用的用户名

   **密码/密钥密码** 配置SSH连接的密码 即可

2. **用户名 + 私钥 + 私钥密码**

   私钥是使用`ssh-keygen`生成的，Windows 系统默认创建位置是`C:\Users\xxx\.ssh\id_rsa`

   生成及配置密钥的过程可参考[《搭建自己的Git服务器》](https://imba97.cn/archives/281)中的**创建SSH**部分

   完成后可以登录测试一下，再在**用户名|密钥**配置：

   ```
   www|C:\Users\xxx\.ssh\id_rsa
   ```

   `www`是用户名，中间用`|`隔开，后面是保存在本地的私钥文件路径

   **密码/密钥密码**配置创建密钥时输入的密码，**如果没有私钥密码可留空**

   **注意：**如果是宝塔的`www`用户，还需要修改`/etc/passwd`

   ```bash
   # 打开 passwd
   vim /etc/passwd
   # 找到这一行
   www:x:1000:1000::/home/www:/sbin/nologin
   # 改成
   www:x:1000:1000::/home/www:/bin/bash
   ```
