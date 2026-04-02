<template>
  <div class="exam-page">
    <div class="exam-header" v-if="paper">
      <div class="exam-info">
        <h2>{{ paper.name }}</h2>
        <div class="meta">
          <span>共 {{ questions.length }} 题</span>
          <span>总分 {{ paper.total_score }} 分</span>
          <span>时长 {{ paper.duration }} 分钟</span>
        </div>
      </div>
      <div class="exam-timer">
        <span class="timer-label">剩余时间</span>
        <span class="timer-value">{{ formatTime(remainingTime) }}</span>
      </div>
      <button class="btn-submit" @click="confirmSubmit" :disabled="submitting">
        {{ submitting ? '提交中...' : '提交试卷' }}
      </button>
    </div>
    
    <div class="exam-body">
      <div class="question-nav">
        <div class="nav-title">答题卡</div>
        <div class="nav-grid">
          <button 
            v-for="(q, index) in questions" 
            :key="q.id"
            :class="['nav-item', { answered: answers[q.id] && (Array.isArray(answers[q.id]) ? answers[q.id].length > 0 : true), current: currentIndex === index }]"
            @click="goToQuestion(index)"
          >
            {{ index + 1 }}
          </button>
        </div>
        <div class="nav-legend">
          <span class="legend-item"><span class="dot answered"></span>已答</span>
          <span class="legend-item"><span class="dot"></span>未答</span>
        </div>
      </div>
      
      <div class="question-area" v-if="currentQuestion">
        <div class="question-header">
          <span class="question-number">第 {{ currentIndex + 1 }} 题</span>
          <span class="question-type">[{{ getTypeLabel(currentQuestion.question_type) }}]</span>
          <span class="question-score">{{ currentQuestion.paper_score || 1 }}分</span>
        </div>
        
        <div class="question-content">
          <div class="question-title">{{ currentQuestion.title }}</div>
          
          <div class="question-options" v-if="['single', 'multiple'].includes(currentQuestion.question_type)">
            <label 
              v-for="(opt, index) in parseOptions(currentQuestion.options)" 
              :key="index"
              :class="['option-item', { selected: isOptionSelected(currentQuestion.id, String.fromCharCode(65 + index)) }]"
            >
              <input 
                v-if="currentQuestion.question_type === 'single'"
                type="radio" 
                :name="'q_' + currentQuestion.id"
                :value="String.fromCharCode(65 + index)"
                v-model="answers[currentQuestion.id]"
                @change="saveProgress"
              />
              <input 
                v-else
                type="checkbox" 
                :value="String.fromCharCode(65 + index)"
                v-model="answers[currentQuestion.id]"
                @change="saveProgress"
              />
              <span class="option-label">{{ String.fromCharCode(65 + index) }}.</span>
              <span class="option-text">{{ opt }}</span>
            </label>
          </div>
          
          <div class="question-options" v-else-if="currentQuestion.question_type === 'judge'">
            <label :class="['option-item', { selected: answers[currentQuestion.id] === '正确' }]">
              <input type="radio" :name="'q_' + currentQuestion.id" value="正确" v-model="answers[currentQuestion.id]" @change="saveProgress" />
              <span class="option-label">✓</span>
              <span class="option-text">正确</span>
            </label>
            <label :class="['option-item', { selected: answers[currentQuestion.id] === '错误' }]">
              <input type="radio" :name="'q_' + currentQuestion.id" value="错误" v-model="answers[currentQuestion.id]" @change="saveProgress" />
              <span class="option-label">✗</span>
              <span class="option-text">错误</span>
            </label>
          </div>
          
          <div class="fill-input" v-else>
            <input type="text" v-model="answers[currentQuestion.id]" placeholder="请输入答案" @change="saveProgress" />
          </div>
        </div>
        
        <div class="question-actions">
          <button class="btn-prev" @click="prevQuestion" :disabled="currentIndex === 0">上一题</button>
          <button class="btn-next" @click="nextQuestion" :disabled="currentIndex === questions.length - 1">下一题</button>
        </div>
      </div>
    </div>
    
    <div class="result-modal" v-if="showConfirm">
      <div class="result-content">
        <div class="result-icon">📝</div>
        <h3>确认提交试卷？</h3>
        <div class="confirm-stats">
          <p>已答题数: {{ answeredCount }} / {{ questions.length }}</p>
          <p class="warning" v-if="unansweredCount > 0">还有 {{ unansweredCount }} 题未作答</p>
        </div>
        <div class="result-actions">
          <button class="btn-secondary" @click="showConfirm = false">继续答题</button>
          <button class="btn-primary" @click="doSubmit">确认提交</button>
        </div>
      </div>
    </div>
    
    <div class="result-modal" v-if="showResult">
      <div class="result-content">
        <div class="result-icon" :class="{ pass: result.pass }">
          {{ result.pass ? '🎉' : '😢' }}
        </div>
        <h3>{{ result.pass ? '恭喜通过！' : '继续加油！' }}</h3>
        <div class="result-score">{{ result.total_score }}分</div>
        <div class="result-stats">
          <span>正确: {{ result.correct_count }}题</span>
          <span>错误: {{ result.wrong_count }}题</span>
        </div>
        <div class="result-actions">
          <button class="btn-primary" @click="viewWrongQuestions">查看错题</button>
          <button class="btn-secondary" @click="backToCenter">返回刷题中心</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { practiceAPI } from '../api'

