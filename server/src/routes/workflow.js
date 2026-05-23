import express from 'express'
import bcrypt from 'bcryptjs'
import { query, getOne, insert, update, remove, getPool } from '../config/database.js'
import * as xlsx from 'xlsx'

const router = express.Router()

// ===== 专业目录接口 =====

router.get('/major/search', async (req, res) => {
  try {
    const { keyword } = req.query
    if (!keyword) {
      return res.status(400).json({ message: '请输入专业名称' })
    }
    const results = await query(
      'SELECT * FROM major_catalog WHERE major_name LIKE ? AND status = ?',
      [`%${keyword}%`, 'active']
    )
    res.json({ data: results })
  } catch (error) {
    res.status(500).json({ message: '查询失败' })
  }
})

router.get('/major/list', async (req, res) => {
  try {
    const results = await query('SELECT * FROM major_catalog WHERE status = ? ORDER BY category, major_name', ['active'])
    res.json({ data: results })
  } catch (error) {
    res.status(500).json({ message: '获取失败' })
  }
})

// ===== 学员信息接口 =====

router.post('/student/submit', async (req, res) => {
  try {
    const { name, phone, email, gender, age, education, major, work_years, social_security_years, id_card, target_level, organization, source, remark } = req.body

    if (!name || !phone) {
      return res.status(400).json({ message: '请填写姓名和手机号' })
    }

    const id = await insert('student_profiles', {
      name, phone, email, gender, age, education, major,
      work_years, social_security_years, id_card, target_level,
      organization, source: source || '网站', remark, status: 'pending'
    })

    await insert('student_status', {
      student_id: id,
      stage: '意向',
      operator: '系统',
      note: '学员提交信息'
    })

    res.status(201).json({ message: '提交成功', data: { id } })
  } catch (error) {
    res.status(500).json({ message: '提交失败' })
  }
})

// ===== 管理接口 =====

router.get('/admin/students', async (req, res) => {
  try {
    // 手动录入的学员
    const profiles = await query('SELECT * FROM student_profiles ORDER BY created_at DESC')
    const manualStudents = profiles.map(p => ({
      ...p,
      source_type: 'manual',
      org_name: p.organization || '',
      sheet_name: '',
      audit_result: '',
      payment_status: '',
      job_type: '',
      level: p.target_level || '',
    }))

    // 数据表中的学员
    const sheetStudents = await query(
      `SELECT s.name, s.phone, s.id_card, s.major, s.level, s.job_type,
              s.submitted, s.audit_result, s.payment_status, s.account_opened,
              s.verified, s.reg_date, s.exam_date, s.remark,
              o.name as org_name, sh.sheet_name,
              'sheet' as source_type, s.id as sheet_student_id
       FROM org_sheet_students s
       JOIN org_sheets sh ON s.sheet_id = sh.id
       JOIN organizations o ON sh.org_id = o.id
       WHERE s.name IS NOT NULL AND TRIM(s.name) != ''
       ORDER BY s.id DESC`
    )

    res.json({ data: [...manualStudents, ...sheetStudents] })
  } catch (error) {
    res.status(500).json({ message: '获取失败' })
  }
})

router.get('/admin/students/:id', async (req, res) => {
  try {
    const student = await getOne('SELECT * FROM student_profiles WHERE id = ?', [req.params.id])
    if (!student) return res.status(404).json({ message: '学员不存在' })
    const statusList = await query('SELECT * FROM student_status WHERE student_id = ? ORDER BY created_at', [req.params.id])
    res.json({ data: { ...student, statusHistory: statusList } })
  } catch (error) {
    res.status(500).json({ message: '获取失败' })
  }
})

router.put('/admin/students/:id', async (req, res) => {
  try {
    await update('student_profiles', req.body, 'id = ?', [req.params.id])
    const updated = await getOne('SELECT * FROM student_profiles WHERE id = ?', [req.params.id])
    res.json({ data: updated })
  } catch (error) {
    res.status(500).json({ message: '更新失败' })
  }
})

