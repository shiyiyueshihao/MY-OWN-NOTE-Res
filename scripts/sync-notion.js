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