import express from 'express'
import { query, getOne, insert, update, remove } from '../config/database.js'
import * as xlsx from 'xlsx'

const router = express.Router()

// ===== 专业目录接口 =====

// 搜索专业是否在目录中（公开）
router.get('/major/search', (req, res) => {
  try {
    const { keyword } = req.query
    if (!keyword) {
      return res.status(400).json({ message: '请输入专业名称' })
    }
    const results = query(
      'SELECT * FROM major_catalog WHERE major_name LIKE ? AND status = ?',
      [`%${keyword}%`, 'active']
    )
    res.json({ data: results })
  } catch (error) {
    res.status(500).json({ message: '查询失败' })
  }
})

// 获取全部专业目录（公开）
router.get('/major/list', (req, res) => {
  try {
    const results = query('SELECT * FROM major_catalog WHERE status = ? ORDER BY category, major_name', ['active'])
    res.json({ data: results })
  } catch (error) {
    res.status(500).json({ message: '获取失败' })
  }
})

// ===== 学员信息接口 =====

// 提交学员信息（公开）
router.post('/student/submit', (req, res) => {
  try {
    const { name, phone, email, gender, age, education, major, work_years, social_security_years, id_card, target_level, organization, source, remark } = req.body

    if (!name || !phone) {
      return res.status(400).json({ message: '请填写姓名和手机号' })
    }

    const id = insert('student_profiles', {
      name, phone, email, gender, age, education, major,
      work_years, social_security_years, id_card, target_level,
      organization, source: source || '网站', remark, status: 'pending'
    })

    // 初始状态：意向学员
    insert('student_status', {
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

// ===== 管理接口（需 admin 权限）=====
// 后续可添加管理员权限验证

// 管理员：获取学员列表
router.get('/admin/students', (req, res) => {
  try {
    const students = query('SELECT * FROM student_profiles ORDER BY created_at DESC')
    res.json({ data: students })
  } catch (error) {
    res.status(500).json({ message: '获取失败' })
  }
})

// 管理员：获取学员详情+状态记录
router.get('/admin/students/:id', (req, res) => {
  try {
    const student = getOne('SELECT * FROM student_profiles WHERE id = ?', [req.params.id])
    if (!student) return res.status(404).json({ message: '学员不存在' })
    const statusList = query('SELECT * FROM student_status WHERE student_id = ? ORDER BY created_at', [req.params.id])
    res.json({ data: { ...student, statusHistory: statusList } })
  } catch (error) {
    res.status(500).json({ message: '获取失败' })
  }
})

// 管理员：更新学员信息
router.put('/admin/students/:id', (req, res) => {
  try {
    update('student_profiles', req.body, 'id = ?', [req.params.id])
    const updated = getOne('SELECT * FROM student_profiles WHERE id = ?', [req.params.id])
    res.json({ data: updated })
  } catch (error) {
    res.status(500).json({ message: '更新失败' })
  }
})

// 管理员：更新学员状态
router.post('/admin/students/:id/status', (req, res) => {
  try {
    const { stage, operator, note } = req.body
    insert('student_status', {
      student_id: req.params.id,
      stage,
      operator: operator || '管理员',
      note: note || ''
    })
    update('student_profiles', { status: stage }, 'id = ?', [req.params.id])
    res.status(201).json({ message: '状态更新成功' })
  } catch (error) {
    res.status(500).json({ message: '更新失败' })
  }
})

// 管理员：删除学员
router.delete('/admin/students/:id', (req, res) => {
  try {
    remove('student_status', 'student_id = ?', [req.params.id])
    remove('student_profiles', 'id = ?', [req.params.id])
    res.json({ message: '删除成功' })
  } catch (error) {
    res.status(500).json({ message: '删除失败' })
  }
})

// 管理员：添加专业
router.post('/admin/major', (req, res) => {
  try {
    const { major_name, category, allowed_levels } = req.body
    if (!major_name) return res.status(400).json({ message: '请填写专业名称' })
    const id = insert('major_catalog', { major_name, category, allowed_levels })
    res.status(201).json({ data: { id } })
  } catch (error) {
    res.status(500).json({ message: '添加失败' })
  }
})

// 管理员：删除专业
router.delete('/admin/major/:id', (req, res) => {
  try {
    remove('major_catalog', 'id = ?', [req.params.id])
    res.json({ message: '删除成功' })
  } catch (error) {
    res.status(500).json({ message: '删除失败' })
  }
})

// ===== 机构管理接口 =====

// 管理员：获取机构列表（含学员数统计）
router.get('/admin/organizations', (req, res) => {
  try {
    const orgs = query('SELECT * FROM organizations ORDER BY created_at DESC')
    // 统计每个机构的学员数
    for (const org of orgs) {
      const result = getOne('SELECT COUNT(*) as count FROM student_profiles WHERE organization = ?', [org.name])
      org.student_count = result?.count || 0
    }
    res.json({ data: orgs })
  } catch (error) {
    res.status(500).json({ message: '获取失败' })
  }
})

// 管理员：添加机构
router.post('/admin/organizations', (req, res) => {
  try {
    const { name, contact_person, contact_phone, address, cooperation_type, status } = req.body
    if (!name) return res.status(400).json({ message: '请填写机构名称' })
    const id = insert('organizations', { name, contact_person, contact_phone, address, cooperation_type, status: status || 'active' })
    res.status(201).json({ data: { id } })
  } catch (error) {
    res.status(500).json({ message: '添加失败' })
  }
})

// 管理员：编辑机构
router.put('/admin/organizations/:id', (req, res) => {
  try {
    const { name, contact_person, contact_phone, address, cooperation_type, status } = req.body
    update('organizations', { name, contact_person, contact_phone, address, cooperation_type, status }, 'id = ?', [req.params.id])
    res.json({ message: '更新成功' })
  } catch (error) {
    res.status(500).json({ message: '更新失败' })
  }
})

// 管理员：删除机构
router.delete('/admin/organizations/:id', (req, res) => {
  try {
    remove('organizations', 'id = ?', [req.params.id])
    res.json({ message: '删除成功' })
  } catch (error) {
    res.status(500).json({ message: '删除失败' })
  }
})

// ===== 证书管理接口 =====

// 管理员：获取证书列表（关联学员姓名）
router.get('/admin/certificates', (req, res) => {
  try {
    const certs = query(`
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

// 管理员：添加证书
router.post('/admin/certificates', (req, res) => {
  try {
    const { student_id, cert_type, cert_level, cert_number, issue_date, status } = req.body
    if (!student_id) return res.status(400).json({ message: '请选择学员' })
    const id = insert('certificates', { student_id, cert_type, cert_level, cert_number, issue_date, status: status || 'pending' })
    res.status(201).json({ data: { id } })
  } catch (error) {
    res.status(500).json({ message: '添加失败' })
  }
})

// 管理员：编辑证书
router.put('/admin/certificates/:id', (req, res) => {
  try {
    const { cert_type, cert_level, cert_number, issue_date, status } = req.body
    update('certificates', { cert_type, cert_level, cert_number, issue_date, status }, 'id = ?', [req.params.id])
    res.json({ message: '更新成功' })
  } catch (error) {
    res.status(500).json({ message: '更新失败' })
  }
})

// 管理员：删除证书
router.delete('/admin/certificates/:id', (req, res) => {
  try {
    remove('certificates', 'id = ?', [req.params.id])
    res.json({ message: '删除成功' })
  } catch (error) {
    res.status(500).json({ message: '删除失败' })
  }
})

// ===== 批量操作接口 =====

// 批量更新学员状态
router.post('/admin/students/batch-status', (req, res) => {
  try {
    const { ids, stage, note } = req.body
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: '请选择学员' })
    }
    if (!stage) return res.status(400).json({ message: '请选择状态' })
    for (const id of ids) {
      insert('student_status', { student_id: id, stage, operator: '管理员', note: note || '批量操作' })
      update('student_profiles', { status: stage }, 'id = ?', [id])
    }
    res.json({ message: `成功更新 ${ids.length} 条` })
  } catch (error) {
    res.status(500).json({ message: '批量更新失败' })
  }
})

// 批量删除学员
router.post('/admin/students/batch-delete', (req, res) => {
  try {
    const { ids } = req.body
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: '请选择学员' })
    }
    for (const id of ids) {
      remove('student_status', 'student_id = ?', [id])
      remove('student_profiles', 'id = ?', [id])
    }
    res.json({ message: `成功删除 ${ids.length} 条` })
  } catch (error) {
    res.status(500).json({ message: '批量删除失败' })
  }
})

// 导入学员
router.post('/admin/students/import', (req, res) => {
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

        insert('student_profiles', {
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

export default router