router.post('/admin/students/:id/status', async (req, res) => {
  try {
    const { stage, operator, note } = req.body
    await insert('student_status', {
      student_id: req.params.id,
      stage,
      operator: operator || '管理员',
      note: note || ''
    })
    await update('student_profiles', { status: stage }, 'id = ?', [req.params.id])
    res.status(201).json({ message: '状态更新成功' })
  } catch (error) {
    res.status(500).json({ message: '更新失败' })
  }
})

router.delete('/admin/students/:id', async (req, res) => {
  try {
    await remove('student_status', 'student_id = ?', [req.params.id])
    await remove('student_profiles', 'id = ?', [req.params.id])
    res.json({ message: '删除成功' })
  } catch (error) {
    res.status(500).json({ message: '删除失败' })
  }
})

router.post('/admin/major', async (req, res) => {
  try {
    const { major_name, category, allowed_levels } = req.body
    if (!major_name) return res.status(400).json({ message: '请填写专业名称' })
    const id = await insert('major_catalog', { major_name, category, allowed_levels })
    res.status(201).json({ data: { id } })
  } catch (error) {
    res.status(500).json({ message: '添加失败' })
  }
})

router.delete('/admin/major/:id', async (req, res) => {
  try {
    await remove('major_catalog', 'id = ?', [req.params.id])
    res.json({ message: '删除成功' })
  } catch (error) {
    res.status(500).json({ message: '删除失败' })
  }
})

// ===== 机构管理接口 =====

router.get('/admin/organizations', async (req, res) => {
  try {
    const orgs = await query('SELECT * FROM organizations ORDER BY created_at DESC')
    for (const org of orgs) {
      const result = await getOne('SELECT COUNT(*) as count FROM student_profiles WHERE organization = ?', [org.name])
      org.student_count = result?.count || 0
    }
    res.json({ data: orgs })
  } catch (error) {
    res.status(500).json({ message: '获取失败' })
  }
})

router.post('/admin/organizations', async (req, res) => {
  try {
    const { name, contact_person, contact_phone, address, cooperation_type, status } = req.body
    if (!name) return res.status(400).json({ message: '请填写机构名称' })
    const id = await insert('organizations', { name, contact_person, contact_phone, address, cooperation_type, status: status || 'active' })
    res.status(201).json({ data: { id } })
  } catch (error) {
    res.status(500).json({ message: '添加失败' })
  }
})

router.put('/admin/organizations/:id', async (req, res) => {
  try {
    const { name, contact_person, contact_phone, address, cooperation_type, status } = req.body
    await update('organizations', { name, contact_person, contact_phone, address, cooperation_type, status }, 'id = ?', [req.params.id])
    res.json({ message: '更新成功' })
  } catch (error) {
    res.status(500).json({ message: '更新失败' })
  }
})

router.delete('/admin/organizations/:id', async (req, res) => {
  try {
    await remove('organizations', 'id = ?', [req.params.id])
    res.json({ message: '删除成功' })
  } catch (error) {
    res.status(500).json({ message: '删除失败' })
  }
})

// ===== 证书管理接口 =====

router.get('/admin/certificates', async (req, res) => {
  try {
    const certs = await query(`
      SELECT c.*, sp.name as student_name
      FROM certificates c
      LEFT JOIN student_profiles sp ON c.student_id = sp.id
      ORDER BY c.created_at DESC
    `)
    res.json({ data: certs })
  } catch (error) {
    res.status(500).json({ message: '获取失败' })
  }
})

router.post('/admin/certificates', async (req, res) => {
  try {
    const { student_id, cert_type, cert_level, cert_number, issue_date, status } = req.body
    if (!student_id) return res.status(400).json({ message: '请选择学员' })
    const id = await insert('certificates', { student_id, cert_type, cert_level, cert_number, issue_date, status: status || 'pending' })
    res.status(201).json({ data: { id } })
  } catch (error) {
    res.status(500).json({ message: '添加失败' })
  }
})

router.put('/admin/certificates/:id', async (req, res) => {
  try {
    const { cert_type, cert_level, cert_number, issue_date, status } = req.body
    await update('certificates', { cert_type, cert_level, cert_number, issue_date, status }, 'id = ?', [req.params.id])
    res.json({ message: '更新成功' })
  } catch (error) {
    res.status(500).json({ message: '更新失败' })
  }
})

