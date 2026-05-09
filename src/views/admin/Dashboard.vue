<template>
  <div class="dashboard-page">
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-icon">👥</span>
        <div class="stat-info">
          <span class="stat-value">{{ stats.totalUsers }}</span>
          <span class="stat-label">注册用户</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">📝</span>
        <div class="stat-info">
          <span class="stat-value">{{ stats.totalRegistrations }}</span>
          <span class="stat-label">报名总数</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">🎓</span>
        <div class="stat-info">
          <span class="stat-value">{{ stats.totalStudents || 0 }}</span>
          <span class="stat-label">学员总数</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">🆕</span>
        <div class="stat-info">
          <span class="stat-value">{{ stats.newStudentsThisMonth || 0 }}</span>
          <span class="stat-label">本月新增学员</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">⏳</span>
        <div class="stat-info">
          <span class="stat-value">{{ stats.pendingRegistrations }}</span>
          <span class="stat-label">待审核</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">📅</span>
        <div class="stat-info">
          <span class="stat-value">{{ stats.upcomingExams }}</span>
          <span class="stat-label">即将考试</span>
        </div>
      </div>
    </div>

    <!-- 学员状态分布 -->
    <div class="dashboard-card" v-if="studentStatusStats.length > 0">
      <h3>学员状态分布</h3>
      <div class="bar-chart">
        <div class="bar-item" v-for="item in studentStatusStats" :key="item.status">
          <div class="bar-label">{{ item.status }}</div>
          <div class="bar-wrapper">
            <div class="bar-fill student-bar" :style="{ width: getStudentBarWidth(item.count) + '%' }"></div>
          </div>
          <div class="bar-value">{{ item.count }}</div>
        </div>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="dashboard-card">
        <h3>最近报名</h3>
        <div class="list-container">
          <div class="list-item" v-for="item in recentRegistrations" :key="item.id">
            <div class="item-info">
              <span class="name">{{ item.name }}</span>
              <span class="exam">{{ getExamTypeLabel(item.exam_type) }}</span>
            </div>
            <span class="date">{{ formatDate(item.created_at) }}</span>
          </div>
          <div class="empty-state" v-if="recentRegistrations.length === 0">
            暂无报名记录
          </div>
        </div>
      </div>

      <div class="dashboard-card">
        <h3>最近学员</h3>
        <div class="list-container">
          <div class="list-item" v-for="s in recentStudents" :key="s.id">
            <div class="item-info">
              <span class="name">{{ s.name }}</span>
              <span class="exam">{{ s.major || '未填写专业' }}</span>
            </div>
            <span :class="['mini-badge', getStudentStatusClass(s.status)]">{{ s.status }}</span>
          </div>
          <div class="empty-state" v-if="recentStudents.length === 0">
            暂无学员
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminAPI } from '../../api'

const stats = ref({
  totalUsers: 0,
  totalRegistrations: 0,
  pendingRegistrations: 0,
  upcomingExams: 0,
  totalMaterials: 0,
  totalDownloads: 0,
  totalStudents: 0,
  newStudentsThisMonth: 0
})

const recentRegistrations = ref([])
const examTypeStats = ref([])
const studentStatusStats = ref([])
const recentStudents = ref([])

const examTypeLabels = {
  'ai': '人工智能训练师',
  'data': '数据分析',
  'software': '软件开发',
  'python': 'Python数据分析',
  'web': 'Web前端开发'
}

const getExamTypeLabel = (type) => {
  return examTypeLabels[type] || type || '未知类型'
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const getBarWidth = (count) => {
  const max = Math.max(...examTypeStats.value.map(s => s.count), 1)
  return (count / max) * 100
}

const getStudentBarWidth = (count) => {
  const max = Math.max(...studentStatusStats.value.map(s => s.count), 1)
  return (count / max) * 100
}

const getStudentStatusClass = (status) => {
  const map = { '意向': 'pending', '已报名': 'info', '资料审核': 'warning', '已缴费': 'success', '学习中': 'info', '已考试': 'success', '已拿证': 'complete' }
  return map[status] || 'pending'
}

const loadStatistics = async () => {
  try {
    const response = await adminAPI.getStatistics()
    stats.value = response.overview
    recentRegistrations.value = response.recentRegistrations
    examTypeStats.value = response.examTypeStats
    studentStatusStats.value = response.studentStatusStats || []
    recentStudents.value = response.recentStudents || []
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

onMounted(() => {
  loadStatistics()
})
</script>

<style scoped>
.bar-chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bar-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bar-label {
  width: 120px;
  font-size: 14px;
  color: #666;
}

.bar-wrapper {
  flex: 1;
  height: 20px;
  background: #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #4F46E5, #7C3AED);
  border-radius: 10px;
  transition: width 0.3s ease;
}

.bar-fill.student-bar {
  background: linear-gradient(90deg, #10b981, #059669);
}

.bar-value {
  width: 40px;
  text-align: right;
  font-weight: 600;
  color: #333;
}

.mini-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
}
.mini-badge.pending { background: #fef3c7; color: #92400e; }
.mini-badge.info { background: #dbeafe; color: #1e40af; }
.mini-badge.warning { background: #fef3c7; color: #92400e; }
.mini-badge.success { background: #d1fae5; color: #065f46; }
.mini-badge.complete { background: #ede9fe; color: #5b21b6; }
</style>