const route = useRoute()
const router = useRouter()

const paper = ref(null)
const questions = ref([])
const currentIndex = ref(0)
const answers = ref({})
const remainingTime = ref(0)
const submitting = ref(false)
const showConfirm = ref(false)
const showResult = ref(false)
const result = ref({})
const startTime = ref(null)
let timer = null

const currentQuestion = computed(() => questions.value[currentIndex.value])

const answeredCount = computed(() => {
  return Object.keys(answers.value).filter(k => {
    const ans = answers.value[k]
    return ans && (Array.isArray(ans) ? ans.length > 0 : true)
  }).length
})

const unansweredCount = computed(() => questions.value.length - answeredCount.value)

const typeLabels = { single: '单选题', multiple: '多选题', judge: '判断题', fill: '填空题' }
const getTypeLabel = (type) => typeLabels[type] || type

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const parseOptions = (options) => {
  if (!options) return []
  try {
    return typeof options === 'string' ? JSON.parse(options) : options
  } catch {
    return []
  }
}

const isOptionSelected = (questionId, option) => {
  const answer = answers.value[questionId]
  if (Array.isArray(answer)) {
    return answer.includes(option)
  }
  return answer === option
}

const goToQuestion = (index) => {
  currentIndex.value = index
}

const prevQuestion = () => {
  if (currentIndex.value > 0) currentIndex.value--
}

const nextQuestion = () => {
  if (currentIndex.value < questions.value.length - 1) currentIndex.value++
}

const saveProgress = () => {
  const data = JSON.stringify(answers.value)
  localStorage.setItem(`exam_${route.params.id}`, data)
}

const loadProgress = () => {
  const data = localStorage.getItem(`exam_${route.params.id}`)
  if (data) {
    try {
      const saved = JSON.parse(data)
      Object.keys(saved).forEach(key => {
        const q = questions.value.find(q => q.id === parseInt(key))
        if (q && q.question_type === 'multiple') {
          answers.value[key] = Array.isArray(saved[key]) ? saved[key] : (saved[key] ? saved[key].split(',') : [])
        } else {
          answers.value[key] = saved[key]
        }
      })
    } catch {}
  }
}

const startTimer = () => {
  timer = setInterval(() => {
    if (remainingTime.value > 0) {
      remainingTime.value--
    } else {
      clearInterval(timer)
      submitExam()
    }
  }, 1000)
}

const confirmSubmit = () => {
  showConfirm.value = true
}

const doSubmit = () => {
  showConfirm.value = false
  submitExam()
}

