<template>
  <div class="home-page">
    <!-- 轮播图 -->
    <section class="banner-section">
      <div class="banner-container">
        <div class="banner-slides">
          <div
            v-for="(slide, index) in banners"
            :key="index"
            :class="['banner-slide', { active: currentBanner === index }]"
            :style="{ backgroundImage: `linear-gradient(135deg, ${slide.color1}, ${slide.color2})` }"
          >
            <div class="banner-content">
              <h2>{{ slide.title }}</h2>
              <p>{{ slide.description }}</p>
              <span class="banner-btn" @click="goToRegistration">{{ slide.btnText }}</span>
            </div>
          </div>
        </div>
        <div class="banner-indicators">
          <span
            v-for="(_, index) in banners"
            :key="index"
            :class="['indicator', { active: currentBanner === index }]"
            @click="currentBanner = index"
          ></span>
        </div>
        <button class="banner-arrow prev" @click="prevBanner">‹</button>
        <button class="banner-arrow next" @click="nextBanner">›</button>
      </div>
    </section>

    <!-- 快捷入口 -->
    <section class="quick-entry">
      <div class="entry-container">
        <div class="entry-card" @click="goToRegistration">
          <span class="entry-icon">📝</span>
          <h3>立即报名</h3>
          <p>跳转至报名网站</p>
        </div>
        <router-link to="/downloads" class="entry-card">
          <span class="entry-icon">📥</span>
          <h3>资料下载</h3>
          <p>获取备考资料</p>
        </router-link>
        <router-link to="/exams" class="entry-card">
          <span class="entry-icon">📅</span>
          <h3>考试计划</h3>
          <p>查看考试安排</p>
        </router-link>
      </div>
    </section>

    <!-- 考试动态 -->
    <section class="exam-news">
      <div class="section-container">
        <div class="section-header">
          <h2>考试动态</h2>
          <router-link to="/exams" class="more-link">查看更多 →</router-link>
        </div>
        <div class="news-list" v-if="newsList.length > 0">
          <div class="news-item" v-for="news in newsList" :key="news.id">
            <div class="news-date">
              <span class="day">{{ news.day }}</span>
              <span class="month">{{ news.month }}</span>
            </div>
            <div class="news-content">
              <h4>{{ news.title }}</h4>
              <p>{{ news.summary }}</p>
              <span class="news-tag" :class="news.type">{{ news.typeLabel }}</span>
            </div>
          </div>
        </div>
        <div class="news-empty" v-else>
          <p>暂无考试动态</p>
        </div>
      </div>
    </section>

    <!-- 重要时间节点（可折叠) -->
    <section class="timeline-section">
      <div class="section-container">
        <div class="timeline-header">
          <h2>📌 重要时间节点</h2>
          <span class="timeline-subtitle">登录后可查看各类考试的重要时间安排</span>
        </div>

        <div class="timeline-content" v-show="timelineExpanded">
          <div class="exam-groups" v-if="examTimelines.length > 0">
            <div
              v-for="exam in examTimelines"
              :key="exam.id"
              class="exam-group"
            >
              <div class="exam-header">
                <div class="exam-title">
                  <span class="exam-icon">{{ exam.icon }}</span>
                  <div>
                    <h3>{{ exam.name }}</h3>
                    <span class="exam-period">{{ exam.period }}</span>
                  </div>
                </div>
                <span :class="['exam-status', exam.status]">{{ exam.statusLabel }}</span>
              </div>

              <div class="milestone-list">
                <div
                  v-for="milestone in exam.milestones"
                  :key="milestone.id"
                  :class="['milestone-item', milestone.status]"
                >
                  <div class="milestone-icon">{{ milestone.icon }}</div>
                  <div class="milestone-info">
                    <span class="milestone-title">{{ milestone.title }}</span>
                    <span class="milestone-date">{{ milestone.date }}</span>
                  </div>
                  <div class="milestone-right">
                    <span class="milestone-countdown" v-if="milestone.countdown">{{ milestone.countdown }}</span>
                    <span :class="['milestone-badge', milestone.status]">{{ milestone.statusLabel }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="timeline-empty" v-else>
            <p>暂无时间节点信息</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 热门培训项目 -->
    <section class="training-programs">
      <div class="section-container">
        <div class="section-header">
          <h2>热门培训项目</h2>
          <div class="filter-tabs">
            <button
              v-for="tab in programTabs"
              :key="tab.id"
              :class="['filter-tab', { active: activeProgramTab === tab.id }]"
              @click="activeProgramTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>
        <div class="programs-grid" v-if="programs.length > 0">
          <div class="program-card" v-for="program in programs" :key="program.id">
            <div class="program-image" :style="{ background: program.gradient }">
              <span class="program-icon">{{ program.icon }}</span>
            </div>
            <div class="program-info">
              <h3>{{ program.name }}</h3>
              <p class="program-desc">{{ program.description }}</p>
              <div class="program-meta">
                <span class="duration">⏱ {{ program.duration }}</span>
                <span class="students">👥 {{ program.students }}人已报名</span>
              </div>
              <div class="program-footer">
                <span :class="['status', program.status]">{{ program.statusLabel }}</span>
                <span class="btn-apply" @click="goToRegistration">立即报名</span>
              </div>
            </div>
          </div>
        </div>
        <div class="programs-empty" v-else>
          <p>暂无培训项目</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '../stores/user'
import { publicAPI } from '../api'

import { practiceAPI } from '../api'

const userStore = useUserStore()

const currentBanner = ref(0)
    const activeProgramTab = ref('all')
    const timelineExpanded = ref(true)
    const loading = ref({ banners: false, news: false, timelines: false, programs: false })

    // 数据
    const banners = ref([])
    const newsList = ref([])
    const examTimelines = ref([])
    const programs = ref([])

    const programTabs = [
    { id: 'all', label: '全部' },
    { id: 'ai', label: '人工智能' },
    { id: 'data', label: '数据分析' },
    { id: 'software', label: '软件开发' }
  ]

    // 预设的 banner 颜色组合
    const bannerColors = [
      { color1: '#667eea', color2: '#764ba2' },  // 紫色渐变
      { color1: '#f093fb', color2: '#f5576c' },  // 粉色渐变
      { color1: '#4facfe', color2: '#00f2fe' },  // 蓝色渐变
      { color1: '#43e97b', color2: '#38f9d7' },  // 绿色渐变
      { color1: '#fa709a', color2: '#fee140' },  // 橙粉渐变
      { color1: '#a8edea', color2: '#fed6e3' },  // 清新渐变
    ]

    // 加载数据
    const loadData = async () => {
    loading.value = { banners: true, news: true, timelines: true, programs: true }
    try {
      // 并行加载所有数据
      const [bannersRes, newsRes, timelinesRes, programsRes] = await Promise.all([
        publicAPI.getBanners(),
        publicAPI.getNews({ pageSize: 5 }),
        publicAPI.getTimelines(),
        publicAPI.getPrograms({ category: activeProgramTab.value === 'all' ? undefined : activeProgramTab.value })
      ])

      // 处理轮播图数据
      if (bannersRes.banners && bannersRes.banners.length > 0) {
        banners.value = bannersRes.banners.map((b, index) => ({
          title: b.title,
          description: b.subtitle || '',
          btnText: '立即报名',
          link: 'https://xbgydx.jndj.ks.zjyun.org',
          color1: b.color1 || bannerColors[index % bannerColors.length].color1,
          color2: b.color2 || bannerColors[index % bannerColors.length].color2
        }))
        currentBanner.value = 0
      }

      // 处理新闻数据
      if (newsRes.news) {
        newsList.value = newsRes.news.map(n => ({
          ...n,
          day: new Date(n.created_at).getDate(),
          month: new Date(n.created_at).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' }).toString(),
          typeLabel: n.type === 'exam' ? '考试通知' : n.type === 'notice' ? '政策通知' : '培训动态'
        }))
      }

      // 处理时间节点数据
      if (timelinesRes.timelines) {
        examTimelines.value = timelinesRes.timelines.map(t => ({
          ...t,
          statusLabel: t.status_label,
          milestones: t.milestones ? JSON.parse(t.milestones).map(m => ({
            ...m,
            statusLabel: m.statusLabel || (m.status === 'completed' ? '已完成' : m.status === 'ongoing' ? '进行中' : '待开始')
          })) : []
        }))
      }

      // 处理培训项目数据
      if (programsRes.programs) {
        programs.value = programsRes.programs.map(p => ({
          ...p,
          gradient: p.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          statusLabel: p.status_label || '报名中'
        }))
      }
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      loading.value = { banners: false, news: false, timelines: false, programs: false }
    }
  }

  // 监听培训项目分类变化
  watch(activeProgramTab, () => {
    loadPrograms()
  })

  const loadPrograms = async () => {
    if (loading.value.programs) return
    try {
      const res = await publicAPI.getPrograms({ category: activeProgramTab.value === 'all' ? undefined : activeProgramTab.value })
      if (res.programs) {
        programs.value = res.programs.map(p => ({
          ...p,
          gradient: p.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }))
      }
    } catch (error) {
      console.error('加载培训项目失败:', error)
    }
  }

  const filteredPrograms = computed(() => {
    if (activeProgramTab.value === 'all') {
      return programs.value
    }
    return programs.value.filter(p => p.category === activeProgramTab.value)
  })

  const goToRegistration = () => {
    if (confirm('即将跳转至外部报名网站，是否继续？')) {
      window.open('https://xbgydx.jndj.ks.zjyun.org', '_blank')
    }
  }

  let bannerInterval = null

  const prevBanner = () => {
    currentBanner.value = (currentBanner.value - 1 + banners.value.length) % banners.value.length
  }

  const nextBanner = () => {
    currentBanner.value = (currentBanner.value + 1) % banners.value.length
  }

  onMounted(() => {
    loadData()
    bannerInterval = setInterval(() => {
      nextBanner()
    }, 5000)
  })

  onUnmounted(() => {
    if (bannerInterval) {
      clearInterval(bannerInterval)
    }
  })
</script>
