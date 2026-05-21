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
    let cleanTitle = title.replace(/[\/\\:*?"<>|]/g, '-')
    const outputDir = path.join(__dirname, '../Article/note')
    
    // 🔒 核心改动：检测到本地 Markdown 重名时，自动为标题追加时间戳
    let fileName = `${cleanTitle}.md`
    let filePath = path.join(outputDir, fileName)
    
    if (fs.existsSync(filePath)) {
      // 生成当前时间戳，格式如：20260521_1530
      const now = new Date()
      const pad = (num) => String(num).padStart(2, '0')
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`
      
      // 更新标题和文件名，例如：Docker_Nginx_20260521_1530
      cleanTitle = `${cleanTitle}_${timestamp}`
      fileName = `${cleanTitle}.md`
      filePath = path.join(outputDir, fileName)
      
      console.log(`⚠️  检测到本地存在重名文件，自动启用新文件名: ${fileName}`)
    }

    // 根据最终确定的 cleanTitle 创建独立的图片目录
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
      
      if (url.startsWith('http')) {
        console.log(`  ⏳ 正在下载第 ${i + 1} 张图片...`)
        
        const ext = url.includes('.jpg') || url.includes('jpeg') ? 'jpg' : 'png'
        const imgFileName = `img_${i}.${ext}`
        const imgFilePath = path.join(imagesDir, imgFileName)

        // 下载图片到本地
        const success = await downloadImage(url, imgFilePath)

        if (success) {
          // 🔄 使用带有时间戳的新的相对路径
          const relativePath = `./images/${cleanTitle}/${imgFileName}`
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

    // 写入最终的文件
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