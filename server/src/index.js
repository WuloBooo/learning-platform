import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { initDatabase } from './config/database.js'

import authRoutes from './routes/auth.js'
import userRoutes from './routes/user.js'
import registrationRoutes from './routes/registration.js'
import adminRoutes from './routes/admin.js'
import practiceRoutes from './routes/practice.js'
import publicRoutes from './routes/public.js'
import { errorHandler, notFound } from './middleware/error.js'

const app = express()

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174'
]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: '请求过于频繁，请稍后再试' }
})
app.use('/api/', limiter)

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: '登录尝试次数过多，请15分钟后再试' }
})
app.use('/api/auth/login', authLimiter)

app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true }))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 公开API（无需登录）
app.use('/api/public', publicRoutes)

app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/registration', registrationRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/practice', practiceRoutes)

app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 3000

async function startServer() {
  try {
    await initDatabase()
    console.log('✅ 数据库初始化成功')
    
    app.listen(PORT, () => {
      console.log(`🚀 服务器运行在 http://localhost:${PORT}`)
      console.log(`📊 环境: ${process.env.NODE_ENV}`)
    })
  } catch (error) {
    console.error('❌ 启动失败:', error)
    process.exit(1)
  }
}

startServer()
