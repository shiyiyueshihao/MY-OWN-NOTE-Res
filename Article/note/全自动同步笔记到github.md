
# 全自动同步笔记到github远程仓库  <span style="font-size:14px;color:red">(需要科学上网)</span>

<style>
    span {
        color: antiquewhite
    }
</style>

## 工具与架构

| 工具                      | 地址                                         | 用途                         |
| :------------------------ | :------------------------------------------- | :--------------------------- |
| <span>notion</span>       | https://www.notion.com/connections           | 笔记上传                     |
| <span>notion开发者</span> | https://www.notion.so/developers/connections | 配置notion链接               |
| <span>github</span>       | https://github.com/                          | github远程仓库               |
| <span>vscode</span>       | https://code.visualstudio.com/               | 代码编辑器                   |
| <span>powershell</span>   | win+R  --> powershell                        | 终端                         |
| <span>node</span>         | https://nodejs.org/                          | JavaScript 运行环境 / 包管理 |


## 构建流程

### 创建 datebase 数据库
```
    登录notion 
```
<image src="./images/create_new_own_notion_steps_2026-05-21_11-40-22.png" />

```
    最终你会得到一个空白页面你可以在页面上添加一些你想要的任何东西 也可以像我一样
    (下面两个md文件可以不不用管 这是我自己的md笔记)
```
<image src="./images/my_own_notion_template_2026-05-21_11-45-56.png" />

### 建立连接

### 1.登录 notion 开发者平台
```
    点击 新连接 填写链接名称 创建链接
```
<image src="./images/create_notion_link_446c3c4d-1073-48a2-bc85-87fcd103aa59.png" />

### 2.获取notion令牌
```
    获取 notion 令牌密令 保存好
```
<image src="./images/notion_api_key_position_2026-05-21_12-05-46.png" />


### 3.获取database id 
```
    会获取类似这样的 https://www.notion.so/xxxxx?v=xxx&source=copy_link 的链接
    '?v='后面 '&sourec' 前面 就是你databse id 保存好
```
<image src="./images/get_database_id_2026-05-21_13-33-08.png" />

### 建立notion链接
```
    点击notion数据库内右上角··· 找到 集成 自己找自己之前创建的链接
    点击管理链接 找到github，建立于notion开发者平台的链接
```
<image src="./images/notion_link_2026-05-21_13-42-14.png" />

### <span style="color:skyblue"> 一切准备就绪! </span>

## 测试

### 1.创建目录
```
    接下来我们需要在本地创建文件夹用vscode打开
    所需要创建的目录如下 (x 不需要创建)
        NOTE
        ├── .github/
        │   └── workflows/
        │       └── sync-notion.yml
        ├── Article/note/
        │   ├── images/    (存储你的图片)
        │   ├── 全自动同步笔记到github.md    x
        │   ├── Docker_Nginx.md             x
        │   └── Echart_package.md           x
        ├── node_modules/                   x
        ├── scripts/
        │   └── sync-notion.js
        ├── .env
        ├── .gitignore
        ├── package-lock.json               x
        └── package.json                    x
```
<image src="./images/contents_of_NOTE_2026-05-21_13-49-01.png" />

### 2.初始化

```bash
    # 创建完成后  NOTE 目录下终端输入指令
    npm install @notionhq/client notion-to-md dotenv

    # 淘宝镜像
    npm install --registry=https://registry.npmmirror.com @notionhq/client notion-to-md dotenv
```
<image src="./images/install_dependencies_in_powershell_2026-05-21_14-05-01.png" />

```
    安装完成后 你的文件夹 就会像我之前的目录所示
```


### 3.完善文件

