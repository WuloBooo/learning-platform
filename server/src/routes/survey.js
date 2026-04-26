import { Router } from 'express'
import { query, getOne, insert } from '../config/database.js'

const router = Router()

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

function getApiKey() {
  return process.env.DEEPSEEK_API_KEY || null
}

const SYSTEM_PROMPT = `你是一位企业数字化转型顾问，正在帮助一家教育培训公司进行内部流程调研。

公司背景：
- 这是一个教育培训部门，有4名员工
- 主要业务是"人工智能训练师"证书培训
- 学员来源：散客自主报名 + 合作招生机构推送
- 培训内容：线上录播课（第三方平台）、1次线上答疑课、1次线下实操培训
- 最终参加线下考试
- 日常使用企业微信与学员沟通
- 部门内部分工：1人负责技术平台，3人负责对接学员和机构

你的任务是和对方（部门同事）聊天，了解他们日常工作中：
1. 哪些工作是每天/每周重复做的？（比如通知学员、收集资料、回答同样的问题等）
2. 这些重复工作大概占用多少时间？
3. 目前是用什么方式完成的？（手动、Excel、企业微信等）
4. 哪些环节最容易出错或遗漏？
5. 他们觉得哪些工作最应该被自动化？

聊天风格要求：
- 像朋友聊天一样自然，不要像问卷调查
- 一次只问一个问题，等对方回答后再追问
- 对方回答后先给予肯定和回应，再自然引出下一个问题
- 如果对方提到具体的工作内容，追问细节（频率、耗时、工具等）
- 适当表达理解和共情
- 最后总结对方提到的所有重复性工作，并询问是否有遗漏

注意：不要一次性列出所有问题，要像真实对话一样逐步展开。每次回复控制在150字以内。`

// 创建新会话
router.post('/sessions', (req, res) => {
  try {
    const { name } = req.body
    const sessionId = insert('survey_sessions', {
      name: name || '匿名',
      status: 'active',
      created_at: new Date().toISOString()
    })

    // 插入AI开场白
    const openingMessage = `嗨！我正在帮咱们部门做一次工作流程调研，主要是想了解大家日常有哪些重复性的工作，看看哪些可以用技术手段优化。

能先简单说说你平时主要负责哪些工作吗？`
    insert('survey_messages', {
      session_id: sessionId,
      role: 'assistant',
      content: openingMessage,
      created_at: new Date().toISOString()
    })

    res.json({ sessionId, openingMessage })
  } catch (error) {
    res.status(500).json({ message: '创建会话失败', error: error.message })
  }
})

// 发送消息并获取AI回复
router.post('/sessions/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params
    const { content } = req.body

    if (!content || !content.trim()) {
      return res.status(400).json({ message: '消息内容不能为空' })
    }

    const apiKey = getApiKey()
    if (!apiKey) {
      return res.status(500).json({ message: 'AI服务未配置' })
    }

    // 保存用户消息
    insert('survey_messages', {
      session_id: sessionId,
      role: 'user',
      content: content.trim(),
      created_at: new Date().toISOString()
    })

    // 获取该会话的所有历史消息
    const messages = query(
      'SELECT role, content FROM survey_messages WHERE session_id = ? ORDER BY created_at ASC',
      [sessionId]
    )

    // 构建DeepSeek请求
    const chatMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ]

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: chatMessages,
        max_tokens: 500,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `AI服务错误: ${response.status}`)
    }

    const data = await response.json()
    const aiReply = data.choices[0]?.message?.content || '抱歉，我暂时无法回复，请稍后再试。'

    // 保存AI回复
    insert('survey_messages', {
      session_id: sessionId,
      role: 'assistant',
      content: aiReply,
      created_at: new Date().toISOString()
    })

    res.json({ reply: aiReply })
  } catch (error) {
    console.error('Survey chat error:', error)
    res.status(500).json({ message: '消息处理失败', error: error.message })
  }
})

// 获取会话历史消息
router.get('/sessions/:sessionId/messages', (req, res) => {
  try {
    const { sessionId } = req.params
    const messages = query(
      'SELECT id, role, content, created_at FROM survey_messages WHERE session_id = ? ORDER BY created_at ASC',
      [sessionId]
    )
    res.json({ messages })
  } catch (error) {
    res.status(500).json({ message: '获取消息失败', error: error.message })
  }
})

// 获取所有会话列表（管理员查看）
router.get('/sessions', (req, res) => {
  try {
    const sessions = query(
      'SELECT id, name, status, created_at FROM survey_sessions ORDER BY created_at DESC'
    )
    res.json({ sessions })
  } catch (error) {
    res.status(500).json({ message: '获取会话列表失败', error: error.message })
  }
})

// 导出某个会话的完整对话（管理员查看）
router.get('/sessions/:sessionId/export', (req, res) => {
  try {
    const { sessionId } = req.params
    const session = getOne('SELECT * FROM survey_sessions WHERE id = ?', [sessionId])
    if (!session) {
      return res.status(404).json({ message: '会话不存在' })
    }
    const messages = query(
      'SELECT role, content, created_at FROM survey_messages WHERE session_id = ? ORDER BY created_at ASC',
      [sessionId]
    )
    res.json({ session, messages })
  } catch (error) {
    res.status(500).json({ message: '导出失败', error: error.message })
  }
})

// 删除单个会话
router.delete('/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params
    query('DELETE FROM survey_messages WHERE session_id = ?', [sessionId])
    query('DELETE FROM survey_sessions WHERE id = ?', [sessionId])
    res.json({ message: '删除成功' })
  } catch (error) {
    res.status(500).json({ message: '删除失败', error: error.message })
  }
})

// 清空所有会话
router.delete('/sessions', (req, res) => {
  try {
    query('DELETE FROM survey_messages')
    query('DELETE FROM survey_sessions')
    res.json({ message: '已清空所有会话' })
  } catch (error) {
    res.status(500).json({ message: '清空失败', error: error.message })
  }
})

export default router
