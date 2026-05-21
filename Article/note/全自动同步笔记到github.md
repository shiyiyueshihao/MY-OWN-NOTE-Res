
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
    name: Sync Blog to Notion

    on:
    # 当你把代码 push 到 main 分支，且修改了 Article/note 目录下的 md 文件时触发
    push:
        branches:
        - main
        paths:
        - 'Article/note/**.md'
        - 'scripts/sync-notion.js'

    # 允许手动在 GitHub 页面点击触发
    workflow_dispatch:

    jobs:
    sync-to-notion:
        runs-on: ubuntu-latest

        steps:
        - name: Checkout 代码
            uses: actions/checkout@v3

        - name: 设置 Node.js 环境
            uses: actions/setup-node@v3
            with:
            node-version: '18'

        - name: 安装项目依赖
            run: npm install

        - name: 运行反向同步脚本 (VS Code -> Notion)
            env:
            NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}
            NOTION_DATABASE_ID: ${{ secrets.NOTION_DATABASE_ID }}
            run: node scripts/sync-notion.js
```

#### 3.2 完善 sync-notion.js 文件
```js
    require('dotenv').config()
    const { Client } = require('@notionhq/client')
    const fs = require('fs')
    const path = require('path')

    const TOKEN = process.env.NOTION_TOKEN
    const DATABASE_ID = process.env.NOTION_DATABASE_ID

    if (!TOKEN || !DATABASE_ID) {
    console.error('❌ 错误：未检测到环境变量，请检查 .env 文件！')
    process.exit(1)
    }

    const notion = new Client({ auth: TOKEN })
    const NOTE_DIR = path.join(__dirname, '../Article/note')

    // 辅助函数：简易解析 Frontmatter
    function parseMarkdown(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8')
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
    
    let title = path.basename(filePath, '.md')
    let body = content

    if (match) {
        const yaml = match[1]
        body = match[2]
        const titleMatch = yaml.match(/title:\s*(.*)/)
        if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].trim()
        }
    }
    return { title, body }
    }

    // 简易将文本切分为 Notion 支持的 paragraph blocks（每一行一个 block）
    function convertToBlocks(text) {
    const lines = text.split(/\r?\n/)
    const blocks = []

    for (let line of lines) {
        if (!line.trim()) continue
        
        // 简易识别标题
        if (line.startsWith('# ')) {
        blocks.push({
            object: 'block',
            type: 'heading_1',
            heading_1: { rich_text: [{ type: 'text', text: { content: line.replace('# ', '') } }] }
        })
        } else if (line.startsWith('## ')) {
        blocks.push({
            object: 'block',
            type: 'heading_2',
            heading_2: { rich_text: [{ type: 'text', text: { content: line.replace('## ', '') } }] }
        })
        } else {
        // 普通文本
        blocks.push({
            object: 'block',
            type: 'paragraph',
            paragraph: { rich_text: [{ type: 'text', text: { content: line } }] }
        })
        }
    }
    return blocks.slice(0, 99) // Notion 单次请求最多支持 100 个 blocks
    }

    // 查询 Notion 数据库中是否存在同名文章
    async function findNotionPageByTitle(title) {
    const response = await notion.databases.query({
        database_id: DATABASE_ID.trim(),
        filter: {
        property: 'Title', // 匹配你 Notion 中的 Title 列
        title: {
            equals: title
        }
        }
    })
    return response.results[0] || null
    }

    // 向 Notion 写入或更新文章
    async function syncFileToNotion(filePath) {
    const { title, body } = parseMarkdown(filePath)
    console.log(`📦 正在处理文章: ${title}...`)

    try {
        const existingPage = await findNotionPageByTitle(title)
        const blocks = convertToBlocks(body)

        if (existingPage) {
        console.log(`♻️  Notion 已存在该文章，执行覆盖更新...`)
        
        // 1. 清空旧的 Blocks (先获取旧的，再逐个删除)
        const oldBlocks = await notion.blocks.children.list({ block_id: existingPage.id })
        for (const block of oldBlocks.results) {
            await notion.blocks.delete({ block_id: block.id })
        }

        // 2. 写入新的正文 Blocks
        if (blocks.length > 0) {
            await notion.blocks.children.append({
            block_id: existingPage.id,
            children: blocks
            })
        }
        
        // 3. 更新属性
        await notion.pages.update({
            page_id: existingPage.id,
            properties: {
            '展示': { checkbox: true },
            '以此为最新基准': { checkbox: false } // 更新完重置基准状态
            }
        })
        console.log(`✅ 文章更新成功: ${title}`)
        } else {
        console.log(`✨ Notion 中未找到该文章，正在新建页面...`)
        // 新建页面
        await notion.pages.create({
            parent: { database_id: DATABASE_ID.trim() },
            properties: {
            'Title': { title: [{ text: { content: title } }] },
            '展示': { checkbox: true },
            '以此为最新基准': { checkbox: false }
            },
            children: blocks.length > 0 ? blocks : undefined
        })
        console.log(`✅ 新文章创建成功: ${title}`)
        }
    } catch (error) {
        console.error(`❌ 同步文章 "${title}" 失败:`, error.message)
    }
    }

    async function main() {
    console.log('🚀 开始将 VS Code 笔记同步至 Notion...')
    if (!fs.existsSync(NOTE_DIR)) {
        console.error(`❌ 未找到笔记目录: ${NOTE_DIR}`)
        return
    }

    const files = fs.readdirSync(NOTE_DIR).filter(file => file.endsWith('.md'))
    console.log(`📚 发现本地共 ${files.length} 篇 Markdown 文档`)

    for (const file of files) {
        const fullPath = path.join(NOTE_DIR, file)
        await syncFileToNotion(fullPath)
    }

    console.log('🎉 所有数据反向同步到 Notion 完成！')
    }

    main()
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




