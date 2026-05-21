require('dotenv').config()
const { Client } = require('@notionhq/client')
const { NotionToMarkdown } = require('notion-to-md')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto') // 💡 引入加密模块用于计算 MD5

// 仅用于 notion-to-md 解析正文内容
const notion = new Client({ auth: process.env.NOTION_TOKEN })
const n2m = new NotionToMarkdown({ notionClient: notion })

const TOKEN = process.env.NOTION_TOKEN
const DATABASE_ID = process.env.NOTION_DATABASE_ID

// 🌐 辅助函数：计算字符串的 MD5
function getMd5(content) {
  return crypto.createHash('md5').update(content, 'utf8').digest('hex')
}

async function syncNotionToMarkdown() {
  console.log('🚀 开始同步 Notion 笔记...')
  
  if (!TOKEN || !DATABASE_ID) {
    console.error('❌ 错误：未检测到环境变量，请检查 .env 文件是否放置在 NOTE 文件夹内！')
    process.exit(1)
  }

  const cleanDatabaseId = DATABASE_ID.trim()

  try {
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
            property: '上次编辑时间', 
            direction: 'descending'
          }
        ]
      })
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.message || '请求 Notion 失败')
    }

    console.log(`📚 找到 ${response.results.length} 篇需要同步的文章`)

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
  const titleObj = page.properties['Title']?.title[0]?.plain_text?.trim()

  if (!titleObj) {
    console.log('⚠️  跳过：文章标题为空')
    return
  }

  const title = titleObj
  const createdTime = page.properties['创建时间']?.created_time || page.created_time
  const updatedTime = page.properties['上次编辑时间']?.last_edited_time || page.last_edited_time
  
  const isLatestBase = page.properties['以此为最新基准']?.checkbox || false

  console.log(`📝 同步文章: ${title} [最新基准: ${isLatestBase ? '⭐ 是' : '  좀 否'}]`)

  try {
    const mdblocks = await n2m.pageToMarkdown(pageId)
    let mdString = n2m.toMarkdownString(mdblocks).parent

    // 📂 定义基础输出目录
    let cleanTitle = title.replace(/[\/\\:*?"<>|]/g, '-')
    const outputDir = path.join(__dirname, '../Article/note')
    
    let fileName = `${cleanTitle}.md`
    let filePath = path.join(outputDir, fileName)
    
    let shouldWrite = true
    let isRename = false

    // 🔒 状态判定：本地文件存在，且未勾选最新基准 -> 直接走重命名逻辑（不覆盖本地手写稿）
    if (fs.existsSync(filePath) && !isLatestBase) {
      const now = new Date()
      const pad = (num) => String(num).padStart(2, '0')
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`
      
      cleanTitle = `${cleanTitle}_${timestamp}`
      fileName = `${cleanTitle}.md`
      filePath = path.join(outputDir, fileName)
      isRename = true
      
      console.log(`⚠️  检测到本地存在重名文件且未勾选基准，自动启用时间戳新文件名: ${fileName}`)
    }

    // 根据最终确定的 cleanTitle 创建独立的图片目录并下载图片
    const imagesDir = path.join(outputDir, 'images', cleanTitle)
    const imgRegex = /!\[(.*?)\]\((.*?)\)/g
    let match
    const matches = []

    while ((match = imgRegex.exec(mdString)) !== null) {
      matches.push({ alt: match[1], url: match[2] })
    }

    if (matches.length > 0 && !fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true })
    }

    for (let i = 0; i < matches.length; i++) {
      const { alt, url } = matches[i]
      if (url.startsWith('http')) {
        console.log(`  ⏳ 正在下载第 ${i + 1} 张图片...`)
        const ext = url.includes('.jpg') || url.includes('jpeg') ? 'jpg' : 'png'
        const imgFileName = `img_${i}.${ext}`
        const imgFilePath = path.join(imagesDir, imgFileName)

        const success = await downloadImage(url, imgFilePath)
        if (success) {
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

    // 🎯 核心对比逻辑：如果刚才没有走重命名逻辑，且本地确实存在同名文件（即处于勾选了最新基准的覆盖场景）
    if (!isRename && fs.existsSync(filePath)) {
      const localContent = fs.readFileSync(filePath, 'utf-8')
      
      // 对比新旧内容的 MD5
      if (getMd5(content) === getMd5(localContent)) {
        console.log(`💤 内容无变化，跳过覆盖: ${fileName}`)
        shouldWrite = false // 标记为不需要写入
      } else {
        console.log(`♻️  检测到内容有变化，执行完全覆盖替换: ${fileName}`)
      }
    }

    // 执行写入
    if (shouldWrite) {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }
      fs.writeFileSync(filePath, content, 'utf-8')
      console.log(`✅ 已成功保存: ${fileName}`)
    }
  } catch (error) {
    console.error(`❌ 同步文章 "${title}" 失败:`, error.message)
  }
}

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