import { Router } from 'express'
import { query, getOne, insert } from '../config/database.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { sanitizeInput } from '../middleware/validator.js'

const router = Router()

router.use(sanitizeInput)

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, gender, phone, email, idCard, education, school, major, goal, referrer, examType, examLevel, hasExperience, experience } = req.body
    
    if (!name || !phone) {
      return res.status(400).json({ message: '请填写必要的报名信息' })
    }
    
    const registrationNo = 'REG' + Date.now().toString().slice(-10)
    
    const registrationId = insert('registrations', {
      user_id: req.user.id,
      name,
      gender: gender || null,
      phone,
      email: email || null,
      id_card: idCard || null,
      education: education || null,
      school: school || null,
      major: major || null,
      goal: goal || null,
      referrer: referrer || null,
      exam_type: examType || null,
      exam_level: examLevel || null,
      has_experience: hasExperience ? 1 : 0,
      experience: experience || null,
      registration_no: registrationNo,
      status: 'pending'
    })
    
    res.status(201).json({
      message: '报名提交成功',
      registration: {
        id: registrationId,
        registrationNo,
        status: 'pending'
      }
    })
  } catch (error) {
    next(error)
  }
})

router.get('/my', authenticate, async (req, res, next) => {
  try {
    const registrations = query(
      `SELECT id, name, gender, phone, email, education, school, major, 
              goal, referrer, registration_no, status, created_at 
       FROM registrations 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [req.user.id]
    )
    
    res.json({ registrations })
  } catch (error) {
    next(error)
  }
})

router.get('/all', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const registrations = query(
      `SELECT r.id, r.name, r.gender, r.phone, r.email, r.education, 
              r.school, r.major, r.goal, r.referrer, r.registration_no, 
              r.status, r.created_at, u.username
       FROM registrations r
       LEFT JOIN users u ON r.user_id = u.id
       ORDER BY r.created_at DESC`
    )
    
    res.json({ registrations })
  } catch (error) {
    next(error)
  }
})

router.put('/:id/status', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params
    const { status } = req.body
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: '无效的状态' })
    }
    
    const registration = getOne('SELECT id FROM registrations WHERE id = ?', [id])
    if (!registration) {
      return res.status(404).json({ message: '报名记录不存在' })
    }
    
    query('UPDATE registrations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id])
    
    res.json({ message: '状态更新成功' })
  } catch (error) {
    next(error)
  }
})

export default router
