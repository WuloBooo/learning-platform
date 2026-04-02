import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { query, getOne, insert } from '../config/database.js'
import { authenticate } from '../middleware/auth.js'
import { validateRegister, validateLogin, sanitizeInput } from '../middleware/validator.js'

const router = Router()

router.use(sanitizeInput)

router.post('/register', validateRegister, async (req, res, next) => {
  try {
    const { username, email, password } = req.body
    
    const existingUser = await getOne(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    )
    
    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.username === username ? '用户名已存在' : '邮箱已被注册' 
      })
    }
    
    const hashedPassword = await bcrypt.hash(password, 12)
    
    const userId = await insert('users', {
      username,
      email,
      password: hashedPassword,
      role: 'student',
      status: 'active'
    })
    
    const token = jwt.sign(
      { userId, username, role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )
    
    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: userId,
        username,
        email,
        avatar: null,
        role: 'student'
      }
    })
  } catch (error) {
    next(error)
  }
})

router.post('/login', validateLogin, async (req, res, next) => {
  try {
    const { username, password } = req.body
    
    const user = await getOne(
      'SELECT id, username, email, password, avatar, role, status FROM users WHERE username = ? OR email = ?',
      [username, username]
    )
    
    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' })
    }
    
    if (user.status !== 'active') {
      return res.status(403).json({ message: '账户已被禁用，请联系管理员' })
    }
    
    const isMatch = await bcrypt.compare(password, user.password)
    
    if (!isMatch) {
      return res.status(401).json({ message: '用户名或密码错误' })
    }
    
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )
    
    await query(
      "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, datetime('now', '+7 days'))",
      [user.id, uuidv4()]
    )
    
    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role
      }
    })
  } catch (error) {
    next(error)
  }
})

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await query('DELETE FROM refresh_tokens WHERE user_id = ?', [req.user.id])
    res.json({ message: '退出成功' })
  } catch (error) {
    next(error)
  }
})

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user })
})

export default router
