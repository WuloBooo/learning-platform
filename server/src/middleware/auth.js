import jwt from 'jsonwebtoken'
import { getOne } from '../config/database.js'

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: '未提供认证令牌' })
    }
    
    const token = authHeader.split(' ')[1]
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    const user = await getOne(
      'SELECT id, username, email, avatar, role, status FROM users WHERE id = ?',
      [decoded.userId]
    )
    
    if (!user) {
      return res.status(401).json({ message: '用户不存在' })
    }
    
    if (user.status !== 'active') {
      return res.status(403).json({ message: '账户已被禁用' })
    }
    
    req.user = user
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: '无效的认证令牌' })
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: '认证令牌已过期' })
    }
    next(error)
  }
}

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: '没有权限执行此操作' })
    }
    next()
  }
}
