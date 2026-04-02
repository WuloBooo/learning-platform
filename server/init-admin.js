import bcrypt from 'bcryptjs'
import initSqlJs from 'sql.js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const dataDir = join(__dirname, 'src', '..', 'data')
const dbPath = join(dataDir, 'learning_platform.db')

async function initAdmin() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
    console.log('📁 创建数据目录:', dataDir)
  }
  
  const SQL = await initSqlJs()
  
  let db
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath)
    db = new SQL.Database(buffer)
    console.log('📂 打开现有数据库')
  } else {
    db = new SQL.Database()
    console.log('📝 创建新数据库')
    
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        avatar TEXT DEFAULT NULL,
        role TEXT DEFAULT 'student',
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }
  
  const adminUsername = 'admin'
  const adminEmail = 'admin@example.com'
  const adminPassword = 'Admin123456'
  
  const hashedPassword = await bcrypt.hash(adminPassword, 12)
  
  const checkStmt = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?')
  checkStmt.bind([adminUsername, adminEmail])
  
  if (checkStmt.step()) {
    const row = checkStmt.getAsObject()
    const userId = row.id
    checkStmt.free()
    
    db.run('UPDATE users SET role = ? WHERE id = ?', ['admin', userId])
    
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
    
    console.log('✅ 管理员账号已存在，已更新为管理员权限')
  } else {
    checkStmt.free()
    
    db.run(
      'INSERT INTO users (username, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
      [adminUsername, adminEmail, hashedPassword, 'admin', 'active']
    )
    
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
    
    console.log('✅ 管理员账号创建成功')
  }
  
  console.log('')
  console.log('========================================')
  console.log('  管理员账号信息')
  console.log('========================================')
  console.log(`  用户名: ${adminUsername}`)
  console.log(`  邮箱: ${adminEmail}`)
  console.log(`  密码: ${adminPassword}`)
  console.log('========================================')
  console.log('')
  console.log('前台登录: http://localhost:5174/login')
  console.log('后台登录: http://localhost:5174/admin/login')
  console.log('')
}

initAdmin().catch(console.error)
