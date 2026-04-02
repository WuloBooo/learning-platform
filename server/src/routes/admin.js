import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { query, getOne, insert, update, remove } from '../config/database.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)
router.use(authorize('admin'))

router.get('/users', async (req, res, next) => {
  try {
    const { search, role, status, page = 1, pageSize = 10 } = req.query
    let sql = 'SELECT id, username, email, avatar, role, status, created_at FROM users WHERE 1=1'
    const params = []
    
    if (search) {
      sql += ' AND (username LIKE ? OR email LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }
    if (role) {
      sql += ' AND role = ?'
      params.push(role)
    }
    if (status) {
      sql += ' AND status = ?'
      params.push(status)
    }
    
    const countSql = sql.replace('SELECT id, username, email, avatar, role, status, created_at', 'SELECT COUNT(*) as total')
    const countResult = getOne(countSql, params)
    const total = countResult?.total || 0
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize))
    
    const users = query(sql, params)
    
    res.json({
      users,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / parseInt(pageSize))
      }
    })
  } catch (error) {
    next(error)
  }
})

router.post('/users', async (req, res, next) => {
  try {
    const { username, email, password, role = 'student', status = 'active' } = req.body
    
    if (!username || !email || !password) {
      return res.status(400).json({ message: '请填写完整的用户信息' })
    }
    
    const existingUser = getOne(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    )
    
    if (existingUser) {
      return res.status(400).json({ message: '用户名或邮箱已存在' })
    }
    
    const hashedPassword = await bcrypt.hash(password, 12)
    
    const userId = insert('users', {
      username,
      email,
      password: hashedPassword,
      role,
      status
    })
    
    res.status(201).json({
      message: '用户创建成功',
      user: {
        id: userId,
        username,
        email,
        role,
        status
      }
    })
  } catch (error) {
    next(error)
  }
})

router.put('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { username, email, role, status, password } = req.body
    
    const user = getOne('SELECT id FROM users WHERE id = ?', [id])
    if (!user) {
      return res.status(404).json({ message: '用户不存在' })
    }
    
    const updateData = {}
    if (username) updateData.username = username
    if (email) updateData.email = email
    if (role) updateData.role = role
    if (status) updateData.status = status
    if (password) {
      updateData.password = await bcrypt.hash(password, 12)
    }
    
    update('users', updateData, 'id = ?', [id])
    
    res.json({ message: '用户更新成功' })
  } catch (error) {
    next(error)
  }
})

router.delete('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: '不能删除自己的账户' })
    }
    
    remove('users', 'id = ?', [id])
    res.json({ message: '用户删除成功' })
  } catch (error) {
    next(error)
  }
})

router.get('/exams', async (req, res, next) => {
  try {
    const { status, page = 1, pageSize = 10 } = req.query
    let sql = 'SELECT * FROM exams WHERE 1=1'
    const params = []
    
    if (status) {
      sql += ' AND status = ?'
      params.push(status)
    }
    
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total')
    const countResult = getOne(countSql, params)
    const total = countResult?.total || 0
    
    sql += ' ORDER BY exam_date DESC LIMIT ? OFFSET ?'
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize))
    
    const exams = query(sql, params)
    
    res.json({
      exams,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / parseInt(pageSize))
      }
    })
  } catch (error) {
    next(error)
  }
})

router.post('/exams', async (req, res, next) => {
  try {
    const { name, exam_type, exam_date, location, description, max_participants } = req.body
    
    if (!name || !exam_type) {
      return res.status(400).json({ message: '请填写考试名称和类型' })
    }
    
    const examId = insert('exams', {
      name,
      exam_type,
      exam_date: exam_date || null,
      location: location || null,
      description: description || null,
      max_participants: max_participants || 100,
      status: 'upcoming'
    })
    
    res.status(201).json({
      message: '考试创建成功',
      exam: { id: examId, name, exam_type }
    })
  } catch (error) {
    next(error)
  }
})