const submitExam = async () => {
  if (submitting.value) return
  submitting.value = true
  
  try {
    const answersList = questions.value.map(q => ({
      question_id: q.id,
      user_answer: Array.isArray(answers.value[q.id]) ? answers.value[q.id].join(',') : (answers.value[q.id] || ''),
      time_spent: 0
    }))
    
    const timeSpent = Math.floor((Date.now() - startTime.value) / 1000)
    
    const res = await practiceAPI.submitPaper({
      paper_id: route.params.id,
      answers: answersList,
      time_spent: timeSpent
    })
    
    result.value = res.result
    showResult.value = true
    localStorage.removeItem(`exam_${route.params.id}`)
    clearInterval(timer)
  } catch (e) {
    alert(e.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

const viewWrongQuestions = () => {
  router.push('/practice/wrong')
}

const backToCenter = () => {
  router.push('/practice')
}

const loadPaper = async () => {
  try {
    const res = await practiceAPI.getPaper(route.params.id)
    paper.value = res.paper
    questions.value = res.questions
    remainingTime.value = res.paper.duration * 60
    startTime.value = Date.now()
    questions.value.forEach(q => {
      if (q.question_type === 'multiple') {
        answers.value[q.id] = []
      }
    })
    loadProgress()
    startTimer()
  } catch (e) {
    alert(e.message || '加载试卷失败')
    router.push('/practice')
  }
}

onMounted(() => {
  loadPaper()
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>

<style scoped>
.exam-page { min-height: 100vh; background: #f5f7fa; }
.exam-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); position: sticky; top: 0; z-index: 100; }
.exam-info h2 { margin: 0 0 4px; font-size: 18px; }
.exam-info .meta { display: flex; gap: 16px; font-size: 14px; color: #666; }
.exam-timer { display: flex; flex-direction: column; align-items: center; }
.timer-label { font-size: 12px; color: #999; }
.timer-value { font-size: 24px; font-weight: 700; color: #f44336; font-family: monospace; }
.btn-submit { background: #4F46E5; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-size: 16px; cursor: pointer; }
.btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

.exam-body { display: flex; padding: 24px; gap: 24px; }
.question-nav { width: 200px; background: white; border-radius: 12px; padding: 16px; height: fit-content; position: sticky; top: 100px; }
.nav-title { font-weight: 600; margin-bottom: 12px; }
.nav-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.nav-item { width: 32px; height: 32px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; font-size: 14px; }
.nav-item.answered { background: #4F46E5; color: white; border-color: #4F46E5; }
.nav-item.current { border-color: #f44336; box-shadow: 0 0 0 2px rgba(244,67,54,0.2); }
.nav-legend { margin-top: 12px; display: flex; gap: 16px; font-size: 12px; color: #666; }
.legend-item { display: flex; align-items: center; gap: 4px; }
.dot { width: 12px; height: 12px; border-radius: 2px; border: 1px solid #ddd; }
.dot.answered { background: #4F46E5; border-color: #4F46E5; }

.question-area { flex: 1; background: white; border-radius: 12px; padding: 24px; }
.question-header { display: flex; gap: 12px; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #eee; }
.question-number { font-weight: 600; }
.question-type { color: #4F46E5; font-size: 14px; }
.question-score { color: #666; font-size: 14px; }
.question-title { font-size: 16px; line-height: 1.6; margin-bottom: 24px; }
.question-options { display: flex; flex-direction: column; gap: 12px; }
.option-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; border: 1px solid #eee; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.option-item:hover { background: #f9f9f9; }
.option-item.selected { border-color: #4F46E5; background: #eef2ff; }
.option-item input { margin-top: 4px; }
.option-label { font-weight: 600; color: #4F46E5; }
.option-text { flex: 1; }
.fill-input input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; }
.question-actions { display: flex; justify-content: space-between; margin-top: 24px; padding-top: 24px; border-top: 1px solid #eee; }
.btn-prev, .btn-next { padding: 10px 24px; border: 1px solid #ddd; border-radius: 8px; background: white; cursor: pointer; }
.btn-prev:disabled, .btn-next:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-next { background: #4F46E5; color: white; border-color: #4F46E5; }

.result-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.result-content { background: white; border-radius: 16px; padding: 40px; text-align: center; max-width: 400px; }
.result-icon { font-size: 64px; margin-bottom: 16px; }
.result-content h3 { margin: 0 0 16px; font-size: 24px; }
.confirm-stats { margin-bottom: 24px; }
.confirm-stats p { margin: 8px 0; color: #666; }
.confirm-stats .warning { color: #f44336; font-weight: 500; }
.result-score { font-size: 48px; font-weight: 700; color: #f44336; margin-bottom: 16px; }
.result-score.pass { color: #4caf50; }
.result-stats { display: flex; justify-content: center; gap: 24px; margin-bottom: 24px; color: #666; }
.result-actions { display: flex; gap: 16px; justify-content: center; }
.btn-primary { background: #4F46E5; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; }
.btn-secondary { background: #f5f5f5; color: #333; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; }
</style>
