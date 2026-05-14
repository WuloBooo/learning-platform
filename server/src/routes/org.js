import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query, getOne, insert, update, remove } from '../config/database.js'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'learning_platform_secret'
const JWT_EXPIRES = '7d'

// ===== 机构登录 =====

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ message: '请输入账号和密码' })
    }

    const user = getOne('SELECT * FROM org_users WHERE username = ? AND status = ?', [username, 'active'])
    if (!user) {
      return res.status(401).json({ message: '账号不存在或已禁用' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ message: '密码错误' })
    }

    // 更新最后登录时间
    update('org_users', { last_login: new Date().toISOString() }, 'id = ?', [user.id])

    // 获取机构信息
    const org = getOne('SELECT * FROM organizations WHERE id = ?', [user.org_id])

    const token = jwt.sign(
      { id: user.id, org_id: user.org_id, username: user.username, type: 'org' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    )

    res.json({
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          contact_name: user.contact_name,
          org_id: user.org_id,
          org_name: org?.name || ''
        }
      }
    })
  } catch (error) {
    res.status(500).json({ message: '登录失败' })
  }
})

// ===== 机构身份验证中间件 =====

export function orgAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '请先登录' })
  }

  try {
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET)
    if (decoded.type !== 'org') {
      return res.status(403).json({ message: '无权访问' })
    }
    req.orgUser = decoded
    next()
  } catch (error) {
    return res.status(401).json({ message: '登录已过期，请重新登录' })
  }
}

// ===== 机构端：获取自己的信息 =====

router.get('/me', orgAuth, (req, res) => {
  try {
    const user = getOne('SELECT * FROM org_users WHERE id = ?', [req.orgUser.id])
    if (!user) return res.status(404).json({ message: '账号不存在' })
    const org = getOne('SELECT * FROM organizations WHERE id = ?', [user.org_id])
    res.json({
      data: {
        id: user.id,
        username: user.username,
        contact_name: user.contact_name,
        org_id: user.org_id,
        org_name: org?.name || '',
        status: user.status
      }
    })
  } catch (error) {
    res.status(500).json({ message: '获取失败' })
  }
})

// ===== 机构端：获取自己的数据表 =====

router.get('/sheets', orgAuth, (req, res) => {
  try {
    const sheets = query(
      'SELECT * FROM org_sheets WHERE org_id = ? ORDER BY created_at DESC',
      [req.orgUser.org_id]
    )
    res.json({ data: sheets })
  } catch (error) {
    res.status(500).json({ message: '获取失败' })
  }
})

// ===== 机构端：获取表格中的学员数据（9列） =====

router.get('/sheets/:sheetId/students', orgAuth, (req, res) => {
  try {
    // 验证表格属于该机构
    const sheet = getOne('SELECT * FROM org_sheets WHERE id = ? AND org_id = ?', [req.params.sheetId, req.orgUser.org_id])
    if (!sheet) return res.status(404).json({ message: '表格不存在' })

    const students = query(
      'SELECT * FROM org_sheet_students WHERE sheet_id = ? ORDER BY id',
      [req.params.sheetId]
    )

    // 获取颜色标记
    const colors = query(
      'SELECT * FROM cell_colors WHERE sheet_id = ?',
      [req.params.sheetId]
    )

    res.json({ data: { sheet, students, colors } })
  } catch (error) {
    res.status(500).json({ message: '获取失败' })
  }
})

// ===== 机构端：更新学员行数据 =====

router.put('/sheets/:sheetId/students/:rowId', orgAuth, (req, res) => {
  try {
    const sheet = getOne('SELECT * FROM org_sheets WHERE id = ? AND org_id = ?', [req.params.sheetId, req.orgUser.org_id])
    if (!sheet) return res.status(404).json({ message: '表格不存在' })

    const allowed = ['name', 'phone', 'id_card', 'job_type', 'level', 'reg_date', 'exam_date', 'condition', 'major']
    const data = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key]
    }

    update('org_sheet_students', data, 'id = ? AND sheet_id = ?', [req.params.rowId, req.params.sheetId])
    res.json({ message: '更新成功' })
  } catch (error) {
    res.status(500).json({ message: '更新失败' })
  }
})

// ===== 机构端：新增学员行 =====

