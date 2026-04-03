/**
 * AI 服务封装 - DeepSeek API
 */

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

/**
 * 获取题目的 AI 解析
 * @param {Object} question - 题目对象
 * @returns {Promise<string>} AI 解析内容
 */
export async function getAIExplanation(question) {
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (!apiKey) {
    throw new Error('DeepSeek API Key 未配置')
  }

  // 构建题目内容
  let questionContent = `题目：${question.title}\n`

  if (question.options && Array.isArray(question.options)) {
    questionContent += `\n选项：\n${question.options.map((opt, idx) => `${String.fromCharCode(65 + idx)}. ${opt}`).join('\n')}\n`
  }

  questionContent += `\n正确答案：${question.answer}\n`

  if (question.analysis) {
    questionContent += `\n参考解析：${question.analysis}\n`
  }

  const prompt = `你是一位专业的考试辅导老师，请为以下题目提供详细的解析：

${questionContent}

请从以下几个方面进行解析：
1. **题目分析**：说明这道题考查的知识点
2. **解题思路**：详细说明解题的思路和方法
3. **答案解释**：解释为什么正确答案是这个选项
4. **易错点提示**：指出学生容易犯的错误

请用清晰易懂的语言回答，适合学生理解。`

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
            content: '你是一位专业的考试辅导老师，擅长为学生解析各类考试题目。'
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
      throw new Error(errorData.error?.message || `DeepSeek API 错误: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || '无法生成解析'
  } catch (error) {
    console.error('AI 解析生成失败:', error)
    throw error
  }
}

export default {
  getAIExplanation
}
