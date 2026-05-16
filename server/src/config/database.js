import mysql from 'mysql2/promise'

let pool = null

export async function initDatabase() {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'learning_platform',
    waitForConnections: true,
    connectionLimit: 20,
    charset: 'utf8mb4'
  })

  // 测试连接
  const conn = await pool.getConnection()
  console.log('MySQL 连接成功')
  conn.release()

  // 创建所有表
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(255) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      password TEXT NOT NULL,
      avatar TEXT DEFAULT NULL,
      role VARCHAR(50) DEFAULT 'student',
      status VARCHAR(50) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS registrations (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT,
      name VARCHAR(255) NOT NULL,
      gender VARCHAR(10),
      phone VARCHAR(50) NOT NULL,
      email VARCHAR(255),
      id_card VARCHAR(50),
      education VARCHAR(100),
      school VARCHAR(255),
      major VARCHAR(255),
      goal TEXT,
      referrer VARCHAR(255),
      exam_type VARCHAR(100),
      exam_level VARCHAR(100),
      has_experience INT DEFAULT 0,
      experience TEXT,
      registration_no VARCHAR(255) NOT NULL UNIQUE,
      status VARCHAR(50) DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      token TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS exams (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      exam_type VARCHAR(100) NOT NULL,
      exam_date DATE,
      location VARCHAR(255),
      description TEXT,
      status VARCHAR(50) DEFAULT 'upcoming',
      max_participants INT DEFAULT 100,
      current_participants INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS materials (
      id INT PRIMARY KEY AUTO_INCREMENT,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      description TEXT,
      file_path TEXT,
      file_size INT DEFAULT 0,
      file_type VARCHAR(50),
      download_count INT DEFAULT 0,
      status VARCHAR(50) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS banners (
      id INT PRIMARY KEY AUTO_INCREMENT,
      title VARCHAR(255) NOT NULL,
      subtitle VARCHAR(255),
      image_url TEXT,
      link_url TEXT,
      sort_order INT DEFAULT 0,
      status VARCHAR(50) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS question_categories (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      parent_id INT,
      exam_type VARCHAR(100),
      description TEXT,
      sort_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS questions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      category_id INT,
      exam_type VARCHAR(100),
      question_type VARCHAR(50) DEFAULT 'single',
      title TEXT NOT NULL,
      options TEXT,
      answer TEXT NOT NULL,
      analysis TEXT,
      difficulty VARCHAR(50) DEFAULT 'medium',
      points INT DEFAULT 1,
      tags TEXT,
      status VARCHAR(50) DEFAULT 'published',
      created_by INT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES question_categories(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS exam_papers (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      exam_type VARCHAR(100),
      description TEXT,
      total_score INT DEFAULT 100,
      duration INT DEFAULT 60,
      pass_score INT DEFAULT 60,
      question_count INT DEFAULT 0,
      status VARCHAR(50) DEFAULT 'draft',
      created_by INT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS paper_questions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      paper_id INT NOT NULL,
      question_id INT NOT NULL,
      sort_order INT DEFAULT 0,
      score INT DEFAULT 1,
      FOREIGN KEY (paper_id) REFERENCES exam_papers(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS user_answers (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      question_id INT,
      paper_id INT,
      user_answer TEXT,
      is_correct INT DEFAULT 0,
      time_spent INT DEFAULT 0,
      answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (question_id) REFERENCES questions(id),
      FOREIGN KEY (paper_id) REFERENCES exam_papers(id)
    )`,
    `CREATE TABLE IF NOT EXISTS user_exams (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      paper_id INT,
      registration_id INT,
      total_score DOUBLE DEFAULT 0,
      correct_count INT DEFAULT 0,
      wrong_count INT DEFAULT 0,
      time_spent INT DEFAULT 0,
      status VARCHAR(50) DEFAULT 'ongoing',
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      submitted_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (paper_id) REFERENCES exam_papers(id),
      FOREIGN KEY (registration_id) REFERENCES registrations(id)
    )`,
    `CREATE TABLE IF NOT EXISTS wrong_questions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      question_id INT NOT NULL,
      wrong_count INT DEFAULT 1,
      last_wrong_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      mastered INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    )`,
    `CREATE TABLE IF NOT EXISTS news (
      id INT PRIMARY KEY AUTO_INCREMENT,
      title VARCHAR(255) NOT NULL,
      summary TEXT,
      content LONGTEXT,
      type VARCHAR(50) DEFAULT 'notice',
      cover_image TEXT,
      author VARCHAR(100),
      view_count INT DEFAULT 0,
      status VARCHAR(50) DEFAULT 'draft',
      published_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS exam_timelines (
      id INT PRIMARY KEY AUTO_INCREMENT,
      exam_name VARCHAR(255) NOT NULL,
      exam_period VARCHAR(100),
      exam_icon VARCHAR(50) DEFAULT '📋',
      exam_status VARCHAR(50) DEFAULT 'upcoming',
      exam_status_label VARCHAR(100) DEFAULT '即将开始',
      milestones TEXT,
      sort_order INT DEFAULT 0,
      status VARCHAR(50) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS programs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      description TEXT,
      icon VARCHAR(50),
      gradient VARCHAR(100),
      duration VARCHAR(100),
      students INT DEFAULT 0,
      price VARCHAR(100),
      status VARCHAR(50) DEFAULT 'open',
      status_label VARCHAR(100) DEFAULT '报名中',
      sort_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS exam_rooms (
      id INT PRIMARY KEY AUTO_INCREMENT,
      exam_name VARCHAR(255) NOT NULL,
      room_name VARCHAR(255) NOT NULL,
      room_code VARCHAR(255) NOT NULL UNIQUE,
      file_path TEXT,
      file_name VARCHAR(255),
      file_size INT DEFAULT 0,
      status VARCHAR(50) DEFAULT 'active',
      download_count INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS exam_downloads (
      id INT PRIMARY KEY AUTO_INCREMENT,
      room_id INT NOT NULL,
      ip_address VARCHAR(50),
      downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES exam_rooms(id)
    )`,
    `CREATE TABLE IF NOT EXISTS survey_sessions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) DEFAULT '匿名',
      status VARCHAR(50) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS survey_messages (
      id INT PRIMARY KEY AUTO_INCREMENT,
      session_id INT NOT NULL,
      role VARCHAR(50) NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES survey_sessions(id)
    )`,
    `CREATE TABLE IF NOT EXISTS survey_forms (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      q1 TEXT, q2 TEXT, q3 TEXT, q4 TEXT, q5 TEXT,
      q6 TEXT, q7 TEXT, q8 TEXT, q9 TEXT, q10 TEXT,
      q11 TEXT, q12 TEXT, q13 TEXT, q14 TEXT, q15 TEXT,
      q16 TEXT, q17 TEXT, q18 TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS major_catalog (
      id INT PRIMARY KEY AUTO_INCREMENT,
      major_name VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      allowed_levels VARCHAR(100),
      status VARCHAR(50) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS student_profiles (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      email VARCHAR(255),
      gender VARCHAR(10),
      age INT,
      education VARCHAR(100),
      major VARCHAR(255),
      work_years INT,
      social_security_years INT,
      id_card VARCHAR(50),
      target_level VARCHAR(100),
      organization VARCHAR(255),
      source VARCHAR(100) DEFAULT '网站',
      remark TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      org_id INT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS student_status (
      id INT PRIMARY KEY AUTO_INCREMENT,
      student_id INT NOT NULL,
      stage VARCHAR(100) NOT NULL,
      operator VARCHAR(100),
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES student_profiles(id)
    )`,
    `CREATE TABLE IF NOT EXISTS organizations (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      contact_person VARCHAR(100),
      contact_phone VARCHAR(50),
      address VARCHAR(500),
      cooperation_type VARCHAR(100),
      student_count INT DEFAULT 0,
      status VARCHAR(50) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS certificates (
      id INT PRIMARY KEY AUTO_INCREMENT,
      student_id INT NOT NULL,
      cert_type VARCHAR(100),
      cert_level VARCHAR(100),
      cert_number VARCHAR(100),
      issue_date DATE,
      file_path TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES student_profiles(id)
    )`,
    `CREATE TABLE IF NOT EXISTS org_users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      org_id INT NOT NULL,
      username VARCHAR(255) NOT NULL UNIQUE,
      password TEXT NOT NULL,
      contact_name VARCHAR(100),
      status VARCHAR(50) DEFAULT 'active',
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (org_id) REFERENCES organizations(id)
    )`,
    `CREATE TABLE IF NOT EXISTS exam_plans (
      id INT PRIMARY KEY AUTO_INCREMENT,
      title VARCHAR(255) NOT NULL,
      exam_type VARCHAR(100),
      exam_level VARCHAR(100),
      reg_start DATE,
      reg_end DATE,
      exam_date DATE,
      location VARCHAR(255),
      description TEXT,
      status VARCHAR(50) DEFAULT '报名中',
      created_by VARCHAR(100),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS org_sheets (
      id INT PRIMARY KEY AUTO_INCREMENT,
      org_id INT NOT NULL,
      exam_plan_id INT,
      sheet_name VARCHAR(255) NOT NULL,
      description TEXT,
      created_by VARCHAR(100),
      status VARCHAR(50) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (org_id) REFERENCES organizations(id),
      FOREIGN KEY (exam_plan_id) REFERENCES exam_plans(id)
    )`,
    `CREATE TABLE IF NOT EXISTS org_sheet_students (
      id INT PRIMARY KEY AUTO_INCREMENT,
      sheet_id INT NOT NULL,
      student_id INT,
      name VARCHAR(255),
      phone VARCHAR(50),
      id_card VARCHAR(50),
      job_type VARCHAR(100),
      level VARCHAR(50),
      reg_date DATE,
      exam_date DATE,
      \`condition\` VARCHAR(100),
      major VARCHAR(255),
      extra_data TEXT,
      submitted VARCHAR(50) DEFAULT '',
      audit_result VARCHAR(100) DEFAULT '',
      verified VARCHAR(50) DEFAULT '',
      payment_status VARCHAR(100) DEFAULT '',
      reject_reason VARCHAR(255) DEFAULT '',
      account_opened VARCHAR(50) DEFAULT '',
      remark TEXT,
      is_retest VARCHAR(50) DEFAULT '',
      offline_training VARCHAR(50) DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sheet_id) REFERENCES org_sheets(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS cell_colors (
      id INT PRIMARY KEY AUTO_INCREMENT,
      sheet_id INT NOT NULL,
      row_id INT NOT NULL,
      column_key VARCHAR(100) NOT NULL,
      color VARCHAR(50) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sheet_id) REFERENCES org_sheets(id) ON DELETE CASCADE
    )`
  ]

  for (const sql of tables) {
    await pool.execute(sql)
  }

  console.log('MySQL 数据库表初始化完成')
  return pool
}

export function saveDatabase() {
  // MySQL 自动持久化，无需手动保存
}

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params)

  if (sql.trim().toUpperCase().startsWith('SELECT')) {
    return rows
  }

  return {
    lastInsertRowid: rows.insertId || null,
    changes: rows.affectedRows || 0
  }
}

export async function getOne(sql, params = []) {
  const [rows] = await pool.execute(sql, params)
  return rows.length > 0 ? rows[0] : null
}

export async function insert(table, data) {
  const keys = Object.keys(data)
  const values = Object.values(data)
  const placeholders = keys.map(() => '?').join(', ')
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`

  const [result] = await pool.execute(sql, values)
  return result.insertId
}

export async function update(table, data, where, whereParams = []) {
  const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ')
  const values = [...Object.values(data), ...whereParams]
  const sql = `UPDATE ${table} SET ${setClause} WHERE ${where}`
  const [result] = await pool.execute(sql, values)
  return result.affectedRows
}

export async function remove(table, where, whereParams = []) {
  const sql = `DELETE FROM ${table} WHERE ${where}`
  const [result] = await pool.execute(sql, whereParams)
  return result.affectedRows
}

export function getPool() {
  return pool
}

// 兼容旧代码的 getDB 别名
export function getDB() {
  return pool
}

export default { initDatabase, query, getOne, insert, update, remove, saveDatabase }
