import { Router } from 'express'
import { getOne, update } from '../config/database.js'
import { authenticate } from '../middleware/auth.js'
import { sanitizeInput } from '../middleware/validator.js'
import bcrypt from 'bcryptjs'

const router = Router()

router.use(sanitizeInput)

router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const user = await getOne(
      'SELECT id, username, email, avatar, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    )
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' })
    }
    
    res.json({ user })
  } catch (error) {
    next(error)
  }
})

router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const { avatar } = req.body
    
    if (avatar !== undefined) {
      await update('users', { avatar }, 'id = ?', [req.user.id])
    }
    
    const user = await getOne(
      'SELECT id, username, email, avatar, role FROM users WHERE id = ?',
      [req.user.id]
    )
    
    res.json({ message: '更新成功', user })
  } catch (error) {
    next(error)
  }
})

router.put('/password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: '请提供当前密码和新密码' })
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: '新密码长度至少6个字符' })
    }
    
    const user = await getOne('SELECT password FROM users WHERE id = ?', [req.user.id])
    
    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: '当前密码错误' })
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    await update('users', { password: hashedPassword }, 'id = ?', [req.user.id])
    
    res.json({ message: '密码修改成功' })
  } catch (error) {
    next(error)
  }
})

export default router
