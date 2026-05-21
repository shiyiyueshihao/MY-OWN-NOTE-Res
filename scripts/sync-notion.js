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

async function syncPage(page) {
  const pageId = page.id
  
  // 适配你的 Notion 列名 'Title'
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
    const mdString = n2m.toMarkdownString(mdblocks)

    const frontmatter = `---
title: ${title}
date: ${createdTime}
updated: ${updatedTime}
---

`
    const content = frontmatter + mdString.parent
    const outputDir = path.join(__dirname, '../Article/note')
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const fileName = `${title.replace(/[\/\\:*?"<>|]/g, '-')}.md`
    const filePath = path.join(outputDir, fileName)

    fs.writeFileSync(filePath, content, 'utf-8')
    console.log(`✅ 已保存: ${fileName}`)
  } catch (error) {
    console.error(`❌ 同步文章 "${title}" 失败:`, error.message)
  }
}

syncNotionToMarkdown()