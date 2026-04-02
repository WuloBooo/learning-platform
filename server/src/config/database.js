import initSqlJs from 'sql.js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const dataDir = join(__dirname, '..', '..', 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = process.env.DB_PATH || join(dataDir, 'learning_platform.db')

let db = null

export async function initDatabase() {
  const SQL = await initSqlJs()
  
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }
  
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
  
  db.run(`
    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      gender TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      id_card TEXT,
      education TEXT,
      school TEXT,
      major TEXT,
      goal TEXT,
      referrer TEXT,
      exam_type TEXT,
      exam_level TEXT,
      has_experience INTEGER DEFAULT 0,
      experience TEXT,
      registration_no TEXT NOT NULL UNIQUE,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `)
  
  db.run(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      exam_type TEXT NOT NULL,
      exam_date DATE,
      location TEXT,
      description TEXT,
      status TEXT DEFAULT 'upcoming',
      max_participants INTEGER DEFAULT 100,
      current_participants INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT,
      description TEXT,
      file_path TEXT,
      file_size INTEGER,
      file_type TEXT,
      download_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subtitle TEXT,
      image_url TEXT,
      link_url TEXT,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS question_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER,
      exam_type TEXT,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      exam_type TEXT,
      question_type TEXT DEFAULT 'single',
      title TEXT NOT NULL,
      options TEXT,
      answer TEXT NOT NULL,
      analysis TEXT,
      difficulty TEXT DEFAULT 'medium',
      points INTEGER DEFAULT 1,
      tags TEXT,
      status TEXT DEFAULT 'published',
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES question_categories(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS exam_papers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      exam_type TEXT,
      description TEXT,
      total_score INTEGER DEFAULT 100,
      duration INTEGER DEFAULT 60,
      pass_score INTEGER DEFAULT 60,
      question_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft',
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS paper_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paper_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      sort_order INTEGER DEFAULT 0,
      score INTEGER DEFAULT 1,
      FOREIGN KEY (paper_id) REFERENCES exam_papers(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS user_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      question_id INTEGER,
      paper_id INTEGER,
      user_answer TEXT,
      is_correct INTEGER DEFAULT 0,
      time_spent INTEGER DEFAULT 0,
      answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (question_id) REFERENCES questions(id),
      FOREIGN KEY (paper_id) REFERENCES exam_papers(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS user_exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      paper_id INTEGER,
      registration_id INTEGER,
      total_score REAL DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      wrong_count INTEGER DEFAULT 0,
      time_spent INTEGER DEFAULT 0,
      status TEXT DEFAULT 'ongoing',
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      submitted_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (paper_id) REFERENCES exam_papers(id),
      FOREIGN KEY (registration_id) REFERENCES registrations(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS wrong_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      wrong_count INTEGER DEFAULT 1,
      last_wrong_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      mastered INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS paper_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paper_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      sort_order INTEGER DEFAULT 0,
      score INTEGER DEFAULT 1,
      FOREIGN KEY (paper_id) REFERENCES exam_papers(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )
  `)

  // 资料表（如果不存在）
  db.run(`
    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT,
      description TEXT,
      file_path TEXT,
      file_size INTEGER DEFAULT 0,
      file_type TEXT,
      download_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 新闻/公告表
  db.run(`
    CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      summary TEXT,
      content TEXT,
      type TEXT DEFAULT 'notice',
      cover_image TEXT,
      author TEXT,
      view_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft',
      published_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 考试时间节点表
  db.run(`
    CREATE TABLE IF NOT EXISTS exam_timelines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_name TEXT NOT NULL,
      exam_period TEXT,
      exam_icon TEXT DEFAULT '📋',
      exam_status TEXT DEFAULT 'upcoming',
      exam_status_label TEXT DEFAULT '即将开始',
      milestones TEXT,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 培训项目表
  db.run(`
    CREATE TABLE IF NOT EXISTS programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      description TEXT,
      icon TEXT,
      gradient TEXT,
      duration TEXT,
      students INTEGER DEFAULT 0,
      price TEXT,
      status TEXT DEFAULT 'open',
      status_label TEXT DEFAULT '报名中',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  saveDatabase()
  
  return db
}

export function saveDatabase() {
  if (db) {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
  }
}

export function query(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  
  if (sql.trim().toUpperCase().startsWith('SELECT')) {
    const results = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(row)
    }
    stmt.free()
    return results
  }
  
  stmt.run()
  stmt.free()
  saveDatabase()
  
  return {
    lastInsertRowid: null,
    changes: db.getRowsModified()
  }
}

export function getOne(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  
  if (stmt.step()) {
    const row = stmt.getAsObject()
    stmt.free()
    return row
  }
  stmt.free()
  return null
}

export function getLastInsertId() {
  const stmt = db.prepare("SELECT last_insert_rowid() as id")
  if (stmt.step()) {
    const row = stmt.getAsObject()
    stmt.free()
    return row.id
  }
  stmt.free()
  return null
}

export function insert(table, data) {
  const keys = Object.keys(data)
  const values = Object.values(data)
  const placeholders = keys.map(() => '?').join(', ')
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`
  
  const stmt = db.prepare(sql)
  stmt.bind(values)
  stmt.run()
  stmt.free()
  
  const idStmt = db.prepare("SELECT last_insert_rowid() as id")
  let lastId = null
  if (idStmt.step()) {
    lastId = idStmt.getAsObject().id
  }
  idStmt.free()
  
  saveDatabase()
  
  return lastId
}

export function update(table, data, where, whereParams = []) {
  const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ')
  const values = [...Object.values(data), ...whereParams]
  const sql = `UPDATE ${table} SET ${setClause} WHERE ${where}`
  const result = query(sql, values)
  return result.changes
}

export function remove(table, where, whereParams = []) {
  const sql = `DELETE FROM ${table} WHERE ${where}`
  const result = query(sql, whereParams)
  return result.changes
}

export default { initDatabase, query, getOne, insert, update, remove, saveDatabase }
