import { Router } from 'express'
import { query, getOne, insert, update, remove } from '../config/database.js'
import { authenticate } from '../middleware/auth.js'
import * as xlsx from 'xlsx'
import { getAIExplanation, isAIServiceAvailable } from '../services/ai.js'

const router = Router()

router.get('/public/exams', async (req, res, next) => {
  try {
    const { type, status, location } = req.query
    let sql = 'SELECT * FROM exams WHERE 1=1'
    const params = []
    
    if (type && type !== 'all') {
      sql += ' AND exam_type = ?'
      params.push(type)
    }
    if (status && status !== 'all') {
      sql += ' AND status = ?'
      params.push(status)
    }
    if (location && location !== 'all') {
      if (location === 'online') {
        sql += " AND location LIKE '%线上%'"
      } else {
        sql += " AND (location NOT LIKE '%线上%' OR location IS NULL)"
      }
    }
    
    sql += ' ORDER BY exam_date ASC'
    
    const exams = query(sql, params)
    
    const formattedExams = exams.map(exam => {
      const date = exam.exam_date ? new Date(exam.exam_date) : null
      return {
        id: exam.id,
        name: exam.name,
        type: exam.exam_type,
        month: date ? `${date.getMonth() + 1}月` : '-',
        day: date ? date.getDate().toString() : '-',
        time: '09:00-11:30',
        location: exam.location || '待定',
        deadline: '详见公告',
        status: exam.status,
        statusLabel: exam.status === 'registering' ? '报名中' : 
                     exam.status === 'upcoming' ? '即将开始' : 
                     exam.status === 'ongoing' ? '进行中' : '已结束',
        outline: exam.description || '暂无详细说明',
        notes: ['请携带身份证原件和准考证参加考试', '考试前30分钟开始入场', '禁止携带手机等电子设备进入考场'],
        contactPhone: '0755-12345678',
        contactEmail: 'exam@example.com',
        subscribed: false
      }
    })
    
    res.json({ exams: formattedExams })
  } catch (error) {
    next(error)
  }
})

router.use(authenticate)

router.get('/categories', async (req, res, next) => {
  try {
    const { exam_type } = req.query
    let sql = 'SELECT * FROM question_categories WHERE 1=1'
    const params = []
    
    if (exam_type) {
      sql += ' AND (exam_type = ? OR exam_type IS NULL)'
      params.push(exam_type)
    }
    
    sql += ' ORDER BY sort_order ASC'
    
    const categories = query(sql, params)
    res.json({ categories })
  } catch (error) {
    next(error)
  }
})

router.post('/categories', async (req, res, next) => {
  try {
    const { name, parent_id, exam_type, description, sort_order } = req.body
    
    if (!name) {
      return res.status(400).json({ message: '分类名称不能为空' })
    }
    
    const categoryId = insert('question_categories', {
      name,
      parent_id: parent_id || null,
      exam_type: exam_type || null,
      description: description || null,
      sort_order: sort_order || 0
    })
    
    res.status(201).json({
      message: '分类创建成功',
      category: { id: categoryId, name }
    })
  } catch (error) {
    next(error)
  }
})

