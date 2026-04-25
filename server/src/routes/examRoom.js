import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { query, getOne, insert, update, remove } from '../config/database.js'
import { authenticate, authorize } from '../middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = express.Router()

const uploadDir = join(__dirname, '..', '..', 'uploads', 'exam_rooms')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname) || ''}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }
})

// 将文件夹临时文件打包成 zip
const folderStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = join(uploadDir, 'temp', `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
    fs.mkdirSync(tempDir, { recursive: true })
    cb(null, tempDir)
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname)
  }
})

const folderUpload = multer({
  storage: folderStorage,
  limits: { fileSize: 500 * 1024 * 1024 }
})

// ===== 公开接口：学生下载 =====
router.get('/download', async (req, res, next) => {
  try {
    const { code } = req.query
    if (!code) {
      return res.status(400).json({ message: '请输入识别码' })
    }

    const room = getOne('SELECT * FROM exam_rooms WHERE room_code = ? AND status = ?', [code, 'active'])
    if (!room) {
      return res.status(404).json({ message: '识别码无效或考场已关闭' })
    }

    if (!room.file_path || !fs.existsSync(room.file_path)) {
      return res.status(404).json({ message: '题目文件未上传' })
    }

    const forwarded = req.headers['x-forwarded-for']
    const realIp = req.headers['x-real-ip']
    const ipAddress = (forwarded ? forwarded.split(',')[0].trim() : null) || realIp || req.socket.remoteAddress

    insert('exam_downloads', {
      room_id: room.id,
      ip_address: ipAddress
    })

    update('exam_rooms', { download_count: room.download_count + 1 }, 'id = ?', [room.id])

    res.download(room.file_path, room.file_name || 'exam.zip')
  } catch (error) {
    next(error)
  }
})

// ===== 管理接口 =====
router.use(authenticate)
router.use(authorize('admin'))

router.get('/', async (req, res, next) => {
  try {
    const rooms = query('SELECT * FROM exam_rooms ORDER BY created_at DESC')
    res.json({ data: rooms })
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const { exam_name, room_name, room_code } = req.body
    if (!exam_name || !room_name || !room_code) {
      return res.status(400).json({ message: '请填写完整信息' })
    }
    if (!/^\d+$/.test(room_code)) {
      return res.status(400).json({ message: '识别码必须为纯数字' })
    }

    const existing = getOne('SELECT id FROM exam_rooms WHERE room_code = ?', [room_code])
    if (existing) {
      return res.status(400).json({ message: '识别码已存在' })
    }

    const id = insert('exam_rooms', { exam_name, room_name, room_code })
    const room = getOne('SELECT * FROM exam_rooms WHERE id = ?', [id])
    res.status(201).json({ data: room })
  } catch (error) {
    next(error)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { exam_name, room_name, room_code, status } = req.body

    const room = getOne('SELECT * FROM exam_rooms WHERE id = ?', [id])
    if (!room) {
      return res.status(404).json({ message: '考场不存在' })
    }

    if (room_code && room_code !== room.room_code) {
      if (!/^\d+$/.test(room_code)) {
        return res.status(400).json({ message: '识别码必须为纯数字' })
      }
      const existing = getOne('SELECT id FROM exam_rooms WHERE room_code = ? AND id != ?', [room_code, id])
      if (existing) {
        return res.status(400).json({ message: '识别码已存在' })
      }
    }

    const data = {}
    if (exam_name) data.exam_name = exam_name
    if (room_name) data.room_name = room_name
    if (room_code) data.room_code = room_code
    if (status) data.status = status

    update('exam_rooms', data, 'id = ?', [id])
    const updated = getOne('SELECT * FROM exam_rooms WHERE id = ?', [id])
    res.json({ data: updated })
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const room = getOne('SELECT * FROM exam_rooms WHERE id = ?', [id])
    if (!room) {
      return res.status(404).json({ message: '考场不存在' })
    }

    if (room.file_path && fs.existsSync(room.file_path)) {
      fs.unlinkSync(room.file_path)
    }

    remove('exam_downloads', 'room_id = ?', [id])
    remove('exam_rooms', 'id = ?', [id])
    res.json({ message: '删除成功' })
  } catch (error) {
    next(error)
  }
})

// 上传 zip 文件
router.post('/:id/upload', upload.single('file'), async (req, res, next) => {
  try {
    const { id } = req.params
    const room = getOne('SELECT * FROM exam_rooms WHERE id = ?', [id])
    if (!room) {
      return res.status(404).json({ message: '考场不存在' })
    }

    if (!req.file) {
      return res.status(400).json({ message: '请选择文件' })
    }

    if (room.file_path && fs.existsSync(room.file_path)) {
      fs.unlinkSync(room.file_path)
    }

    update('exam_rooms', {
      file_path: req.file.path,
      file_name: req.file.originalname,
      file_size: req.file.size
    }, 'id = ?', [id])

    const updated = getOne('SELECT * FROM exam_rooms WHERE id = ?', [id])
    res.json({ data: updated })
  } catch (error) {
    next(error)
  }
})

// 上传文件夹（多文件自动打包为 zip）
router.post('/:id/upload-folder', folderUpload.array('files', 500), async (req, res, next) => {
  try {
    const { id } = req.params
    const room = getOne('SELECT * FROM exam_rooms WHERE id = ?', [id])
    if (!room) {
      return res.status(404).json({ message: '考场不存在' })
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: '请选择文件夹' })
    }

    // 找到共同根目录名（取第一个文件的顶级目录名）
    const firstPath = req.files[0].originalname
    const rootFolderName = firstPath.split('/')[0] || firstPath.split('\\')[0] || 'exam'

    // 创建 zip 文件
    const zipFileName = `${rootFolderName}.zip`
    const zipPath = join(uploadDir, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.zip`)

    // 使用 archiver 打包
    const archiver = (await import('archiver')).default
    const output = fs.createWriteStream(zipPath)
    const archive = archiver('zip', { zlib: { level: 9 }, forceUTC: true })
    archive.on('warning', (err) => { if (err.code !== 'ENOENT') console.error(err) })

    await new Promise((resolve, reject) => {
      output.on('close', resolve)
      archive.on('error', reject)
      archive.pipe(output)

      for (const file of req.files) {
        // originalname 包含相对路径（如 "文件夹/子文件.txt"）
        const relativePath = file.originalname
        if (file.size > 0 && !relativePath.endsWith('/')) {
          archive.file(file.path, { name: relativePath })
        }
      }

      archive.finalize()
    })

    // 删除旧的 zip 文件
    if (room.file_path && fs.existsSync(room.file_path)) {
      fs.unlinkSync(room.file_path)
    }

    // 删除临时文件夹
    const tempDir = req.files[0].destination
    fs.rmSync(tempDir, { recursive: true, force: true })

    const zipSize = fs.statSync(zipPath).size

    update('exam_rooms', {
      file_path: zipPath,
      file_name: zipFileName,
      file_size: zipSize
    }, 'id = ?', [id])

    const updated = getOne('SELECT * FROM exam_rooms WHERE id = ?', [id])
    res.json({ data: updated })
  } catch (error) {
    next(error)
  }
})

router.get('/:id/downloads', async (req, res, next) => {
  try {
    const { id } = req.params
    const downloads = query('SELECT * FROM exam_downloads WHERE room_id = ? ORDER BY downloaded_at DESC', [id])
    res.json({ data: downloads })
  } catch (error) {
    next(error)
  }
})

export default router