router.delete('/admin/certificates/:id', async (req, res) => {
  try {
    await remove('certificates', 'id = ?', [req.params.id])
    res.json({ message: '删除成功' })
  } catch (error) {
    res.status(500).json({ message: '删除失败' })
  }
})

// ===== 批量操作接口 =====

router.post('/admin/students/batch-status', async (req, res) => {
  try {
    const { ids, stage, note } = req.body
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: '请选择学员' })
    }
    if (!stage) return res.status(400).json({ message: '请选择状态' })
    for (const id of ids) {
      await insert('student_status', { student_id: id, stage, operator: '管理员', note: note || '批量操作' })
      await update('student_profiles', { status: stage }, 'id = ?', [id])
    }
    res.json({ message: `成功更新 ${ids.length} 条` })
  } catch (error) {
    res.status(500).json({ message: '批量更新失败' })
  }
})

router.post('/admin/students/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: '请选择学员' })
    }
    for (const id of ids) {
      await remove('student_status', 'student_id = ?', [id])
      await remove('student_profiles', 'id = ?', [id])
    }
    res.json({ message: `成功删除 ${ids.length} 条` })
  } catch (error) {
    res.status(500).json({ message: '批量删除失败' })
  }
})

router.post('/admin/students/import', async (req, res) => {
  try {
    const { fileData } = req.body
    if (!fileData) return res.status(400).json({ message: '请上传文件' })

    const buffer = Buffer.from(fileData, 'base64')
    const workbook = xlsx.read(buffer, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = xlsx.utils.sheet_to_json(sheet)

    if (rows.length === 0) return res.status(400).json({ message: '文件中没有数据' })

    const result = { success: 0, failed: 0 }
    for (const row of rows) {
      try {
        const name = row['姓名'] || row['name']
        const phone = String(row['手机号'] || row['phone'] || '')
        if (!name || !phone) { result.failed++; continue }

        await insert('student_profiles', {
          name, phone,
          email: row['邮箱'] || row['email'] || null,
          gender: row['性别'] || row['gender'] || null,
          age: row['年龄'] || row['age'] || null,
          education: row['学历'] || row['education'] || null,
          major: row['专业'] || row['major'] || null,
          work_years: row['工作年限'] || row['work_years'] || null,
          social_security_years: row['社保年限'] || row['social_security_years'] || null,
          id_card: String(row['身份证号'] || row['id_card'] || ''),
          target_level: row['目标等级'] || row['target_level'] || null,
          organization: row['机构'] || row['organization'] || null,
          source: row['来源'] || row['source'] || '导入',
          remark: row['备注'] || row['remark'] || null,
          status: row['状态'] || '意向'
        })
        result.success++
      } catch (e) {
        result.failed++
      }
    }

    res.json(result)
  } catch (error) {
    res.status(500).json({ message: '导入失败：' + error.message })
  }
})

// ===== 机构账号管理接口 =====

router.get('/admin/org-users', async (req, res) => {
  try {
    const users = await query(`
      SELECT ou.*, o.name as org_name
      FROM org_users ou
      LEFT JOIN organizations o ON ou.org_id = o.id
      ORDER BY ou.created_at DESC
    `)
    const safe = users.map(u => ({ ...u, password: undefined }))
    res.json({ data: safe })
  } catch (error) {
    res.status(500).json({ message: '获取失败' })
  }
})

router.post('/admin/org-users', async (req, res) => {
  try {
    const { org_id, username, password, contact_name, status } = req.body
    if (!org_id || !username || !password) {
      return res.status(400).json({ message: '请填写机构、账号和密码' })
    }

    const existing = await getOne('SELECT id FROM org_users WHERE username = ?', [username])
    if (existing) {
      return res.status(400).json({ message: '账号已存在' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const id = await insert('org_users', {
      org_id,
      username,
      password: hashedPassword,
      contact_name: contact_name || '',
      status: status || 'active'
    })

    res.status(201).json({ data: { id } })
  } catch (error) {
    res.status(500).json({ message: '创建失败' })
  }
})

router.put('/admin/org-users/:id', async (req, res) => {
  try {
    const { contact_name, status, password } = req.body
    const data = { contact_name, status }

    if (password && password.trim()) {
      data.password = await bcrypt.hash(password, 10)
    }

    await update('org_users', data, 'id = ?', [req.params.id])
    res.json({ message: '更新成功' })
  } catch (error) {
    res.status(500).json({ message: '更新失败' })
  }
})

router.delete('/admin/org-users/:id', async (req, res) => {
  try {
    await remove('org_users', 'id = ?', [req.params.id])
    res.json({ message: '删除成功' })
  } catch (error) {
    res.status(500).json({ message: '删除失败' })
  }
})

// ===== 考试计划管理接口 =====

router.get('/admin/exam-plans', async (req, res) => {
  try {
    const plans = await query('SELECT * FROM exam_plans ORDER BY exam_date DESC')
    res.json({ data: plans })
  } catch (error) {
    res.status(500).json({ message: '获取失败' })
  }
})

router.post('/admin/exam-plans', async (req, res) => {
  try {
    const { title, exam_type, exam_level, reg_start, reg_end, exam_date, location, description, status, created_by } = req.body
    if (!title) return res.status(400).json({ message: '请填写考试计划名称' })

    const id = await insert('exam_plans', {
      title, exam_type, exam_level, reg_start, reg_end, exam_date,
      location, description, status: status || '报名中', created_by: created_by || '管理员'
    })

    res.status(201).json({ data: { id } })
  } catch (error) {
    res.status(500).json({ message: '创建失败' })
  }
})

router.put('/admin/exam-plans/:id', async (req, res) => {
  try {
    const { title, exam_type, exam_level, reg_start, reg_end, exam_date, location, description, status } = req.body
    await update('exam_plans', { title, exam_type, exam_level, reg_start, reg_end, exam_date, location, description, status }, 'id = ?', [req.params.id])
    res.json({ message: '更新成功' })
  } catch (error) {
    res.status(500).json({ message: '更新失败' })
  }
})

router.delete('/admin/exam-plans/:id', async (req, res) => {
  try {
    await remove('exam_plans', 'id = ?', [req.params.id])
    res.json({ message: '删除成功' })
  } catch (error) {
    res.status(500).json({ message: '删除失败' })
  }
})

// ===== 数据表管理接口 =====

router.get('/admin/sheets', async (req, res) => {
  try {
    const { org_id, exam_plan_id } = req.query
    let sql = `
      SELECT s.*, o.name as org_name, ep.title as exam_plan_name
      FROM org_sheets s
      LEFT JOIN organizations o ON s.org_id = o.id
      LEFT JOIN exam_plans ep ON s.exam_plan_id = ep.id
      WHERE 1=1
    `
    const params = []
    if (org_id) {
      sql += ' AND s.org_id = ?'
      params.push(org_id)
    }
    if (exam_plan_id) {
      sql += ' AND s.exam_plan_id = ?'
      params.push(exam_plan_id)
    }
    sql += ' ORDER BY s.created_at DESC'

    const sheets = await query(sql, params)
    for (const sheet of sheets) {
      const result = await getOne("SELECT COUNT(*) as count FROM org_sheet_students WHERE sheet_id = ? AND name IS NOT NULL AND TRIM(name) != ''", [sheet.id])
      sheet.student_count = result?.count || 0
    }

    res.json({ data: sheets })
  } catch (error) {
    res.status(500).json({ message: '获取失败' })
  }
})

router.post('/admin/sheets', async (req, res) => {
  try {
    const { org_id, exam_plan_id, sheet_name, description, created_by } = req.body
    if (!org_id || !sheet_name) return res.status(400).json({ message: '请选择机构和填写表名' })

    const id = await insert('org_sheets', {
      org_id,
      exam_plan_id: exam_plan_id || null,
      sheet_name,
      description: description || '',
      created_by: created_by || '管理员',
      status: 'active'
    })

    res.status(201).json({ data: { id } })
  } catch (error) {
    res.status(500).json({ message: '创建失败' })
  }
})

router.post('/admin/sheets/batch-create', async (req, res) => {
  try {
    const { exam_plan_id, sheet_name, description, created_by } = req.body
    if (!sheet_name) return res.status(400).json({ message: '请填写表名' })

    const orgs = await query('SELECT id FROM organizations WHERE status = ?', ['active'])
    const created = []

    for (const org of orgs) {
      const id = await insert('org_sheets', {
        org_id: org.id,
        exam_plan_id: exam_plan_id || null,
        sheet_name,
        description: description || '',
        created_by: created_by || '管理员',
        status: 'active'
      })
      created.push({ org_id: org.id, sheet_id: id })
    }

    res.json({ message: `成功为 ${created.length} 个机构创建数据表`, data: created })
  } catch (error) {
    res.status(500).json({ message: '批量创建失败' })
  }
})

router.put('/admin/sheets/:id', async (req, res) => {
  try {
    const { sheet_name, description, status } = req.body
    await update('org_sheets', { sheet_name, description, status }, 'id = ?', [req.params.id])
    res.json({ message: '更新成功' })
  } catch (error) {
    res.status(500).json({ message: '更新失败' })
  }
})

router.delete('/admin/sheets/:id', async (req, res) => {
  try {
    await remove('cell_colors', 'sheet_id = ?', [req.params.id])
    await remove('org_sheet_students', 'sheet_id = ?', [req.params.id])
    await remove('org_sheets', 'id = ?', [req.params.id])
    res.json({ message: '删除成功' })
  } catch (error) {
    res.status(500).json({ message: '删除失败' })
  }
})

router.get('/admin/sheets/:sheetId/students', async (req, res) => {
  try {
    const students = await query('SELECT * FROM org_sheet_students WHERE sheet_id = ? ORDER BY id', [req.params.sheetId])
    const colors = await query('SELECT * FROM cell_colors WHERE sheet_id = ?', [req.params.sheetId])
    res.json({ data: { students, colors } })
  } catch (error) {
    res.status(500).json({ message: '获取失败' })
  }
})

router.post('/admin/sheets/:sheetId/students', async (req, res) => {
  try {
    const id = await insert('org_sheet_students', {
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
      major: req.body.major || '',
      submitted: req.body.submitted || '',
      audit_result: req.body.audit_result || '',
      verified: req.body.verified || '',
      payment_status: req.body.payment_status || '',
      reject_reason: req.body.reject_reason || '',
      account_opened: req.body.account_opened || '',
      remark: req.body.remark || '',
      is_retest: req.body.is_retest || '',
      offline_training: req.body.offline_training || ''
    })
    res.status(201).json({ data: { id } })
  } catch (error) {
    res.status(500).json({ message: '添加失败' })
  }
})

router.put('/admin/sheets/:sheetId/students/:rowId', async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'id_card', 'job_type', 'level', 'reg_date', 'exam_date', 'condition', 'major', 'extra_data', 'submitted', 'audit_result', 'verified', 'payment_status', 'reject_reason', 'account_opened', 'remark', 'is_retest', 'offline_training']
    const data = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key]
    }
    await update('org_sheet_students', data, 'id = ? AND sheet_id = ?', [req.params.rowId, req.params.sheetId])
    res.json({ message: '更新成功' })
  } catch (error) {
    res.status(500).json({ message: '更新失败' })
  }
})