router.get('/questions', async (req, res, next) => {
  try {
    const { category_id, exam_type, difficulty, question_type, search, page = 1, pageSize = 20 } = req.query
    let sql = `SELECT q.*, qc.name as category_name 
               FROM questions q 
               LEFT JOIN question_categories qc ON q.category_id = qc.id 
               WHERE q.status = 'published'`
    const params = []
    
    if (category_id) {
      sql += ' AND q.category_id = ?'
      params.push(category_id)
    }
    if (exam_type) {
      sql += ' AND q.exam_type = ?'
      params.push(exam_type)
    }
    if (difficulty) {
      sql += ' AND q.difficulty = ?'
      params.push(difficulty)
    }
    if (question_type) {
      sql += ' AND q.question_type = ?'
      params.push(question_type)
    }
    if (search) {
      sql += ' AND (q.title LIKE ? OR q.analysis LIKE ?)'
      const searchPattern = `%${search}%`
      params.push(searchPattern, searchPattern)
    }
    
    const countSql = sql.replace('SELECT q.*, qc.name as category_name', 'SELECT COUNT(*) as total')
    const countResult = getOne(countSql, params)
    const total = countResult?.total || 0
    
    sql += ' ORDER BY q.created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize))
    
    const questions = query(sql, params)
    
    res.json({
      questions,
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

router.get('/questions/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const question = getOne(
      `SELECT q.*, qc.name as category_name 
       FROM questions q 
       LEFT JOIN question_categories qc ON q.category_id = qc.id 
       WHERE q.id = ?`,
      [id]
    )
    
    if (!question) {
      return res.status(404).json({ message: '题目不存在' })
    }
    
    res.json({ question })
  } catch (error) {
    next(error)
  }
})

router.post('/questions', async (req, res, next) => {
  try {
    const { 
      category_id, exam_type, question_type, title, options, 
      answer, analysis, difficulty, points, tags 
    } = req.body
    
    if (!title || !answer) {
      return res.status(400).json({ message: '题目内容和答案不能为空' })
    }
    
    const questionId = insert('questions', {
      category_id: category_id || null,
      exam_type: exam_type || null,
      question_type: question_type || 'single',
      title,
      options: options ? JSON.stringify(options) : null,
      answer,
      analysis: analysis || null,
      difficulty: difficulty || 'medium',
      points: points || 1,
      tags: tags ? JSON.stringify(tags) : null,
      status: 'published',
      created_by: req.user.id
    })
    
    res.status(201).json({
      message: '题目创建成功',
      question: { id: questionId, title }
    })
  } catch (error) {
    next(error)
  }
})

router.put('/questions/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { 
      category_id, exam_type, question_type, title, options, 
      answer, analysis, difficulty, points, tags, status 
    } = req.body
    
    const question = getOne('SELECT id FROM questions WHERE id = ?', [id])
    if (!question) {
      return res.status(404).json({ message: '题目不存在' })
    }
    
    const updateData = {}
    if (category_id !== undefined) updateData.category_id = category_id
    if (exam_type !== undefined) updateData.exam_type = exam_type
    if (question_type) updateData.question_type = question_type
    if (title) updateData.title = title
    if (options !== undefined) updateData.options = JSON.stringify(options)
    if (answer) updateData.answer = answer
    if (analysis !== undefined) updateData.analysis = analysis
    if (difficulty) updateData.difficulty = difficulty
    if (points !== undefined) updateData.points = points
    if (tags !== undefined) updateData.tags = JSON.stringify(tags)
    if (status) updateData.status = status
    
    update('questions', updateData, 'id = ?', [id])
    
    res.json({ message: '题目更新成功' })
  } catch (error) {
    next(error)
  }
})

router.delete('/questions/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    update('questions', { status: 'archived' }, 'id = ?', [id])
    res.json({ message: '题目删除成功' })
  } catch (error) {
    next(error)
  }
})

