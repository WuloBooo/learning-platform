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
        <h3>考试类型分布</h3>
        <div class="chart-container">
          <div class="bar-chart">
            <div 
              class="bar-item" 
              v-for="item in examTypeStats" 
              :key="item.exam_type"
            >
              <div class="bar-label">{{ getExamTypeLabel(item.exam_type) }}</div>
              <div class="bar-wrapper">
                <div 
                  class="bar-fill" 
                  :style="{ width: getBarWidth(item.count) + '%' }"
                ></div>
              </div>
              <div class="bar-value">{{ item.count }}</div>
            </div>
          </div>
          <div class="empty-state" v-if="examTypeStats.length === 0">
            暂无数据
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
  totalDownloads: 0
})

const recentRegistrations = ref([])
const examTypeStats = ref([])

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

const loadStatistics = async () => {
  try {
    const response = await adminAPI.getStatistics()
    stats.value = response.overview
    recentRegistrations.value = response.recentRegistrations
    examTypeStats.value = response.examTypeStats
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

.bar-value {
  width: 40px;
  text-align: right;
  font-weight: 600;
  color: #333;
}
</style>
