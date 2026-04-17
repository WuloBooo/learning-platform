<template>
  <div class="practice-center">
    <div class="page-header">
      <h2>刷题中心</h2>
      <p>选择试卷开始练习，提升你的技能水平</p>
    </div>
    
    <div class="stats-overview" v-if="stats">
      <div class="stat-item">
        <span class="stat-value">{{ stats.totalAnswered }}</span>
        <span class="stat-label">已答题数</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ stats.correctRate }}%</span>
        <span class="stat-label">正确率</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ stats.examCount }}</span>
        <span class="stat-label">完成试卷</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ stats.wrongQuestionCount }}</span>
        <span class="stat-label">错题数</span>
      </div>
    </div>
    
    <div class="section">
      <div class="section-header">
        <h3>模拟试卷</h3>
        <div class="filter">
          <select v-model="filterType" @change="loadPapers">
            <option value="">全部类型</option>
            <option value="ai">人工智能训练师</option>
            <option value="data">数据分析</option>
            <option value="software">软件开发</option>
          </select>
        </div>
      </div>
      
      <div class="papers-grid" v-if="!loadingPapers">
        <div class="paper-card" v-for="paper in papers" :key="paper.id" @click="startExam(paper)">
          <div class="paper-icon">📝</div>
          <div class="paper-info">
            <h4>{{ paper.name }}</h4>
            <div class="paper-meta">
              <span>{{ paper.question_count }}题</span>
              <span>{{ paper.total_score }}分</span>
              <span>{{ paper.duration }}分钟</span>
            </div>
            <div class="paper-type" v-if="paper.exam_type">{{ getExamTypeLabel(paper.exam_type) }}</div>
          </div>
          <div class="paper-action">
            <button class="btn-start">开始答题</button>
          </div>
        </div>
      </div>
      
      <div class="empty-state" v-if="!loadingPapers && papers.length === 0">
        暂无可用的试卷
      </div>
    </div>
    
    <div class="section">
      <div class="section-header">
        <h3>随机练习</h3>
      </div>
      <div class="quick-practice">
        <div class="practice-option" @click="startRandomPractice('single')">
          <span class="icon">✓</span>
          <span class="label">单选题练习</span>
        </div>
        <div class="practice-option" @click="startRandomPractice('multiple')">
          <span class="icon">☑</span>
          <span class="label">多选题练习</span>
        </div>
        <div class="practice-option" @click="startRandomPractice('judge')">
          <span class="icon">○</span>
          <span class="label">判断题练习</span>
        </div>
        <div class="practice-option" @click="goToWrongQuestions">
          <span class="icon">✗</span>
          <span class="label">错题重练</span>
          <span class="badge" v-if="stats?.wrongQuestionCount">{{ stats.wrongQuestionCount }}</span>
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-header">
        <h3>答题记录</h3>
        <router-link to="/practice/history" class="view-all">查看全部</router-link>
      </div>
      <div class="history-list" v-if="history.length > 0">
        <div class="history-item" v-for="item in history" :key="item.id">
          <div class="history-info">
            <span class="paper-name">{{ item.paper_name }}</span>
            <span class="date">{{ formatDate(item.submitted_at) }}</span>
          </div>
          <div class="history-score" :class="{ pass: item.total_score >= 60 }">
            {{ item.total_score }}分
          </div>
        </div>
      </div>
      <div class="empty-state" v-else>暂无答题记录</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { practiceAPI } from '../api'

const router = useRouter()
const loadingPapers = ref(false)
const filterType = ref('')

const papers = ref([])
const stats = ref(null)
const history = ref([])

const examTypeLabels = { ai: '人工智能训练师', data: '数据分析', software: '软件开发' }
const getExamTypeLabel = (type) => examTypeLabels[type] || type
const formatDate = (date) => date ? new Date(date).toLocaleDateString('zh-CN') : '-'

const loadStats = async () => {
  try {
    const res = await practiceAPI.getStatistics()
    stats.value = res
  } catch (e) { console.error(e) }
}

const loadPapers = async () => {
  loadingPapers.value = true
  try {
    const params = { status: 'published', pageSize: 10 }
    if (filterType.value) params.exam_type = filterType.value
    const res = await practiceAPI.getPapers(params)
    papers.value = res.papers
  } catch (e) { console.error(e) }
  finally { loadingPapers.value = false }
}

const loadHistory = async () => {
  try {
    const res = await practiceAPI.getHistory({ pageSize: 5 })
    history.value = res.history
  } catch (e) { console.error(e) }
}

const startExam = (paper) => {
  router.push(`/practice/exam/${paper.id}`)
}

const startRandomPractice = (type) => {
  router.push(`/practice/random?type=${type}`)
}

const goToWrongQuestions = () => {
  router.push('/practice/wrong')
}

onMounted(() => {
  loadStats()
  loadPapers()
  loadHistory()
})
</script>

<style scoped>
.practice-center { max-width: 1000px; margin: 0 auto; padding: 24px; }
.page-header { margin-bottom: 24px; }
.page-header h2 { margin: 0 0 8px; font-size: 24px; }
.page-header p { margin: 0; color: #666; }

.stats-overview { display: flex; gap: 16px; margin-bottom: 24px; }
.stat-item { flex: 1; background: linear-gradient(135deg, #1D6FE8 0%, #155BBF 100%); color: white; padding: 20px; border-radius: 12px; text-align: center; }
.stat-value { display: block; font-size: 28px; font-weight: 700; color: #fff; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3); }
.stat-label { font-size: 14px; color: rgba(255, 255, 255, 0.95); text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); }

.section { background: white; border-radius: 12px; padding: 20px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-header h3 { margin: 0; font-size: 18px; }
.view-all { color: #4F46E5; font-size: 14px; text-decoration: none; }

.papers-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.paper-card { display: flex; align-items: center; gap: 16px; padding: 16px; border: 1px solid #eee; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
.paper-card:hover { border-color: #4F46E5; box-shadow: 0 4px 12px rgba(79,70,229,0.1); }
.paper-icon { font-size: 32px; }
.paper-info { flex: 1; }
.paper-info h4 { margin: 0 0 8px; font-size: 16px; }
.paper-meta { display: flex; gap: 12px; font-size: 13px; color: #666; }
.paper-type { margin-top: 4px; font-size: 12px; color: #4F46E5; }
.btn-start { background: #4F46E5; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 14px; cursor: pointer; }

.quick-practice { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.practice-option { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px; background: #f8f9fa; border-radius: 12px; cursor: pointer; transition: all 0.2s; position: relative; }
.practice-option:hover { background: #e8f0fe; }
.practice-option .icon { font-size: 24px; }
.practice-option .label { font-size: 14px; color: #333; }
.practice-option .badge { position: absolute; top: 8px; right: 8px; background: #f44336; color: white; font-size: 12px; padding: 2px 8px; border-radius: 10px; }

.history-list { display: flex; flex-direction: column; gap: 12px; }
.history-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f9f9f9; border-radius: 8px; }
.history-info { display: flex; flex-direction: column; gap: 4px; }
.paper-name { font-weight: 500; }
.date { font-size: 12px; color: #999; }
.history-score { font-size: 18px; font-weight: 600; color: #f44336; }
.history-score.pass { color: #4caf50; }

.empty-state { text-align: center; padding: 24px; color: #999; }
</style>