router.get('/papers', async (req, res, next) => {
  try {
    const { exam_type, status, page = 1, pageSize = 10 } = req.query
    let sql = 'SELECT * FROM exam_papers WHERE 1=1'
    const params = []
    
    if (exam_type) {
      sql += ' AND exam_type = ?'
      params.push(exam_type)
    }
    if (status) {
      sql += ' AND status = ?'
      params.push(status)
    }
    
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total')
    const countResult = getOne(countSql, params)
    const total = countResult?.total || 0
    
    sql += ' ORDER by created_at DESC limit ? offset ?'
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize))
    
    const papers = query(sql, params)
    
    res.json({
      papers,
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

router.get('/papers/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const paper = getOne('SELECT * FROM exam_papers WHERE id = ?', [id])
    
    if (!paper) {
      return res.status(404).json({ message: '试卷不存在' })
    }
    
    const questions = query(
      `SELECT q.*, pq.score as paper_score, pq.sort_order
       FROM paper_questions pq
       JOIN questions q ON pq.question_id = q.id
       WHERE pq.paper_id = ?
       ORDER BY pq.sort_order ASC`,
      [id]
    )
    
    res.json({ paper, questions })
  } catch (error) {
    next(error)
  }
})

router.post('/papers', async (req, res, next) => {
  try {
    const { name, exam_type, description, total_score, duration, pass_score, question_ids } = req.body
    
    if (!name) {
      return res.status(400).json({ message: '试卷名称不能为空' })
    }
    
    const paperId = insert('exam_papers', {
      name,
      exam_type: exam_type || null,
      description: description || null,
      total_score: total_score || 100,
      duration: duration || 60,
      pass_score: pass_score || 60,
      question_count: question_ids?.length || 0,
      status: 'draft',
      created_by: req.user.id
    })
    
    if (question_ids && question_ids.length > 0) {
      question_ids.forEach((qId, index) => {
        insert('paper_questions', {
          paper_id: paperId,
          question_id: qId,
          sort_order: index + 1,
          score: 1
        })
      })
    }
    
    res.status(201).json({
      message: '试卷创建成功',
      paper: { id: paperId, name }
    })
  } catch (error) {
    next(error)
  }
})

router.put('/papers/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, exam_type, description, total_score, duration, pass_score, status, question_ids } = req.body
    
    const paper = getOne('SELECT id FROM exam_papers WHERE id = ?', [id])
    if (!paper) {
      return res.status(404).json({ message: '试卷不存在' })
    }
    
    const updateData = {}
    if (name) updateData.name = name
    if (exam_type !== undefined) updateData.exam_type = exam_type
    if (description !== undefined) updateData.description = description
    if (total_score !== undefined) updateData.total_score = total_score
    if (duration !== undefined) updateData.duration = duration
    if (pass_score !== undefined) updateData.pass_score = pass_score
    if (status) updateData.status = status
    
    if (question_ids) {
      updateData.question_count = question_ids.length
    }
    
    update('exam_papers', updateData, 'id = ?', [id])
    
    if (question_ids) {
      remove('paper_questions', 'paper_id = ?', [id])
      question_ids.forEach((qId, index) => {
        insert('paper_questions', {
          paper_id: id,
          question_id: qId,
          sort_order: index + 1,
          score: 1
        })
      })
    }
    
    res.json({ message: '试卷更新成功' })
  } catch (error) {
    next(error)
  }
})

router.delete('/papers/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    update('exam_papers', { status: 'archived' }, 'id = ?', [id])
    res.json({ message: '试卷删除成功' })
  } catch (error) {
    next(error)
  }
})

router.post('/papers/:id/questions', async (req, res, next) => {
  try {
    const { id } = req.params
    const { question_id, score = 2 } = req.body
    
    if (!question_id) {
      return res.status(400).json({ message: '题目ID不能为空' })
    }
    
    const paper = getOne('SELECT id FROM exam_papers WHERE id = ?', [id])
    if (!paper) {
      return res.status(404).json({ message: '试卷不存在' })
    }
    
    const question = getOne('SELECT id FROM questions WHERE id = ?', [question_id])
    if (!question) {
      return res.status(404).json({ message: '题目不存在' })
    }
    
    const existing = getOne(
      'SELECT id FROM paper_questions WHERE paper_id = ? AND question_id = ?',
      [id, question_id]
    )
    
    if (existing) {
      return res.status(400).json({ message: '该题目已存在于试卷中' })
    }
    
    const maxOrder = getOne(
      'SELECT MAX(sort_order) as max_order FROM paper_questions WHERE paper_id = ?',
      [id]
    )
    const sortOrder = (maxOrder?.max_order || 0) + 1
    
    insert('paper_questions', {
      paper_id: id,
      question_id: question_id,
      sort_order: sortOrder,
      score: score
    })
    
    const countResult = getOne('SELECT COUNT(*) as count FROM paper_questions WHERE paper_id = ?', [id])
    update('exam_papers', { question_count: countResult?.count || 0 }, 'id = ?', [id])
    
    res.json({ message: '题目添加成功' })
  } catch (error) {
    next(error)
  }
})

