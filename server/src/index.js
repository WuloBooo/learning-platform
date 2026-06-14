import dotenv from 'dotenv'
dotenv.config()

import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { initDatabase } from './config/database.js'

// ESM __dirname（用于定位 JupyterLite 静态产物）
const __dirname = path.dirname(fileURLToPath(import.meta.url))
// JupyterLite 纯静态产物目录：默认指向项目根的 jupyterlite/_output
// 可用环境变量 JUPYTER_OUTPUT_DIR 覆盖；目录不存在时不阻断服务启动
const JUPYTER_OUTPUT_DIR = process.env.JUPYTER_OUTPUT_DIR ||
  path.resolve(__dirname, '../../jupyterlite/_output')

import authRoutes from './routes/auth.js'
import userRoutes from './routes/user.js'
import registrationRoutes from './routes/registration.js'
import adminRoutes from './routes/admin.js'
import practiceRoutes from './routes/practice.js'
import publicRoutes from './routes/public.js'
import examRoomRoutes from './routes/examRoom.js'
import surveyRoutes from './routes/survey.js'
import workflowRoutes from './routes/workflow.js'
import orgRoutes from './routes/org.js'
import { errorHandler, notFound } from './middleware/error.js'

const app = express()

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  // 关闭 helmet 全局 COOP —— AC8 要求根路径无 COOP/COEP；
  // COOP 仅应在 /jupyter/ 子路径显式设置（见下方 JupyterLite 中间件）。
  // 关闭根 COOP 不会影响现有 Vue（same-origin COOP 本就不提供跨域隔离能力）。
  crossOriginOpenerPolicy: false
}))

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://8.135.43.209:8080'
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
  max: 1000,
  message: { message: '请求过于频繁，请稍后再试' }
})
app.use('/api/', limiter)

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: '登录尝试次数过多，请15分钟后再试' }
})
app.use('/api/auth/login', authLimiter)
app.use('/api/org/login', authLimiter)

// 大文件上传路由（必须在全局 10kb 限制之前）
app.use('/api/exam-rooms', express.json({ limit: '500mb' }))
app.use('/api/exam-rooms', express.urlencoded({ extended: true, limit: '500mb' }))
app.use('/api/workflow/admin/students/import', express.json({ limit: '50mb' }))
app.use('/api/org/sheets', express.json({ limit: '50mb' }))
app.use('/api/workflow/admin/sheets', express.json({ limit: '50mb' }))

app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true }))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 学信网专业查询代理
import https from 'https'
app.get('/api/chsi/major-search', (req, res) => {
  const { cc, key } = req.query
  if (!cc || !key) return res.status(400).json({ message: '缺少参数' })
  const data = 'cc=' + cc + '&key=' + encodeURIComponent(key) + '&trnd=' + Math.random().toString().slice(2)
  const options = {
    hostname: 'my.chsi.com.cn',
    path: '/archive/zybh/search.action',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Content-Length': Buffer.byteLength(data),
      'Origin': 'https://my.chsi.com.cn',
      'Referer': 'https://my.chsi.com.cn/archive/zybh/show.action',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15'
    }
  }
  const proxyReq = https.request(options, proxyRes => {
    let body = ''
    proxyRes.on('data', c => body += c)
    proxyRes.on('end', () => {
      try {
        const d = JSON.parse(body)
        res.json(d)
      } catch (e) {
        res.status(502).json({ message: '学信网返回数据异常' })
      }
    })
  })
  proxyReq.on('error', () => res.status(502).json({ message: '学信网请求失败' }))
  proxyReq.write(data)
  proxyReq.end()
})

// 公开API（无需登录）
app.use('/api/public', publicRoutes)

app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/registration', registrationRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/practice', practiceRoutes)
app.use('/api/exam-rooms', examRoomRoutes)
app.use('/api/survey', surveyRoutes)
app.use('/api/workflow', workflowRoutes)
app.use('/api/org', orgRoutes)

// ============================================================
// JupyterLite 三级练习站点（纯静态，隔离于现有 API/Vue）
// 一致性契约：子路径 = /jupyter/（前端跳转 / 后端挂载 / output 目录三者一致）
// 必须在 notFound / SPA fallback 之前注册，否则会被 404/SPA 吞掉（T10/边界 2.3.6）
// ============================================================

// 1) COOP/COEP 跨域隔离头 —— 仅 /jupyter/，绝不全站设置（AC7/AC8）
//    Pyodide 的 SharedArrayBuffer 需要这两个头；全站设置会破坏 Vue iframe/第三方资源
app.use('/jupyter', (req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
  next()
})

// 2) 覆盖 helmet CSP —— 仅 /jupyter/（在 helmet 全局挂载之后执行，故会覆盖该路径的 CSP）
//    允许 'wasm-unsafe-eval' 与 cdn.jsdelivr.net（Pyodide/WASM/Worker 必需，T16/AC9）
app.use('/jupyter', (req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://cdn.jsdelivr.net https://files.pythonhosted.org",
      "module-src 'self' blob:"
    ].join('; ')
  )
  next()
})

// 3) 静态托管 —— 目录不存在时降级为提示 JSON，避免阻断服务启动
if (JUPYTER_OUTPUT_DIR && fs.existsSync(JUPYTER_OUTPUT_DIR)) {
  app.use('/jupyter', express.static(JUPYTER_OUTPUT_DIR, {
    index: ['index.html'],
    setHeaders: (res, filePath) => {
      // .wasm / .wasm.gz 需正确 MIME，避免 Pyodide 加载失败
      if (filePath.endsWith('.wasm')) res.setHeader('Content-Type', 'application/wasm')
    }
  }))
  console.log(`📦 JupyterLite 站点挂载: /jupyter/ -> ${JUPYTER_OUTPUT_DIR}`)
} else {
  console.warn(`⚠️  JupyterLite 产物目录不存在: ${JUPYTER_OUTPUT_DIR}（/jupyter 暂不可用，请先运行 build.sh）`)
  app.use('/jupyter', (req, res) => {
    res.status(503).json({
      message: 'JupyterLite 站点尚未构建。请在服务器执行 jupyterlite-training/build.sh 后重启服务。'
    })
  })
}

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