#### 3.1 完善 sync-notion.yml 文件
```yml
    name: Sync Notion to Blog

    on:
    # 每天凌晨 2 点自动执行
    schedule:
        - cron: '0 18 * * *'  # UTC 18:00 = 北京时间 02:00

    # 手动触发
    workflow_dispatch:

    # 推送到 main 分支时触发（可选）
    push:
        branches:
        - main
        paths:
        - 'scripts/sync-notion.js'

    jobs:
    sync:
        runs-on: ubuntu-latest

        steps:
        - name: Checkout 代码
            uses: actions/checkout@v3

        - name: 设置 Node.js
            uses: actions/setup-node@v3
            with:
            node-version: '18'

        - name: 安装依赖
            run: npm install

        - name: 同步 Notion 笔记
            env:
            NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}
            NOTION_DATABASE_ID: ${{ secrets.NOTION_DATABASE_ID }}
            run: node scripts/sync-notion.js

        - name: 提交更改
            run: |
            git config --local user.email "github-actions[bot]@users.noreply.github.com"
            git config --local user.name "github-actions[bot]"
            # 💡 修改这里：把 md 文件和 images 文件夹下的所有变更都加进来
            git add Article/note/*.md
            git add Article/note/images/** 2>/dev/null || true
            
            git diff --quiet && git diff --staged --quiet || (git commit -m "🔄 自动同步 Notion 笔记及图片 $(date +'%Y-%m-%d %H:%M:%S')" && git push)
```

#### 3.2 完善 sync-notion.js 文件
```js
    require('dotenv').config()
    const { Client } = require('@notionhq/client')
    const { NotionToMarkdown } = require('notion-to-md')
    const fs = require('fs')
    const path = require('path')

    // 仅用于 notion-to-md 解析正文内容
    const notion = new Client({ auth: process.env.NOTION_TOKEN })
    const n2m = new NotionToMarkdown({ notionClient: notion })

    const TOKEN = process.env.NOTION_TOKEN
    const DATABASE_ID = process.env.NOTION_DATABASE_ID

    async function syncNotionToMarkdown() {
    console.log('🚀 开始同步 Notion 笔记...')
    
    if (!TOKEN || !DATABASE_ID) {
        console.error('❌ 错误：未检测到环境变量，请检查 .env 文件是否放置在 NOTE 文件夹内！')
        process.exit(1)
    }

    // 清理可能带有换行或空格的 ID
    const cleanDatabaseId = DATABASE_ID.trim()

    try {
        // 💡 彻底抛弃 SDK 拼接，直接用原生 fetch 精准请求 Notion 官方 API 终点
        const url = `https://api.notion.com/v1/databases/${cleanDatabaseId}/query`
        
        const res = await fetch(url, {
            method: 'POST',
        headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            filter: {
                property: '展示',
            checkbox: {
                equals: true
            }
            },
            sorts: [
                {
                    property: '上次编辑时间', // 适配你的 Notion 列名
                direction: 'descending'
            }
            ]
        })
        })

        const response = await res.json()

        // 捕捉可能存在的 API 鉴权等错误提示
        if (!res.ok) {
            throw new Error(response.message || '请求 Notion 失败')
        }

        console.log(`📚 找到 ${response.results.length} 篇需要同步的文章`)

        // 2. 遍历并下载每篇文章
        for (const page of response.results) {
            await syncPage(page)
        }

        console.log('✅ 同步完成！')
    } catch (error) {
        console.error('❌ 同步失败，错误详情:')
        console.error(error.message)
        process.exit(1)
    }
    }

    // 在脚本顶部确保引入了 fs 和 path (你已经引入了)
    // const fs = require('fs')
    // const path = require('path')

    async function syncPage(page) {
        const pageId = page.id
    const titleObj = page.properties['Title']?.title[0]?.plain_text?.trim()

    if (!titleObj) {
        console.log('⚠️  跳过：文章标题为空')
        return
    }

    const title = titleObj
    const createdTime = page.properties['创建时间']?.created_time || page.created_time
    const updatedTime = page.properties['上次编辑时间']?.last_edited_time || page.last_edited_time

    console.log(`📝 同步文章: ${title}`)

    try {
        const mdblocks = await n2m.pageToMarkdown(pageId)
        let mdString = n2m.toMarkdownString(mdblocks).parent

        // 📂 定义图片存储的本地目录（例如：Article/note/images/文章名/）
        const cleanTitle = title.replace(/[\/\\:*?"<>|]/g, '-')
        const outputDir = path.join(__dirname, '../Article/note')
        const imagesDir = path.join(outputDir, 'images', cleanTitle)

        // 正则表达式：匹配 Markdown 中的图片语法 ![alt](url)
        const imgRegex = /!\[(.*?)\]\((.*?)\)/g
        let match
        const matches = []

        // 先把所有图片链接捞出来
        while ((match = imgRegex.exec(mdString)) !== null) {
            matches.push({ alt: match[1], url: match[2] })
        }

        // 如果文章包含图片，且图片目录不存在，则创建
        if (matches.length > 0 && !fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true })
        }

        // 循环下载图片并替换 Markdown 中的链接
        for (let i = 0; i < matches.length; i++) {
            const { alt, url } = matches[i]
        
        // 过滤掉已经是本地路径或外链（非 Notion 托管）的图片（可选）
        if (url.startsWith('http')) {
            console.log(`  ⏳ 正在下载第 ${i + 1} 张图片...`)
            
            // 生成本地文件名，比如 img_0.png, img_1.jpg
            // 也可以从 url 中用正则提取原后缀，这里简单用临时后缀或探测
            const ext = url.includes('.jpg') || url.includes('jpeg') ? 'jpg' : 'png'
            const imgFileName = `img_${i}.${ext}`
            const imgFilePath = path.join(imagesDir, imgFileName)

            // 下载图片到本地
            const success = await downloadImage(url, imgFilePath)

            if (success) {
                // 🔄 关键步骤：把绝对网络路径替换为博客系统认得的相对路径
            // 这里的相对路径取决于你的博客框架（Hexo/Hugo/VitePress等）怎么读取静态资源
            // 假设你的 Markdown 和 images 都在 note 目录下，相对路径就是 ./images/文章名/img_x.png
            const relativePath = `./images/${cleanTitle}/${imgFileName}`
            
            // 全局替换该图片链接（注意转义处理防止正则冲突，这里精确替换字符串）
            mdString = mdString.split(url).join(relativePath)
            }
        }
        }

        // 拼接 Frontmatter
        const frontmatter = `---
    title: ${title}
    date: ${createdTime}
    updated: ${updatedTime}
    ---

    `
        const content = frontmatter + mdString
        
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true })
        }

        const fileName = `${cleanTitle}.md`
        const filePath = path.join(outputDir, fileName)

        fs.writeFileSync(filePath, content, 'utf-8')
        console.log(`✅ 已保存文章和图片: ${fileName}`)
    } catch (error) {
        console.error(`❌ 同步文章 "${title}" 失败:`, error.message)
    }
    }

    // 🌐 辅助函数：利用 Node 18 自带的 fetch 下载图片流并写入本地
    async function downloadImage(url, destPath) {
        try {
            const res = await fetch(url)
        if (!res.ok) throw new Error(`请求失败: ${res.status}`)
        
        const arrayBuffer = await res.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        fs.writeFileSync(destPath, buffer)
        return true
    } catch (err) {
        console.error(`  ❌ 图片下载失败: ${err.message}`)
        return false
    }
    }

    syncNotionToMarkdown()