router.delete('/papers/:id/questions/:questionId', async (req, res, next) => {
  try {
    const { id, questionId } = req.params
    
    const existing = getOne(
      'SELECT id FROM paper_questions WHERE paper_id = ? AND question_id = ?',
      [id, questionId]
    )
    
    if (!existing) {
      return res.status(404).json({ message: '该题目不在试卷中' })
    }
    
    remove('paper_questions', 'paper_id = ? AND question_id = ?', [id, questionId])
    
    const countResult = getOne('SELECT COUNT(*) as count FROM paper_questions WHERE paper_id = ?', [id])
    update('exam_papers', { question_count: countResult?.count || 0 }, 'id = ?', [id])
    
    res.json({ message: '题目移除成功' })
  } catch (error) {
    next(error)
  }
})

router.post('/submit', async (req, res, next) => {
  try {
    const { question_id, paper_id, user_answer, time_spent } = req.body
    
    if (!question_id || !user_answer) {
      return res.status(400).json({ message: '缺少必要参数' })
    }
    
    const question = getOne('SELECT * FROM questions WHERE id = ?', [question_id])
    if (!question) {
      return res.status(404).json({ message: '题目不存在' })
    }
    
    const userAnswerStr = String(user_answer || '')
    
    let isCorrect = false
    if (question.question_type === 'multiple') {
      const correctAnswers = (question.answer || '').split(',').sort().join(',')
      const userAnswers = userAnswerStr.split(',').sort().join(',')
      isCorrect = correctAnswers === userAnswers
    } else {
      isCorrect = (question.answer || '').trim().toLowerCase() === userAnswerStr.trim().toLowerCase()
    }
    
    insert('user_answers', {
      user_id: req.user.id,
      question_id,
      paper_id: paper_id || null,
      user_answer: userAnswerStr,
      is_correct: isCorrect ? 1 : 0,
      time_spent: time_spent || 0
    })
    
    if (!isCorrect) {
      const existingWrong = getOne(
        'SELECT * FROM wrong_questions WHERE user_id = ? AND question_id = ?',
        [req.user.id, question_id]
      )
      
      if (existingWrong) {
        update('wrong_questions', 
          { 
            wrong_count: existingWrong.wrong_count + 1,
            last_wrong_at: new Date().toISOString(),
            mastered: 0
          }, 
          'id = ?', 
          [existingWrong.id]
        )
      } else {
        insert('wrong_questions', {
          user_id: req.user.id,
          question_id,
          wrong_count: 1
        })
      }
    }
    
    res.json({
      is_correct: isCorrect,
      correct_answer: question.answer,
      analysis: question.analysis
    })
  } catch (error) {
    next(error)
  }
})

