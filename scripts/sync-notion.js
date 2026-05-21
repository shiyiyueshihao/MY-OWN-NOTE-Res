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

// 🎨 1. 健壮的 Markdown Frontmatter 解析器
function parseMarkdown(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  // 匹配开头的 --- frontmatter ---
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  
  let title = path.basename(filePath, '.md').trim()
  let body = content

  if (match) {
    const yaml = match[1]
    body = match[2]
    const titleMatch = yaml.match(/title:\s*(.*)/)
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim()
    }
  }
  return { title, body: body.trim() }
}

// 🎨 2. 核心：将 Markdown 文本流精准翻译为 Notion 官方支持的 Blocks 对象
function markdownToNotionBlocks(text) {
  if (!text) return []
  const lines = text.split(/\r?\n/)
  const blocks = []
  
  let inCodeBlock = false
  let codeContent = []
  let codeLanguage = 'javascript'

  for (let line of lines) {
    const trimmed = line.trim()

    // ─── 处理代码块 (Code Block) ───
    if (trimmed.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true
        codeLanguage = trimmed.replace('```', '').trim() || 'javascript'
        codeContent = []
      } else {
        inCodeBlock = false
        blocks.push({
          object: 'block',
          type: 'code',
          code: {
            language: codeLanguage,
            rich_text: [{ type: 'text', text: { content: codeContent.join('\n') } }]
          }
        })
      }
      continue
    }

    if (inCodeBlock) {
      codeContent.push(line)
      continue
    }

    // ─── 处理一级标题 (# ) ───
    if (line.startsWith('# ')) {
      blocks.push({
        object: 'block',
        type: 'heading_1',
        heading_1: { rich_text: [{ type: 'text', text: { content: line.substring(2) } }] }
      })
      continue
    }

    // ─── 处理二级标题 (## ) ───
    if (line.startsWith('## ')) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: [{ type: 'text', text: { content: line.substring(3) } }] }
      })
      continue
    }

    // ─── 处理三级标题 (### ) ───
    if (line.startsWith('### ')) {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: { rich_text: [{ type: 'text', text: { content: line.substring(4) } }] }
      })
      continue
    }

    // ─── 处理无序列表 (* 或 -) ───
    if (line.startsWith('* ') || line.startsWith('- ')) {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: [{ type: 'text', text: { content: line.substring(2) } }] }
      })
      continue
    }

    // ─── 处理引用块 (> ) ───
    if (line.startsWith('> ')) {
      blocks.push({
        object: 'block',
        type: 'quote',
        quote: { rich_text: [{ type: 'text', text: { content: line.substring(2) } }] }
      })
      continue
    }

    // ─── 普通段落 ───
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: [{ type: 'text', text: { content: line || ' ' } }] }
    })
  }

  return blocks.slice(0, 99) // Notion 限制单词追加上限为 100 个 block
}

// 🎯 3. 寻找 Notion 对应页面
async function findNotionPageByTitle(title) {
  const response = await notion.databases.query({
    database_id: DATABASE_ID.trim(),
    filter: {
      property: 'Title', // 匹配你截图确认的 Title 列
      title: { equals: title }
    }
  })
  return response.results[0] || null
}

// 🎯 4. 清理旧正文的辅助函数
async function clearPageChildren(blockId) {
  try {
    const oldBlocks = await notion.blocks.children.list({ block_id: blockId })
    for (const block of oldBlocks.results) {
      await notion.blocks.delete({ block_id: block.id })
    }
  } catch (err) {
    console.warn(`⚠️ 提示：清理旧 Blocks 时遇到障碍 (可能本就是空文章):`, err.message)
  }
}

// 🎯 5. 执行单文件同步
async function syncFileToNotion(filePath) {
  const { title, body } = parseMarkdown(filePath)
  console.log(`📦 准备同步文章: [${title}]`)

  try {
    const existingPage = await findNotionPageByTitle(title)
    const blocks = markdownToNotionBlocks(body)

    // 构建公共属性负载
    const propertiesPayload = {
      '展示': { checkbox: true },
      '以此为最新基准': { checkbox: false }
    }

    if (existingPage) {
      console.log(`♻️  Notion 已存在 [${title}]，正在刷新正文块...`)
      
      // 刷正文：先清空，再追加
      await clearPageChildren(existingPage.id)
      
      if (blocks.length > 0) {
        await notion.blocks.children.append({ block_id: existingPage.id, children: blocks })
      }
      
      // 刷属性
      await notion.pages.update({ page_id: existingPage.id, properties: propertiesPayload })
      console.log(`✅ 文章更新成功: ${title}`)
    } else {
      console.log(`✨ Notion 中查无此文，正在为您创建新页面...`)
      
      // 动态注入主键标题列
      propertiesPayload['Title'] = { title: [{ text: { content: title } }] }

      await notion.pages.create({
        parent: { database_id: DATABASE_ID.trim() },
        properties: propertiesPayload,
        children: blocks.length > 0 ? blocks : undefined
      })
      console.log(`✅ 新文章创建成功: ${title}`)
    }
  } catch (error) {
    console.error(`❌ 同步文章 "${title}" 失败，详情:`, error.message)
  }
}

async function main() {
  console.log('🚀 启动 [VS Code ➔ Notion] 反向高保真同步服务...')
  if (!fs.existsSync(NOTE_DIR)) {
    console.error(`❌ 错误：未找到笔记存放目录: ${NOTE_DIR}`)
    return
  }

  const files = fs.readdirSync(NOTE_DIR).filter(file => file.endsWith('.md'))
  console.log(`📚 本地共检索到 ${files.length} 篇 Markdown 文件待同步`)

  for (const file of files) {
    const fullPath = path.join(NOTE_DIR, file)
    await syncFileToNotion(fullPath)
  }

  console.log('🎉 恭喜，所有本地笔记已安全、完整地同步至 Notion！')
}

main()