```

#### <span style="color:red">3.3 完善 .env 文件</span>
```
    这个很重要  --  不要将此暴露给任何别人
    NOTION_TOKEN=你的notion令牌
    NOTION_DATABASE_ID=你的database id
```

#### <span style="color:red">3.4 完善 .gitignore 文件</span>
```
    这个也很重要 --  需要把 不想提交的文件保留在自己这里不提交到远程仓库
        .env
        node_modules
        package-lock.json
```


### 4.Github配置

#### 4.1 登录github

#### 4.2 创建远程仓库 
```
    如下图所示创建
        Repository name (远程仓库名字  最好是全英文) 和 Description(描述) 随便填写
```

<image src="./images/create_res_in_github_2026-05-21_14-24-10.png" />

#### 4.3 创建远程仓库链接密令
```
    如下图所示 依次点击你刚才创建仓库的 Settings  --> Secrets and variables --> Actions
        依次创建两个密钥
        一个名字叫  NOTION_TOKEN
        一个名字叫  NOTION_DATABASE_ID  
``` 

<image src="./images/create_repository_secrets_2026-05-21_14-30-14.png" />

#### 最终测试

```
    在 notion 你创建的数据库内导入文本或者添加一些字段
```

```bash
    # 终端输入
    node scripts/sync-notion.js
```