router.post('/submit-paper', async (req, res, next) => {
  try {
    const { paper_id, answers, time_spent } = req.body
    
    if (!paper_id || !answers) {
      return res.status(400).json({ message: '缺少必要参数' })
    }
    
    const paper = getOne('SELECT * FROM exam_papers WHERE id = ?', [paper_id])
    if (!paper) {
      return res.status(404).json({ message: '试卷不存在' })
    }
    
    const existingExam = getOne(
      'SELECT id FROM user_exams WHERE user_id = ? AND paper_id = ? AND status = "ongoing"',
      [req.user.id, paper_id]
    )
    
    let userExamId
    if (existingExam) {
      userExamId = existingExam.id
    } else {
      userExamId = insert('user_exams', {
        user_id: req.user.id,
        paper_id,
        status: 'ongoing'
      })
    }
    
    let correctCount = 0
    let wrongCount = 0
    
    for (const answer of answers) {
      const question = getOne('SELECT * FROM questions WHERE id = ?', [answer.question_id])
      if (!question) continue
      
      const userAnswerStr = String(answer.user_answer || '')
      
      let isCorrect = false
      if (question.question_type === 'multiple') {
        const correctAnswers = (question.answer || '').split(',').sort().join(',')
        const userAnswers = userAnswerStr.split(',').sort().join(',')
        isCorrect = correctAnswers === userAnswers
      } else {
        isCorrect = (question.answer || '').trim().toLowerCase() === userAnswerStr.trim().toLowerCase()
      }
      
      insert('user_answers', {
        user_id: req.user.id,
        question_id: answer.question_id,
        paper_id,
        user_answer: userAnswerStr,
        is_correct: isCorrect ? 1 : 0,
        time_spent: answer.time_spent || 0
      })
      
      if (isCorrect) {
        correctCount++
      } else {
        wrongCount++
        
        const existingWrong = getOne(
          'SELECT * FROM wrong_questions WHERE user_id = ? AND question_id = ?',
          [req.user.id, answer.question_id]
        )
        
        if (existingWrong) {
          update('wrong_questions', 
            { wrong_count: existingWrong.wrong_count + 1, mastered: 0 }, 
            'id = ?', 
            [existingWrong.id]
          )
        } else {
          insert('wrong_questions', {
            user_id: req.user.id,
            question_id: answer.question_id,
            wrong_count: 1
          })
        }
      }
    }
    
    const totalQuestions = answers.length
    const totalScore = Math.round((correctCount / totalQuestions) * paper.total_score)
    
    update('user_exams', {
      total_score: totalScore,
      correct_count: correctCount,
      wrong_count: wrongCount,
      time_spent: time_spent || 0,
      status: 'submitted',
      submitted_at: new Date().toISOString()
    }, 'id = ?', [userExamId])
    
    res.json({
      message: '试卷提交成功',
      result: {
        total_score: totalScore,
        correct_count: correctCount,
        wrong_count: wrongCount,
        total_questions: totalQuestions,
        pass: totalScore >= paper.pass_score
      }
    })
  } catch (error) {
    next(error)
  }
})

