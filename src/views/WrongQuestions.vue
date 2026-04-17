<template>
  <div class="wrong-questions-page">
    <div class="page-header">
      <h2>错题本</h2>
      <p>复习错题，巩固薄弱知识点</p>
    </div>
    
    <div class="stats-bar" v-if="wrongQuestions.length > 0">
      <span>共 {{ pagination.total }} 道错题</span>
      <button class="btn-clear" @click="clearMastered" v-if="hasMastered">清除已掌握</button>
    </div>
    
    <div class="questions-list" v-if="!loading">
      <div class="question-card" v-for="wq in wrongQuestions" :key="wq.id">
        <div class="question-header">
          <span class="q-type">[{{ getTypeLabel(wq.question_type) }}]</span>
          <span class="q-difficulty" :class="wq.difficulty">{{ getDifficultyLabel(wq.difficulty) }}</span>
          <span class="q-wrong-count">错误 {{ wq.wrong_count }} 次</span>
        </div>
        
        <div class="question-title">{{ wq.title }}</div>
        
        <div class="question-options" v-if="wq.options">
          <div v-for="(opt, index) in parseOptions(wq.options)" :key="index" class="option">
            <span class="opt-label">{{ String.fromCharCode(65 + index) }}.</span>
            <span>{{ opt }}</span>
          </div>
        </div>
        
        <div class="question-answer">
          <div class="correct-answer">
            <span class="label">正确答案：</span>
            <span class="value">{{ wq.answer }}</span>
          </div>
          <div class="analysis" v-if="wq.analysis">
            <span class="label">解析：</span>
            <span class="value">{{ wq.analysis }}</span>
          </div>

          <!-- AI 解析区域 -->
          <div class="ai-explanation-section">
            <button
              class="btn-ai"
              @click="fetchAIExplanation(wq)"
              :disabled="loadingAI[wq.question_id]"
              v-if="!aiExplanations[wq.question_id]"
            >
              <span v-if="loadingAI[wq.question_id]">🔄 AI 解析中...</span>
              <span v-else>🤖 获取AI解析</span>
            </button>

            <div class="ai-explanation" v-if="aiExplanations[wq.question_id]">
              <div class="ai-header">
                <span class="ai-icon">🤖</span>
                <span class="ai-title">AI 智能解析</span>
              </div>

              <div class="ai-body" v-if="aiExplanations[wq.question_id].data">
                <!-- 知识点 -->
                <div class="ai-item knowledge">
                  <span class="item-icon">📚</span>
                  <div class="item-content">
                    <span class="item-label">考查知识点</span>
                    <p>{{ aiExplanations[wq.question_id].data.knowledge }}</p>
                  </div>
                </div>

                <!-- 题目分析 -->
                <div class="ai-item">
                  <span class="item-icon">🔍</span>
                  <div class="item-content">
                    <span class="item-label">题目分析</span>
                    <p>{{ aiExplanations[wq.question_id].data.analysis }}</p>
                  </div>
                </div>

                <!-- 解题步骤 -->
                <div class="ai-item" v-if="aiExplanations[wq.question_id].data.solution">
                  <span class="item-icon">📝</span>
                  <div class="item-content">
                    <span class="item-label">解题步骤</span>
                    <p>{{ aiExplanations[wq.question_id].data.solution }}</p>
                  </div>
                </div>

                <!-- 答案解释 -->
                <div class="ai-item highlight">
                  <span class="item-icon">✅</span>
                  <div class="item-content">
                    <span class="item-label">为什么选这个答案</span>
                    <p>{{ aiExplanations[wq.question_id].data.answerReason }}</p>
                  </div>
                </div>

                <!-- 错误选项分析 -->
                <div class="ai-item" v-if="aiExplanations[wq.question_id].data.wrongOptions">
                  <span class="item-icon">❌</span>
                  <div class="item-content">
                    <span class="item-label">其他选项为什么错</span>
                    <p>{{ aiExplanations[wq.question_id].data.wrongOptions }}</p>
                  </div>
                </div>

                <!-- 易错点提示 -->
                <div class="ai-item warning" v-if="aiExplanations[wq.question_id].data.tips">
                  <span class="item-icon">⚠️</span>
                  <div class="item-content">
                    <span class="item-label">易错点提示</span>
                    <p>{{ aiExplanations[wq.question_id].data.tips }}</p>
                  </div>
                </div>

                <!-- 总结 -->
                <div class="ai-item summary" v-if="aiExplanations[wq.question_id].data.summary">
                  <span class="item-icon">💡</span>
                  <div class="item-content">
                    <span class="item-label">核心要点</span>
                    <p>{{ aiExplanations[wq.question_id].data.summary }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="question-actions">
          <button class="btn-master" @click="markAsMastered(wq)">标记为已掌握</button>
          <button class="btn-retry" @click="retryQuestion(wq)">重新作答</button>
        </div>
      </div>
      
      <div class="empty-state" v-if="wrongQuestions.length === 0">
        <div class="empty-icon">🎉</div>
        <h3>太棒了！</h3>
        <p>暂无错题，继续保持！</p>
        <router-link to="/practice" class="btn-primary">去刷题</router-link>
      </div>
    </div>
    
    <div class="loading-state" v-if="loading">加载中...</div>
    
    <div class="pagination" v-if="pagination.totalPages > 1">
      <button :disabled="pagination.page === 1" @click="changePage(pagination.page - 1)">上一页</button>
      <span>第 {{ pagination.page }} / {{ pagination.totalPages }} 页</span>
      <button :disabled="pagination.page === pagination.totalPages" @click="changePage(pagination.page + 1)">下一页</button>
    </div>
    
    <div class="retry-modal" v-if="retryingQuestion">
      <div class="modal-content">
        <div class="modal-header">
          <h3>重新作答</h3>
          <button class="close-btn" @click="closeRetry">×</button>
        </div>
        <div class="question-content">
          <div class="q-title">{{ retryingQuestion.title }}</div>
          <div class="q-options" v-if="retryingQuestion.options">
            <label 
              v-for="(opt, index) in parseOptions(retryingQuestion.options)" 
              :key="index"
              :class="['option-item', { selected: retryAnswer === String.fromCharCode(65 + index) }]"
            >
              <input 
                type="radio" 
                :value="String.fromCharCode(65 + index)" 
                v-model="retryAnswer"
              />
              <span>{{ String.fromCharCode(65 + index) }}. {{ opt }}</span>
            </label>
          </div>
          <div class="q-options" v-else-if="retryingQuestion.question_type === 'judge'">
            <label :class="['option-item', { selected: retryAnswer === '正确' }]">
              <input type="radio" value="正确" v-model="retryAnswer" />
              <span>正确</span>
            </label>
            <label :class="['option-item', { selected: retryAnswer === '错误' }]">
              <input type="radio" value="错误" v-model="retryAnswer" />
              <span>错误</span>
            </label>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="closeRetry">取消</button>
          <button class="btn-primary" @click="submitRetry" :disabled="!retryAnswer">提交答案</button>
        </div>
        <div class="retry-result" v-if="retryResult !== null">
          <div :class="['result', retryResult ? 'correct' : 'wrong']">
            {{ retryResult ? '✓ 回答正确！' : '✗ 回答错误' }}
          </div>
          <div class="correct-answer" v-if="!retryResult">
            正确答案：{{ retryingQuestion.answer }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { practiceAPI } from '../api'

const loading = ref(false)
const wrongQuestions = ref([])
const pagination = reactive({ page: 1, pageSize: 10, total: 0, totalPages: 0 })
const aiExplanations = ref({})  // 存储AI解析
const loadingAI = ref({})  // 加载状态
const retryingQuestion = ref(null)
const retryAnswer = ref('')
const retryResult = ref(null)

import { reactive } from 'vue'

const typeLabels = { single: '单选题', multiple: '多选题', judge: '判断题', fill: '填空题' }
const difficultyLabels = { easy: '简单', medium: '中等', hard: '困难' }

const getTypeLabel = (type) => typeLabels[type] || type
const getDifficultyLabel = (diff) => difficultyLabels[diff] || diff

const parseOptions = (options) => {
  if (!options) return []
  try {
    return typeof options === 'string' ? JSON.parse(options) : options
  } catch {
    return []
  }
}

const hasMastered = computed(() => wrongQuestions.value.some(q => q.mastered))

const loadWrongQuestions = async () => {
  loading.value = true
  try {
    const res = await practiceAPI.getWrongQuestions({ page: pagination.page, pageSize: pagination.pageSize })
    wrongQuestions.value = res.wrongQuestions
    pagination.total = res.pagination.total
    pagination.totalPages = res.pagination.totalPages
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const changePage = (page) => {
  pagination.page = page
  loadWrongQuestions()
}

const markAsMastered = async (wq) => {
  try {
    await practiceAPI.masterWrongQuestion(wq.id)
    loadWrongQuestions()
  } catch (e) {
    alert(e.message || '操作失败')
  }
}

const clearMastered = () => {
  wrongQuestions.value = wrongQuestions.value.filter(q => !q.mastered)
}

const retryQuestion = (wq) => {
  retryingQuestion.value = wq
  retryAnswer.value = ''
  retryResult.value = null
}

const closeRetry = () => {
  retryingQuestion.value = null
  retryAnswer.value = ''
  retryResult.value = null
}

const submitRetry = async () => {
  if (!retryAnswer.value) return

  try {
    const res = await practiceAPI.submitAnswer({
      question_id: retryingQuestion.value.question_id,
      user_answer: retryAnswer.value
    })
    retryResult.value = res.is_correct
    if (res.is_correct) {
      setTimeout(() => {
        loadWrongQuestions()
        closeRetry()
      }, 1500)
    }
  } catch (e) {
    alert(e.message || '提交失败')
  }
}

// 获取AI解析
const fetchAIExplanation = async (wq) => {
  const questionId = wq.question_id
  if (aiExplanations.value[questionId] || loadingAI.value[questionId]) return

  loadingAI.value[questionId] = true
  try {
    const res = await practiceAPI.getAIExplanation(questionId)
    aiExplanations.value[questionId] = res.explanation
  } catch (e) {
    alert(e.message || 'AI解析获取失败')
  } finally {
    loadingAI.value[questionId] = false
  }
}

onMounted(() => {
  loadWrongQuestions()
})
</script>

<style scoped>
.wrong-questions-page { max-width: 800px; margin: 0 auto; padding: 24px; }
.page-header { margin-bottom: 24px; }
.page-header h2 { margin: 0 0 8px; font-size: 24px; }
.page-header p { margin: 0; color: #666; }

.stats-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 12px 16px; background: #fff3e0; border-radius: 8px; }
.btn-clear { background: none; border: 1px solid #ff9800; color: #ff9800; padding: 6px 12px; border-radius: 4px; cursor: pointer; }

.questions-list { display: flex; flex-direction: column; gap: 16px; }
.question-card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.question-header { display: flex; gap: 12px; margin-bottom: 12px; }
.q-type { color: #4F46E5; font-size: 14px; }
.q-difficulty { font-size: 12px; padding: 2px 8px; border-radius: 4px; }
.q-difficulty.easy { background: #e8f5e9; color: #4caf50; }
.q-difficulty.medium { background: #fff8e1; color: #ff9800; }
.q-difficulty.hard { background: #ffebee; color: #f44336; }
.q-wrong-count { font-size: 12px; color: #f44336; margin-left: auto; }

.question-title { font-size: 16px; line-height: 1.6; margin-bottom: 16px; }
.question-options { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; padding-left: 16px; }
.option { display: flex; gap: 8px; }
.opt-label { font-weight: 600; }

.question-answer { background: #f0f9eb; padding: 16px; border-radius: 8px; margin-bottom: 16px; }
.correct-answer { margin-bottom: 8px; }
.correct-answer .label { color: #666; }
.correct-answer .value { color: #4caf50; font-weight: 600; }
.analysis .label { color: #666; }
.analysis .value { color: #333; }

.ai-explanation-section { margin-top: 16px; padding-top: 16px; border-top: 1px dashed #c8e6c9; }
.btn-ai { background: linear-gradient(135deg, #1D6FE8 0%, #155BBF 100%); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; }
.btn-ai:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }
.btn-ai:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

.ai-explanation { margin-top: 16px; background: linear-gradient(135deg, #fafbfc 0%, #f0f4f8 100%); border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; }
.ai-header { display: flex; align-items: center; gap: 10px; padding: 16px 20px; background: linear-gradient(135deg, #1D6FE8 0%, #155BBF 100%); color: white; }
.ai-icon { font-size: 24px; }
.ai-title { font-weight: 600; font-size: 16px; }
.ai-body { padding: 20px; }

.ai-item { display: flex; gap: 12px; padding: 16px; margin-bottom: 12px; background: white; border-radius: 12px; border: 1px solid #e2e8f0; transition: all 0.2s; }
.ai-item:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.ai-item:last-child { margin-bottom: 0; }
.ai-item.knowledge { background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%); border-color: #c7d2fe; }
.ai-item.highlight { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-color: #a7f3d0; }
.ai-item.warning { background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-color: #fcd34d; }
.ai-item.summary { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-color: #bae6fd; }

.item-icon { font-size: 20px; flex-shrink: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: white; border-radius: 8px; }
.item-content { flex: 1; }
.item-label { display: block; font-size: 12px; color: #64748b; margin-bottom: 6px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
.item-content p { margin: 0; font-size: 14px; line-height: 1.7; color: #334155; }

.question-actions { display: flex; gap: 12px; }
.btn-master { background: #e8f5e9; color: #4caf50; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
.btn-retry { background: #e3f2fd; color: #1976d2; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }

.empty-state { text-align: center; padding: 60px 20px; background: white; border-radius: 12px; }
.empty-icon { font-size: 64px; margin-bottom: 16px; }
.empty-state h3 { margin: 0 0 8px; }
.empty-state p { color: #666; margin-bottom: 24px; }
.btn-primary { background: #4F46E5; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; text-decoration: none; display: inline-block; }

.pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 24px; }
.pagination button { padding: 8px 16px; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer; }
.pagination button:disabled { opacity: 0.5; cursor: not-allowed; }

.retry-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: white; border-radius: 12px; padding: 24px; max-width: 500px; width: 90%; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.modal-header h3 { margin: 0; }
.close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #999; }
.q-title { font-size: 16px; margin-bottom: 16px; }
.q-options { display: flex; flex-direction: column; gap: 8px; }
.option-item { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border: 1px solid #eee; border-radius: 6px; cursor: pointer; }
.option-item.selected { border-color: #4F46E5; background: #eef2ff; }
.option-item input { margin: 0; }
.modal-actions { display: flex; gap: 12px; margin-top: 16px; justify-content: flex-end; }
.btn-cancel { background: #f5f5f5; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
.retry-result { margin-top: 16px; padding: 12px; border-radius: 6px; }
.retry-result .result.correct { background: #e8f5e9; color: #4caf50; }
.retry-result .result.wrong { background: #ffebee; color: #f44336; }
.retry-result .correct-answer { margin-top: 8px; color: #666; }
</style>
