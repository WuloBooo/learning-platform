/**
 * AI 服务封装 - DeepSeek API
 */

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

/**
 * 获取 API Key（优先从数据库获取，其次从环境变量）
 */
function getApiKey() {
  // 优先使用环境变量中的 API Key
  return process.env.DEEPSEEK_API_KEY || null
}

/**
 * 获取题目的 AI 解析
 * @param {Object} question - 题目对象
 * @returns {Promise<Object>} AI 解析内容（结构化格式）
 */
export async function getAIExplanation(question) {
  const apiKey = getApiKey()

  if (!apiKey) {
    throw new Error('AI 服务未配置，请联系管理员设置 API Key')
  }

  // 构建题目内容
  let questionContent = `【题目】\n${question.title}\n`

  if (question.options && Array.isArray(question.options) && question.options.length > 0) {
    questionContent += `\n【选项】\n${question.options.map((opt, idx) => `${String.fromCharCode(65 + idx)}. ${opt}`).join('\n')}\n`
  }

  questionContent += `\n【正确答案】${question.answer}\n`

  if (question.analysis) {
    questionContent += `\n【参考解析】\n${question.analysis}\n`
  }

  const prompt = `你是一位资深的考试辅导老师，请对以下题目进行专业解析：

${questionContent}

请严格按照以下 JSON 格式返回解析内容（不要添加任何其他文字，只返回 JSON）：

{
  "knowledge": "考查的知识点（一句话概括）",
  "analysis": "题目详细分析（2-3句话说明题目考查什么）",
  "solution": "解题步骤（分步骤说明如何得出答案）",
  "answerReason": "为什么选这个答案（解释正确答案的原因）",
  "wrongOptions": "其他选项为什么错（简要说明错误选项的问题）",
  "tips": "易错点提示（提醒学生容易犯的错误）",
  "summary": "一句话总结（核心要点）"
}

注意：
- 语言要通俗易懂，适合学生理解
- solution 用编号列表形式，如 "①... ②... ③..."
- wrongOptions 简明扼要，指出关键错误
- 如果是判断题，options 解释为空`

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一位资深的专业考试辅导老师，擅长用通俗易懂的方式为学生解析各类考试题目。你的解析结构清晰、逻辑严谨、重点突出。请严格按照要求的 JSON 格式返回，不要添加任何多余内容。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `AI 服务错误: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content || ''

    // 尝试解析 JSON
    try {
      // 提取 JSON 内容（处理可能的 markdown 代码块）
      let jsonContent = content
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonContent = jsonMatch[1].trim()
      }

      const parsed = JSON.parse(jsonContent)
      return {
        success: true,
        data: parsed
      }
    } catch (parseError) {
      // 如果解析失败，返回原始内容
      return {
        success: true,
        data: {
          knowledge: '知识点解析',
          analysis: content,
          solution: '',
          answerReason: '',
          wrongOptions: '',
          tips: '',
          summary: ''
        }
      }
    }
  } catch (error) {
    console.error('AI 解析生成失败:', error)
    throw error
  }
}

/**
 * 检查 AI 服务是否可用
 */
export function isAIServiceAvailable() {
  return !!getApiKey()
}

export default {
  getAIExplanation,
  isAIServiceAvailable
}