router.post('/sheets/:sheetId/students', orgAuth, (req, res) => {
  try {
    const sheet = getOne('SELECT * FROM org_sheets WHERE id = ? AND org_id = ?', [req.params.sheetId, req.orgUser.org_id])
    if (!sheet) return res.status(404).json({ message: '表格不存在' })

    const id = insert('org_sheet_students', {
      sheet_id: req.params.sheetId,
      student_id: req.body.student_id || null,
      name: req.body.name || '',
      phone: req.body.phone || '',
      id_card: req.body.id_card || '',
      job_type: req.body.job_type || '',
      level: req.body.level || '',
      reg_date: req.body.reg_date || null,
      exam_date: req.body.exam_date || null,
      condition: req.body.condition || '',
      major: req.body.major || ''
    })

    res.status(201).json({ data: { id } })
  } catch (error) {
    res.status(500).json({ message: '添加失败' })
  }
})

// ===== 机构端：删除学员行 =====

router.delete('/sheets/:sheetId/students/:rowId', orgAuth, (req, res) => {
  try {
    const sheet = getOne('SELECT * FROM org_sheets WHERE id = ? AND org_id = ?', [req.params.sheetId, req.orgUser.org_id])
    if (!sheet) return res.status(404).json({ message: '表格不存在' })

    remove('org_sheet_students', 'id = ? AND sheet_id = ?', [req.params.rowId, req.params.sheetId])
    res.json({ message: '删除成功' })
  } catch (error) {
    res.status(500).json({ message: '删除失败' })
  }
})

// ===== 机构端：批量保存表格数据（Excel粘贴场景） =====

router.post('/sheets/:sheetId/batch-save', orgAuth, (req, res) => {
  try {
    const sheet = getOne('SELECT * FROM org_sheets WHERE id = ? AND org_id = ?', [req.params.sheetId, req.orgUser.org_id])
    if (!sheet) return res.status(404).json({ message: '表格不存在' })

    const { rows } = req.body
    if (!rows || !Array.isArray(rows)) return res.status(400).json({ message: '无数据' })

    const result = { success: 0, failed: 0 }
    for (const row of rows) {
      try {
        if (row.id) {
          // 更新已有行
          const data = {}
          const allowed = ['name', 'phone', 'id_card', 'job_type', 'level', 'reg_date', 'exam_date', 'condition', 'major']
          for (const key of allowed) {
            if (row[key] !== undefined) data[key] = row[key]
          }
          update('org_sheet_students', data, 'id = ? AND sheet_id = ?', [row.id, req.params.sheetId])
        } else {
          // 新增行
          insert('org_sheet_students', {
            sheet_id: req.params.sheetId,
            student_id: row.student_id || null,
            name: row.name || '',
            phone: row.phone || '',
            id_card: row.id_card || '',
            job_type: row.job_type || '',
            level: row.level || '',
            reg_date: row.reg_date || null,
            exam_date: row.exam_date || null,
            condition: row.condition || '',
            major: row.major || ''
          })
        }
        result.success++
      } catch (e) {
        result.failed++
      }
    }

    res.json(result)
  } catch (error) {
    res.status(500).json({ message: '批量保存失败' })
  }
})

// ===== 机构端：设置单元格颜色 =====

router.post('/sheets/:sheetId/colors', orgAuth, (req, res) => {
  try {
    const sheet = getOne('SELECT * FROM org_sheets WHERE id = ? AND org_id = ?', [req.params.sheetId, req.orgUser.org_id])
    if (!sheet) return res.status(404).json({ message: '表格不存在' })

    const { row_id, column_key, color } = req.body
    if (!row_id || !column_key || !color) return res.status(400).json({ message: '参数不完整' })

    // 先删除旧颜色，再插入新的
    remove('cell_colors', 'sheet_id = ? AND row_id = ? AND column_key = ?', [req.params.sheetId, row_id, column_key])
    insert('cell_colors', { sheet_id: req.params.sheetId, row_id, column_key, color })

    res.json({ message: '设置成功' })
  } catch (error) {
    res.status(500).json({ message: '设置失败' })
  }
})

// ===== 机构端：删除单元格颜色 =====

router.delete('/sheets/:sheetId/colors', orgAuth, (req, res) => {
  try {
    const { row_id, column_key } = req.body
    remove('cell_colors', 'sheet_id = ? AND row_id = ? AND column_key = ?', [req.params.sheetId, row_id, column_key])
    res.json({ message: '删除成功' })
  } catch (error) {
    res.status(500).json({ message: '删除失败' })
  }
})

export default router