// 管理员：批量创建空行（MySQL版）
router.post('/admin/sheets/:sheetId/batch-create-empty', async (req, res) => {
  try {
    const count = Math.min(parseInt(req.body.count) || 50, 1000)
    const pool = getPool()
    const ids = []

    for (let i = 0; i < count; i++) {
      const [result] = await pool.execute(
        `INSERT INTO org_sheet_students (sheet_id, name, phone, id_card, job_type, level, reg_date, exam_date, \`condition\`, major, submitted, audit_result, verified, payment_status, reject_reason, account_opened, remark, is_retest, offline_training) VALUES (?, '', '', '', '', '', NULL, NULL, '', '', '', '', '', '', '', '', '', '', '')`,
        [req.params.sheetId]
      )
      ids.push(result.insertId)
    }

    res.json({ data: { ids, count: ids.length } })
  } catch (error) {
    res.status(500).json({ message: '批量创建失败' })
  }
})

router.delete('/admin/sheets/:sheetId/students/:rowId', async (req, res) => {
  try {
    await remove('org_sheet_students', 'id = ? AND sheet_id = ?', [req.params.rowId, req.params.sheetId])
    res.json({ message: '移除成功' })
  } catch (error) {
    res.status(500).json({ message: '移除失败' })
  }
})

export default router