router.get('/wrong-questions', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20 } = req.query
    
    const countResult = getOne(
      'SELECT COUNT(*) as total FROM wrong_questions WHERE user_id = ? AND mastered = 0',
      [req.user.id]
    )
    const total = countResult?.total || 0
    
    const wrongQuestions = query(
      `SELECT wq.*, q.title, q.options, q.answer, q.analysis, q.question_type, q.difficulty,
              qc.name as category_name
       FROM wrong_questions wq
       JOIN questions q ON wq.question_id = q.id
       LEFT JOIN question_categories qc ON q.category_id = qc.id
       WHERE wq.user_id = ? AND wq.mastered = 0
       ORDER BY wq.last_wrong_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize)]
    )
    
    res.json({
      wrongQuestions,
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

router.post('/wrong-questions/:id/master', async (req, res, next) => {
  try {
    const { id } = req.params
    
    update('wrong_questions', { mastered: 1 }, 'id = ? AND user_id = ?', [id, req.user.id])
    
    res.json({ message: '已标记为掌握' })
  } catch (error) {
    next(error)
  }
})

router.get('/history', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10 } = req.query
    
    const countResult = getOne(
      'SELECT COUNT(*) as total FROM user_exams WHERE user_id = ?',
      [req.user.id]
    )
    const total = countResult?.total || 0
    
    const history = query(
      `SELECT ue.*, ep.name as paper_name, ep.exam_type, ep.total_score as max_score
       FROM user_exams ue
       JOIN exam_papers ep ON ue.paper_id = ep.id
       WHERE ue.user_id = ?
       ORDER BY ue.started_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize)]
    )
    
    res.json({
      history,
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

router.get('/statistics', async (req, res, next) => {
  try {
    const totalAnswered = getOne(
      'SELECT COUNT(*) as count FROM user_answers WHERE user_id = ?',
      [req.user.id]
    )?.count || 0
    
    const correctCount = getOne(
      'SELECT COUNT(*) as count FROM user_answers WHERE user_id = ? AND is_correct = 1',
      [req.user.id]
    )?.count || 0
    
    const wrongCount = totalAnswered - correctCount
    
    const examCount = getOne(
      'SELECT COUNT(*) as count FROM user_exams WHERE user_id = ? AND status = "submitted"',
      [req.user.id]
    )?.count || 0
    
    const avgScore = getOne(
      'SELECT AVG(total_score) as avg FROM user_exams WHERE user_id = ? AND status = "submitted"',
      [req.user.id]
    )?.avg || 0
    
    const wrongQuestionCount = getOne(
      'SELECT COUNT(*) as count FROM wrong_questions WHERE user_id = ? AND mastered = 0',
      [req.user.id]
    )?.count || 0
    
    const categoryStats = query(
      `SELECT qc.name, COUNT(*) as total,
              SUM(CASE WHEN ua.is_correct = 1 THEN 1 ELSE 0 END) as correct
       FROM user_answers ua
       JOIN questions q ON ua.question_id = q.id
       LEFT JOIN question_categories qc ON q.category_id = qc.id
       WHERE ua.user_id = ?
       GROUP BY qc.id
       ORDER BY total DESC`,
      [req.user.id]
    )
    
    res.json({
      totalAnswered,
      correctCount,
      wrongCount,
      correctRate: totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0,
      examCount,
      avgScore: Math.round(avgScore * 10) / 10,
      wrongQuestionCount,
      categoryStats
    })
  } catch (error) {
    next(error)
  }
})

router.post('/questions/import', async (req, res, next) => {
  try {
    const { questions, exam_type, paper_id } = req.body
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: '请提供有效的题目数据' })
    }
    
    let paper = null
    if (paper_id) {
      paper = getOne('SELECT id FROM exam_papers WHERE id = ?', [paper_id])
      if (!paper) {
        return res.status(404).json({ message: '试卷不存在' })
      }
    }
    
    const results = {
      success: 0,
      failed: 0,
      errors: [],
      questionIds: []
    }
    
    console.log('=== 导入题目数据 ===')
    console.log('题目数量:', questions.length)
    console.log('导入到试卷:', paper_id || '无')
    console.log('第一题:', JSON.stringify(questions[0], null, 2))
    
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      const rowNum = i + 2
      
      try {
        console.log(`--- 处理第${rowNum}行 ---`)
        console.log('原始数据:', JSON.stringify(q, null, 2))
        
        if (!q.title || !q.answer) {
          results.failed++
          results.errors.push(`第${rowNum}行: 题目内容或答案为空`)
          continue
        }
        
        let questionType = String(q.question_type || 'single').toLowerCase()
        console.log('题型原始值:', questionType)
        if (questionType.includes('单选') || questionType === 'single') {
          questionType = 'single'
        } else if (questionType.includes('多选') || questionType === 'multiple') {
          questionType = 'multiple'
        } else if (questionType.includes('判断') || questionType === 'judge') {
          questionType = 'judge'
        } else {
          questionType = 'single'
        }
        console.log('识别后题型:', questionType)
        
        let options = null
        if (q.options) {
          if (typeof q.options === 'string') {
            const opts = q.options.split(/[|；;\n]/).map(o => o.trim()).filter(o => o)
            if (opts.length > 0) {
              options = opts
            }
            console.log('解析选项:', opts.length, '个')
          } else if (Array.isArray(q.options)) {
            options = q.options
          }
        }
        console.log('最终选项:', options)
        
        let difficulty = String(q.difficulty || 'medium').toLowerCase()
        if (difficulty.includes('简单') || difficulty.includes('容易') || difficulty === 'easy') {
          difficulty = 'easy'
        } else if (difficulty.includes('困难') || difficulty.includes('难') || difficulty === 'hard') {
          difficulty = 'hard'
        } else {
          difficulty = 'medium'
        }
        console.log('识别后难度:', difficulty)
        
        let answerStr = String(q.answer || '').trim().toUpperCase()
        if (questionType === 'judge') {
          if (answerStr.includes('正确') || answerStr === 'TRUE' || answerStr === 'T' || answerStr === 'A') {
            answerStr = 'A'
          } else if (answerStr.includes('错误') || answerStr === 'FALSE' || answerStr === 'F' || answerStr === 'B') {
            answerStr = 'B'
          }
        }
        console.log('识别后答案:', answerStr)
        
        const questionId = insert('questions', {
          category_id: q.category_id || null,
          exam_type: q.exam_type || exam_type || null,
          question_type: questionType,
          title: q.title.trim(),
          options: options ? JSON.stringify(options) : null,
          answer: answerStr,
          analysis: q.analysis ? q.analysis.trim() : null,
          difficulty: difficulty,
          points: parseInt(q.points) || 2,
          tags: q.tags ? JSON.stringify(q.tags.split ? q.tags.split(',') : [q.tags]) : null,
          status: 'published',
          created_by: req.user.id
        })
        
        console.log('插入结果 ID:', questionId)
        
        if (questionId) {
          results.success++
          results.questionIds.push(questionId)
          console.log(`第${rowNum}行导入成功`)
          
          if (paper_id) {
            const maxOrder = getOne(
              'SELECT MAX(sort_order) as max_order FROM paper_questions WHERE paper_id = ?',
              [paper_id]
            )
            const sortOrder = (maxOrder?.max_order || 0) + 1
            
            insert('paper_questions', {
              paper_id: paper_id,
              question_id: questionId,
              sort_order: sortOrder,
              score: parseInt(q.points) || 2
            })
            console.log(`第${rowNum}行已添加到试卷 ${paper_id}`)
          }
        } else {
          results.failed++
          results.errors.push(`第${rowNum}行: 插入失败`)
        }
      } catch (e) {
        results.failed++
        results.errors.push(`第${rowNum}行: ${e.message}`)
        console.error(`第${rowNum}行错误:`, e.message)
      }
    }
    
    if (paper_id && results.success > 0) {
      const countResult = getOne('SELECT COUNT(*) as count FROM paper_questions WHERE paper_id = ?', [paper_id])
      update('exam_papers', { question_count: countResult?.count || 0 }, 'id = ?', [paper_id])
    }
    
    console.log(`=== 导入结果 ===`)
    console.log(`成功: ${results.success}, 失败: ${results.failed}`)
    
    res.json({
      message: `导入完成: 成功${results.success}条, 失败${results.failed}条`,
      results
    })
  } catch (error) {
    console.error('导入错误:', error)
    next(error)
  }
})