router.put('/exams/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, exam_type, exam_date, location, description, status, max_participants } = req.body
    
    const exam = getOne('SELECT id FROM exams WHERE id = ?', [id])
    if (!exam) {
      return res.status(404).json({ message: '考试不存在' })
    }
    
    const updateData = {}
    if (name) updateData.name = name
    if (exam_type) updateData.exam_type = exam_type
    if (exam_date !== undefined) updateData.exam_date = exam_date
    if (location !== undefined) updateData.location = location
    if (description !== undefined) updateData.description = description
    if (status) updateData.status = status
    if (max_participants) updateData.max_participants = max_participants
    
    update('exams', updateData, 'id = ?', [id])
    
    res.json({ message: '考试更新成功' })
  } catch (error) {
    next(error)
  }
})

router.delete('/exams/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    remove('exams', 'id = ?', [id])
    res.json({ message: '考试删除成功' })
  } catch (error) {
    next(error)
  }
})

router.get('/materials', async (req, res, next) => {
  try {
    const { category, page = 1, pageSize = 10 } = req.query
    let sql = 'SELECT * FROM materials WHERE status = "active"'
    const params = []
    
    if (category) {
      sql += ' AND category = ?'
      params.push(category)
    }
    
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total')
    const countResult = getOne(countSql, params)
    const total = countResult?.total || 0
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize))
    
    const materials = query(sql, params)
    
    res.json({
      materials,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / parseInt(pageSize))
      }
    })
  } catch (error) {
    next(error)
  }
})

router.post('/materials', async (req, res, next) => {
  try {
    const { title, category, description, file_path, file_size, file_type } = req.body
    
    if (!title) {
      return res.status(400).json({ message: '请填写资料标题' })
    }
    
    const materialId = insert('materials', {
      title,
      category: category || null,
      description: description || null,
      file_path: file_path || null,
      file_size: file_size || 0,
      file_type: file_type || null
    })
    
    res.status(201).json({
      message: '资料创建成功',
      material: { id: materialId, title }
    })
  } catch (error) {
    next(error)
  }
})

router.put('/materials/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { title, category, description, status } = req.body
    
    const material = getOne('SELECT id FROM materials WHERE id = ?', [id])
    if (!material) {
      return res.status(404).json({ message: '资料不存在' })
    }
    
    const updateData = {}
    if (title) updateData.title = title
    if (category !== undefined) updateData.category = category
    if (description !== undefined) updateData.description = description
    if (status) updateData.status = status
    
    update('materials', updateData, 'id = ?', [id])
    
    res.json({ message: '资料更新成功' })
  } catch (error) {
    next(error)
  }
})

router.delete('/materials/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    update('materials', { status: 'deleted' }, 'id = ?', [id])
    res.json({ message: '资料删除成功' })
  } catch (error) {
    next(error)
  }
})

router.get('/banners', async (req, res, next) => {
  try {
    const banners = query('SELECT * FROM banners WHERE status = "active" ORDER BY sort_order ASC')
    res.json({ banners })
  } catch (error) {
    next(error)
  }
})

router.post('/banners', async (req, res, next) => {
  try {
    const { title, subtitle, image_url, link_url, sort_order } = req.body
    
    if (!title) {
      return res.status(400).json({ message: '请填写Banner标题' })
    }
    
    const bannerId = insert('banners', {
      title,
      subtitle: subtitle || null,
      image_url: image_url || null,
      link_url: link_url || null,
      sort_order: sort_order || 0
    })
    
    res.status(201).json({
      message: 'Banner创建成功',
      banner: { id: bannerId, title }
    })
  } catch (error) {
    next(error)
  }
})

router.put('/banners/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { title, subtitle, image_url, link_url, sort_order, status } = req.body
    
    const banner = getOne('SELECT id FROM banners WHERE id = ?', [id])
    if (!banner) {
      return res.status(404).json({ message: 'Banner不存在' })
    }
    
    const updateData = {}
    if (title) updateData.title = title
    if (subtitle !== undefined) updateData.subtitle = subtitle
    if (image_url !== undefined) updateData.image_url = image_url
    if (link_url !== undefined) updateData.link_url = link_url
    if (sort_order !== undefined) updateData.sort_order = sort_order
    if (status) updateData.status = status
    
    update('banners', updateData, 'id = ?', [id])
    
    res.json({ message: 'Banner更新成功' })
  } catch (error) {
    next(error)
  }
})

