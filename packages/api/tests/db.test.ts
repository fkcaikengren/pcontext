// index.js
import { createClient } from '@libsql/client'

// 1. 创建客户端连接
// url 使用 "file:" 前缀表示本地文件
const client = createClient({
  url: 'file:pcontext.db',
})

async function main() {
  try {
    // 2. 建表 (使用 execute)
    await client.execute(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task TEXT NOT NULL,
        completed BOOLEAN DEFAULT 0
      )
    `)
    console.log('表已创建或已存在')

    // 3. 插入数据 (使用参数化查询防止 SQL 注入)
    // args 中的值会替换 SQL 中的 ? 或者 :key
    const insertResult = await client.execute({
      sql: 'INSERT INTO todos (task, completed) VALUES (?, ?)',
      args: ['学习 SQLite', false], // 对应两个 ?
    })
    console.log('插入成功，新行ID:', insertResult.lastInsertRowid)

    // 再插入一条
    await client.execute({
      sql: 'INSERT INTO todos (task, completed) VALUES (:task, :completed)',
      args: { task: '写代码', completed: true }, // 使用命名参数
    })

    // 4. 查询数据
    const rs = await client.execute('SELECT * FROM todos')
    console.log('\n当前所有待办事项:')

    // rs.rows 是一个包含数据的数组
    for (const row of rs.rows) {
      console.log(`- [${row.completed ? 'x' : ' '}] ${row.task} (ID: ${row.id})`)
    }
  }
  catch (e) {
    console.error('发生错误:', e)
  }
}

main()