router.post('/questions/import-excel', async (req, res, next) => {
  try {
    const { fileData, exam_type } = req.body
    
    if (!fileData) {
      return res.status(400).json({ message: '请上传Excel文件' })
    }
    
    const buffer = Buffer.from(fileData, 'base64')
    const workbook = xlsx.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = xlsx.utils.sheet_to_json(worksheet)
    
    if (jsonData.length === 0) {
      return res.status(400).json({ message: 'Excel文件中没有数据' })
    }
    
    const questions = jsonData.map(row => ({
      title: row['题目内容'] || row['题目'] || row['title'],
      question_type: row['题型'] || row['类型'] || row['question_type'] || 'single',
      options: row['选项'] || row['options'] || '',
      answer: row['正确答案'] || row['答案'] || row['answer'],
      analysis: row['解析'] || row['analysis'] || '',
      difficulty: row['难度'] || row['difficulty'] || 'medium',
      points: row['分值'] || row['points'] || 2,
      category_id: row['分类ID'] || row['category_id'] || null,
      exam_type: row['考试类型'] || row['exam_type'] || exam_type || null,
      tags: row['标签'] || row['tags'] || ''
    }))
    
    const results = {
      success: 0,
      failed: 0,
      errors: []
    }
    
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      const rowNum = i + 2
      
      try {
        if (!q.title || !q.answer) {
          results.failed++
          results.errors.push(`第${rowNum}行: 题目内容或答案为空`)
          continue
        }
        
        let questionType = String(q.question_type).toLowerCase()
        if (questionType.includes('单选') || questionType === '单选题') {
          questionType = 'single'
        } else if (questionType.includes('多选') || questionType === '多选题') {
          questionType = 'multiple'
        } else if (questionType.includes('判断') || questionType === '判断题') {
          questionType = 'judge'
        } else if (!['single', 'multiple', 'judge'].includes(questionType)) {
          questionType = 'single'
        }
        
        let options = null
        if (q.options) {
          const opts = String(q.options).split(/[|；;\n]/).map(o => o.trim()).filter(o => o)
          if (opts.length > 0) {
            options = opts
          }
        }
        
        let difficulty = String(q.difficulty).toLowerCase()
        if (difficulty.includes('简单') || difficulty.includes('容易') || difficulty === 'easy') {
          difficulty = 'easy'
        } else if (difficulty.includes('困难') || difficulty.includes('难') || difficulty === 'hard') {
          difficulty = 'hard'
        } else {
          difficulty = 'medium'
        }
        
        const questionId = insert('questions', {
          category_id: q.category_id || null,
          exam_type: q.exam_type || exam_type || null,
          question_type: questionType,
          title: q.title.trim(),
          options: options ? JSON.stringify(options) : null,
          answer: String(q.answer).trim().toUpperCase(),
          analysis: q.analysis ? q.analysis.trim() : null,
          difficulty: difficulty,
          points: parseInt(q.points) || 2,
          tags: q.tags ? JSON.stringify(q.tags.split ? q.tags.split(',') : [q.tags]) : null,
          status: 'published',
          created_by: req.user.id
        })
        
        if (questionId) {
          results.success++
        } else {
          results.failed++
          results.errors.push(`第${rowNum}行: 插入失败`)
        }
      } catch (e) {
        results.failed++
        results.errors.push(`第${rowNum}行: ${e.message}`)
      }
    }
    
    res.json({
      message: `导入完成: 成功${results.success}条, 失败${results.failed}条`,
      results
    })
  } catch (error) {
    next(error)
  }
})

// 获取 AI 服务状态
router.get('/ai-status', (req, res) => {
  const available = isAIServiceAvailable()
  res.json({ available })
})

// 获取题目的 AI 解析
router.get('/questions/:id/ai-explanation', authenticate, async (req, res) => {
  try {
    const { id } = req.params

    // 获取题目信息
    const question = getOne(
      'SELECT id, title, options, answer, analysis, question_type FROM questions WHERE id = ?',
      [id]
    )

    if (!question) {
      return res.status(404).json({ message: '题目不存在' })
    }

    // 解析 options JSON
    let options = null
    if (question.options) {
      try {
        options = JSON.parse(question.options)
      } catch (e) {
        options = null
      }
    }

    // 调用 AI 服务获取解析
    const explanation = await getAIExplanation({
      title: question.title,
      options: options,
      answer: question.answer,
      analysis: question.analysis
    })

    res.json({
      message: 'AI 解析生成成功',
      explanation
    })
  } catch (error) {
    console.error('AI 解析错误:', error)
    res.status(500).json({
      message: error.message || 'AI 解析生成失败，请稍后重试'
    })
  }
})

export default router