router.delete('/banners/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    update('banners', { status: 'deleted' }, 'id = ?', [id])
    res.json({ message: 'Banner删除成功' })
  } catch (error) {
    next(error)
  }
})

// ==================== 新闻管理 ====================
router.get('/news', async (req, res, next) => {
  try {
    const { type, page = 1, pageSize = 10 } = req.query
    let sql = 'SELECT * FROM news WHERE status = "active"'
    const params = []

    if (type) {
      sql += ' AND type = ?'
      params.push(type)
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total')
    const countResult = getOne(countSql, params)
    const total = countResult?.total || 0

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize))

    const news = query(sql, params)

    res.json({
      news,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / parseInt(pageSize))
      }
    })
  } catch (error) {
    next(error)
  }
})

router.post('/news', async (req, res, next) => {
  try {
    const { title, summary, content, type } = req.body

    if (!title) {
      return res.status(400).json({ message: '请填写新闻标题' })
    }

    const newsId = insert('news', {
      title,
      summary: summary || null,
      content: content || null,
      type: type || 'notice'
    })

    res.status(201).json({
      message: '新闻创建成功',
      news: { id: newsId, title }
    })
  } catch (error) {
    next(error)
  }
})

router.put('/news/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { title, summary, content, type, status } = req.body

    const newsItem = getOne('SELECT id FROM news WHERE id = ?', [id])
    if (!newsItem) {
      return res.status(404).json({ message: '新闻不存在' })
    }

    const updateData = {}
    if (title) updateData.title = title
    if (summary !== undefined) updateData.summary = summary
    if (content !== undefined) updateData.content = content
    if (type) updateData.type = type
    if (status) updateData.status = status

    update('news', updateData, 'id = ?', [id])

    res.json({ message: '新闻更新成功' })
  } catch (error) {
    next(error)
  }
})

router.delete('/news/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    update('news', { status: 'deleted' }, 'id = ?', [id])
    res.json({ message: '新闻删除成功' })
  } catch (error) {
    next(error)
  }
})

// ==================== 时间线管理 ====================
router.get('/timelines', async (req, res, next) => {
  try {
    const timelines = query('SELECT * FROM exam_timelines ORDER BY created_at DESC')
    res.json({ timelines })
  } catch (error) {
    next(error)
  }
})

router.post('/timelines', async (req, res, next) => {
  try {
    const { name, icon, period, status, status_label, milestones } = req.body

    if (!name) {
      return res.status(400).json({ message: '请填写考试名称' })
    }

    const timelineId = insert('exam_timelines', {
      exam_name: name,
      exam_icon: icon || '📝',
      exam_period: period || null,
      exam_status: status || 'upcoming',
      exam_status_label: status_label || '即将开始',
      milestones: milestones ? JSON.stringify(milestones) : null
    })

    res.status(201).json({
      message: '时间线创建成功',
      timeline: { id: timelineId, name }
    })
  } catch (error) {
    next(error)
  }
})

router.put('/timelines/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, icon, period, status, status_label, milestones } = req.body

    const timeline = getOne('SELECT id FROM exam_timelines WHERE id = ?', [id])
    if (!timeline) {
      return res.status(404).json({ message: '时间线不存在' })
    }

    const updateData = {}
    if (name) updateData.exam_name = name
    if (icon !== undefined) updateData.exam_icon = icon
    if (period !== undefined) updateData.exam_period = period
    if (status) updateData.exam_status = status
    if (status_label !== undefined) updateData.exam_status_label = status_label
    if (milestones !== undefined) updateData.milestones = JSON.stringify(milestones)

    update('exam_timelines', updateData, 'id = ?', [id])

    res.json({ message: '时间线更新成功' })
  } catch (error) {
    next(error)
  }
})

