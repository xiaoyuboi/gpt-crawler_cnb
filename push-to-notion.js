const { Client } = require('@notionhq/client');
const fs = require('fs');

const notion = new Client({ 
  auth: process.env.NOTION_API_KEY 
});

async function pushToNotion() {
  try {
    const data = JSON.parse(fs.readFileSync('./output.json', 'utf8'));
    
    // 如果data是对象而不是数组，将其转换为数组处理
    const pages = Array.isArray(data) ? data : [data];
    
    for (const page of pages) {
      // 从HTML内容中提取纯文本
      let textContent = page.html
        .replace(/<[^>]*>/g, '') // 移除HTML标签
        .replace(/\s+/g, ' ')    // 将多个空白字符合并为一个空格
        .trim();                 // 移除首尾空白字符
      
      // 提取日期信息 (如果存在)
      let dateMatch = textContent.match(/(\d{4})[年\-](\d{1,2})[月\-](\d{1,2})日?/);
      let publishDate = dateMatch 
        ? `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}` 
        : new Date().toISOString().split('T')[0];
      
      // 创建Notion页面
      await notion.pages.create({
        parent: { database_id: process.env.NOTION_DATABASE_ID },
        properties: {
          // 标题字段 - 使用爬取的标题
          "标题": {
            title: [
              {
                text: {
                  content: page.title || 'Untitled'
                }
              }
            ]
          },
          // 来源URL字段
          "来源链接": {
            url: page.url || ''
          },
          // 发布日期字段
          "发布日期": {
            date: { 
              start: publishDate 
            }
          },
          // 爬取日期字段
          "爬取日期": {
            date: { 
              start: new Date().toISOString().split('T')[0]
            }
          },
          // 来源网站字段
          "来源网站": {
            select: {
              name: "Readhub"
            }
          }
        },
        // 内容块 - 将HTML内容转换为Notion块
        children: [
          // 添加原始内容段落
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: textContent.substring(0, 2000) // Notion API有单个文本块的长度限制
                  }
                }
              ]
            }
          },
          // 添加分隔线
          {
            object: 'block',
            type: 'divider'
          },
          // 添加原始链接
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: '原文链接：'
                  }
                },
                {
                  type: 'text',
                  text: {
                    content: page.url
                  },
                  link: {
                    url: page.url
                  }
                }
              ]
            }
          }
        ]
      });
      
      console.log(`Added page: ${page.title}`);
    }
    
    console.log('All data pushed to Notion successfully!');
  } catch (error) {
    console.error('Error pushing to Notion:', error);
    process.exit(1);
  }
}

pushToNotion();
