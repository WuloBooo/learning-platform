import { body, validationResult } from 'express-validator'

export const validateRegister = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('用户名长度必须在3-50个字符之间')
    .matches(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/)
    .withMessage('用户名只能包含字母、数字、下划线和中文'),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6, max: 100 })
    .withMessage('密码长度必须在6-100个字符之间')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage('密码必须包含字母和数字'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('两次输入的密码不一致')
      }
      return true
    }),
  
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: '输入验证失败',
        errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
      })
    }
    next()
  }
]

export const validateLogin = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('请输入用户名'),
  
  body('password')
    .notEmpty()
    .withMessage('请输入密码'),
  
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: '输入验证失败',
        errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
      })
    }
    next()
  }
]

export const validateLearningRecord = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('标题长度必须在1-255个字符之间'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('描述不能超过1000个字符'),
  
  body('studyTime')
    .optional()
    .isInt({ min: 0 })
    .withMessage('学习时长必须是非负整数'),
  
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: '输入验证失败',
        errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
      })
    }
    next()
  }
]

export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj
    
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key]
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key])
      }
    }
    return obj
  }
  
  sanitize(req.body)
  sanitize(req.query)
  sanitize(req.params)
  
  next()
}