router.delete('/timelines/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    remove('exam_timelines', 'id = ?', [id])
    res.json({ message: '时间线删除成功' })
  } catch (error) {
    next(error)
  }
})

// ==================== 培训项目管理 ====================
router.get('/programs', async (req, res, next) => {
  try {
    const { category, page = 1, pageSize = 10 } = req.query
    let sql = 'SELECT * FROM programs WHERE status = "active"'
    const params = []

    if (category) {
      sql += ' AND category = ?'
      params.push(category)
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total')
    const countResult = getOne(countSql, params)
    const total = countResult?.total || 0

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize))

    const programs = query(sql, params)

    res.json({
      programs,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / parseInt(pageSize))
      }
    })
  } catch (error) {
    next(error)
  }
})

router.post('/programs', async (req, res, next) => {
  try {
    const { name, category, description, icon, gradient, duration, students, status, status_label } = req.body

    if (!name) {
      return res.status(400).json({ message: '请填写项目名称' })
    }

    const programId = insert('programs', {
      name,
      category: category || null,
      description: description || null,
      icon: icon || '📚',
      gradient: gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      duration: duration || null,
      students: students || 0,
      status: status || 'open',
      status_label: status_label || '报名中'
    })

    res.status(201).json({
      message: '培训项目创建成功',
      program: { id: programId, name }
    })
  } catch (error) {
    next(error)
  }
})

router.put('/programs/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, category, description, icon, gradient, duration, students, status, status_label } = req.body

    const program = getOne('SELECT id FROM programs WHERE id = ?', [id])
    if (!program) {
      return res.status(404).json({ message: '培训项目不存在' })
    }

    const updateData = {}
    if (name) updateData.name = name
    if (category !== undefined) updateData.category = category
    if (description !== undefined) updateData.description = description
    if (icon !== undefined) updateData.icon = icon
    if (gradient !== undefined) updateData.gradient = gradient
    if (duration !== undefined) updateData.duration = duration
    if (students !== undefined) updateData.students = students
    if (status) updateData.status = status
    if (status_label !== undefined) updateData.status_label = status_label

    update('programs', updateData, 'id = ?', [id])

    res.json({ message: '培训项目更新成功' })
  } catch (error) {
    next(error)
  }
})

router.delete('/programs/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    update('programs', { status: 'deleted' }, 'id = ?', [id])
    res.json({ message: '培训项目删除成功' })
  } catch (error) {
    next(error)
  }
})

// ==================== 统计数据 ====================
router.get('/statistics', async (req, res, next) => {
  try {
    const totalUsers = getOne('SELECT COUNT(*) as count FROM users')?.count || 0
    const totalRegistrations = getOne('SELECT COUNT(*) as count FROM registrations')?.count || 0
    const pendingRegistrations = getOne('SELECT COUNT(*) as count FROM registrations WHERE status = "pending"')?.count || 0
    const approvedRegistrations = getOne('SELECT COUNT(*) as count FROM registrations WHERE status = "approved"')?.count || 0
    const upcomingExams = getOne('SELECT COUNT(*) as count FROM exams WHERE status = "upcoming"')?.count || 0
    const totalMaterials = getOne('SELECT COUNT(*) as count FROM materials WHERE status = "active"')?.count || 0
    const totalDownloads = getOne('SELECT SUM(download_count) as total FROM materials')?.total || 0
    
    const recentRegistrations = query(
      `SELECT r.id, r.name, r.exam_type, r.status, r.created_at, u.username 
       FROM registrations r 
       LEFT JOIN users u ON r.user_id = u.id 
       ORDER BY r.created_at DESC LIMIT 5`
    )
    
    const examTypeStats = query(
      `SELECT exam_type, COUNT(*) as count 
       FROM registrations 
       GROUP BY exam_type 
       ORDER BY count DESC`
    )
    
    res.json({
      overview: {
        totalUsers,
        totalRegistrations,
        pendingRegistrations,
        approvedRegistrations,
        upcomingExams,
        totalMaterials,
        totalDownloads
      },
      recentRegistrations,
      examTypeStats
    })
  } catch (error) {
    next(error)
  }
})

export default router
