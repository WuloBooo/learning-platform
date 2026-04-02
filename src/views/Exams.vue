<template>
  <div class="exams-page">
    <div class="page-header">
      <h1>考试信息</h1>
      <p>查看考试安排、报名时间、考试地点等信息</p>
    </div>
    
    <div class="exams-container">
      <div class="calendar-section">
        <div class="calendar-header">
          <button class="nav-btn" @click="prevMonth">‹</button>
          <h3>{{ currentYear }}年{{ currentMonth }}月</h3>
          <button class="nav-btn" @click="nextMonth">›</button>
          <div class="view-toggle">
            <button :class="{ active: calendarView === 'month' }" @click="calendarView = 'month'">月</button>
            <button :class="{ active: calendarView === 'week' }" @click="calendarView = 'week'">周</button>
          </div>
        </div>
        <div class="calendar-grid">
          <div class="calendar-weekdays">
            <span v-for="day in weekdays" :key="day">{{ day }}</span>
          </div>
          <div class="calendar-days">
            <div 
              v-for="(day, index) in calendarDays" 
              :key="index"
              :class="['calendar-day', { 
                'other-month': day.otherMonth,
                'today': day.isToday,
                'has-exam': day.exams.length > 0
              }]"
              @click="selectDay(day)"
            >
              <span class="day-number">{{ day.date }}</span>
              <div class="exam-dots">
                <span 
                  v-for="(exam, i) in day.exams.slice(0, 3)" 
                  :key="i"
                  :class="['exam-dot', exam.type]"
                  :title="exam.name"
                ></span>
              </div>
            </div>
          </div>
        </div>
        <div class="calendar-legend">
          <span class="legend-item"><span class="dot exam"></span>考试日</span>
          <span class="legend-item"><span class="dot deadline"></span>报名截止</span>
          <span class="legend-item"><span class="dot result"></span>成绩公布</span>
        </div>
      </div>
      
      <div class="exams-section">
        <div class="filter-bar">
          <div class="filter-group">
            <label>考试类型</label>
            <select v-model="filterType">
              <option value="all">全部</option>
              <option value="ai">人工智能</option>
              <option value="data">数据分析</option>
              <option value="software">软件开发</option>
            </select>
          </div>
          <div class="filter-group">
            <label>状态</label>
            <select v-model="filterStatus">
              <option value="all">全部</option>
              <option value="registering">报名中</option>
              <option value="upcoming">即将开始</option>
              <option value="finished">已结束</option>
            </select>
          </div>
          <div class="filter-group">
            <label>地点</label>
            <select v-model="filterLocation">
              <option value="all">全部</option>
              <option value="online">线上</option>
              <option value="offline">线下</option>
            </select>
          </div>
        </div>
        
        <div class="exams-list">
          <div class="loading-state" v-if="loading">加载中...</div>
          <div class="empty-state" v-if="!loading && filteredExams.length === 0">暂无考试数据</div>
          <div 
            class="exam-card" 
            v-for="exam in filteredExams" 
            :key="exam.id"
            :class="{ expanded: expandedExam === exam.id }"
          >
            <div class="exam-main" @click="toggleExam(exam.id)">
              <div class="exam-date">
                <span class="month">{{ exam.month }}</span>
                <span class="day">{{ exam.day }}</span>
              </div>
              <div class="exam-info">
                <h4>{{ exam.name }}</h4>
                <div class="exam-meta">
                  <span>📍 {{ exam.location }}</span>
                  <span>⏰ {{ exam.time }}</span>
                  <span :class="['status', exam.status]">{{ exam.statusLabel }}</span>
                </div>
              </div>
              <div class="exam-deadline">
                <span class="label">报名截止</span>
                <span class="date">{{ exam.deadline }}</span>
              </div>
              <button class="expand-btn">{{ expandedExam === exam.id ? '收起' : '展开' }}</button>
            </div>
            
            <div class="exam-detail" v-if="expandedExam === exam.id">
              <div class="detail-section">
                <h5>考试大纲</h5>
                <p>{{ exam.outline }}</p>
              </div>
              <div class="detail-section">
                <h5>注意事项</h5>
                <ul>
                  <li v-for="(note, i) in exam.notes" :key="i">{{ note }}</li>
                </ul>
              </div>
              <div class="detail-section">
                <h5>联系方式</h5>
                <p>咨询电话：{{ exam.contactPhone }}</p>
                <p>咨询邮箱：{{ exam.contactEmail }}</p>
              </div>
              <div class="detail-actions">
                <button class="btn-subscribe" @click.stop="subscribeExam(exam)" :class="{ subscribed: exam.subscribed }">
                  {{ exam.subscribed ? '✓ 已订阅' : '🔔 订阅通知' }}
                </button>
                <router-link to="/registration" class="btn-register">立即报名</router-link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="selected-day-info" v-if="selectedDayInfo">
      <div class="info-header">
        <h4>{{ selectedDayInfo.fullDate }}</h4>
        <button class="close-btn" @click="selectedDayInfo = null">×</button>
      </div>
      <div class="info-content">
        <div class="exam-item" v-for="exam in selectedDayInfo.exams" :key="exam.id">
          <span :class="['exam-type', exam.type]">{{ exam.typeLabel }}</span>
          <span class="exam-name">{{ exam.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { practiceAPI } from '../api'

const loading = ref(false)
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)
const calendarView = ref('month')
const filterType = ref('all')
const filterStatus = ref('all')
const filterLocation = ref('all')
const expandedExam = ref(null)
const selectedDayInfo = ref(null)

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

const exams = ref([])

const loadExams = async () => {
  loading.value = true
  try {
    const params = {}
    if (filterType.value !== 'all') params.type = filterType.value
    if (filterStatus.value !== 'all') params.status = filterStatus.value
    if (filterLocation.value !== 'all') params.location = filterLocation.value
    
    const res = await practiceAPI.getPublicExams(params)
    exams.value = res.exams || []
  } catch (e) {
    console.error('加载考试数据失败:', e)
    exams.value = []
  } finally {
    loading.value = false
  }
}

const filteredExams = computed(() => {
  return exams.value.filter(e => {
    if (filterType.value !== 'all' && e.type !== filterType.value) return false
    if (filterStatus.value !== 'all' && e.status !== filterStatus.value) return false
    if (filterLocation.value !== 'all') {
      if (filterLocation.value === 'online' && !e.location.includes('线上')) return false
      if (filterLocation.value === 'offline' && e.location.includes('线上')) return false
    }
    return true
  })
})

const calendarDays = computed(() => {
  const days = []
  const firstDay = new Date(currentYear.value, currentMonth.value - 1, 1)
  const lastDay = new Date(currentYear.value, currentMonth.value, 0)
  const startPadding = firstDay.getDay()
  
  const today = new Date()
  
  for (let i = 0; i < startPadding; i++) {
    const prevDate = new Date(currentYear.value, currentMonth.value - 1, -startPadding + i + 1)
    days.push({
      date: prevDate.getDate(),
      fullDate: `${prevDate.getFullYear()}年${prevDate.getMonth() + 1}月${prevDate.getDate()}日`,
      otherMonth: true,
      isToday: false,
      exams: []
    })
  }
  
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const dayExams = exams.value.filter(e => {
      const examDay = parseInt(e.day)
      const examMonth = parseInt(e.month.replace('月', ''))
      return examDay === i && examMonth === currentMonth.value
    }).map(e => ({
      id: e.id,
      name: e.name,
      type: e.status === 'registering' ? 'exam' : 'deadline',
      typeLabel: e.status === 'registering' ? '考试' : '截止'
    }))
    
    days.push({
      date: i,
      fullDate: `${currentYear.value}年${currentMonth.value}月${i}日`,
      otherMonth: false,
      isToday: today.getFullYear() === currentYear.value && 
                today.getMonth() + 1 === currentMonth.value && 
                today.getDate() === i,
      exams: dayExams
    })
  }
  
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({
      date: i,
      fullDate: `${currentYear.value}年${currentMonth.value + 1}月${i}日`,
      otherMonth: true,
      isToday: false,
      exams: []
    })
  }
  
  return days
})

const prevMonth = () => {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

const nextMonth = () => {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

const selectDay = (day) => {
  if (day.exams.length > 0) {
    selectedDayInfo.value = day
  }
}

const toggleExam = (id) => {
  expandedExam.value = expandedExam.value === id ? null : id
}

const subscribeExam = (exam) => {
  exam.subscribed = !exam.subscribed
}

onMounted(() => {
  loadExams()
})

watch([filterType, filterStatus, filterLocation], () => {
  loadExams()
})
</script>
