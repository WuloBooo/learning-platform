import { Router } from 'express'
import { query, getOne } from '../config/database.js'

const router = Router()

// 获取轮播图（公开）
router.get('/banners', (req, res, next) => {
  try {
    const banners = query(
      'SELECT * FROM banners WHERE status = "active" ORDER BY sort_order ASC'
    )
    res.json({ banners })
  } catch (error) {
    next(error)
  }
})

// 获取考试动态/新闻（公开）
router.get('/news', (req, res, next) => {
  try {
    const { page = 1, pageSize = 5 } = req.query

    const countResult = getOne('SELECT COUNT(*) as total FROM news WHERE status = "published"')
    const total = countResult?.total || 0

    const news = query(
      `SELECT id, title, summary, type, cover_image, created_at
       FROM news
       WHERE status = "published"
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize)]
    )

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

// 获取新闻详情（公开）
router.get('/news/:id', (req, res, next) => {
  try {
    const { id } = req.params
    const news = getOne(
      'SELECT * FROM news WHERE id = ? AND status = "published"',
      [id]
    )

    if (!news) {
      return res.status(404).json({ message: '新闻不存在' })
    }

    res.json({ news })
  } catch (error) {
    next(error)
  }
})

// 获取时间节点（公开）
router.get('/timelines', (req, res, next) => {
  try {
    const timelines = query(
      `SELECT id, exam_name, exam_period, exam_icon, exam_status, exam_status_label,
              milestones
       FROM exam_timelines
       WHERE status = "active"
       ORDER BY sort_order ASC`
    )

    // 解析 milestones JSON
    const result = timelines.map(t => ({
      ...t,
      milestones: t.milestones ? JSON.parse(t.milestones) : []
    }))

    res.json({ timelines: result })
  } catch (error) {
    next(error)
  }
})

// 获取培训项目（公开）
router.get('/programs', (req, res, next) => {
  try {
    const { category } = req.query

    let sql = 'SELECT * FROM programs WHERE status != "deleted"'
    const params = []

    if (category) {
      sql += ' AND category = ?'
      params.push(category)
    }

    sql += ' ORDER BY sort_order ASC, created_at DESC'

    const programs = query(sql, params)

    res.json({ programs })
  } catch (error) {
    next(error)
  }
})

// 获取学习资料（公开）
router.get('/materials', (req, res, next) => {
  try {
    const { category, page = 1, pageSize = 12 } = req.query

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

// 获取资料详情（公开）
router.get('/materials/:id', (req, res, next) => {
  try {
    const { id } = req.params
    const material = getOne(
      'SELECT * FROM materials WHERE id = ? AND status = "active"',
      [id]
    )

    if (!material) {
      return res.status(404).json({ message: '资料不存在' })
    }

    // 增加下载次数
    query(
      'UPDATE materials SET download_count = download_count + 1 WHERE id = ?',
      [id]
    )

    res.json({ material })
  } catch (error) {
    next(error)
  }
})

export default router
