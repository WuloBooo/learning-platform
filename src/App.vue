<template>
  <div class="app-container">
    <header class="header" v-if="!isAuthPage">
      <div class="header-content">
        <div class="logo" @click="goHome">
          <span class="logo-icon">📚</span>
          <span class="logo-text">智能学习平台</span>
        </div>
        <nav class="nav">
          <router-link to="/" class="nav-link" exact-active-class="active">首页</router-link>
          <router-link to="/registration" class="nav-link" active-class="active">报名中心</router-link>
          <router-link to="/practice" class="nav-link" active-class="active" v-if="userStore.isLoggedIn">刷题中心</router-link>
          <router-link to="/downloads" class="nav-link" active-class="active">资料下载</router-link>
          <router-link to="/exams" class="nav-link" active-class="active">考试信息</router-link>
          <router-link to="/browser" class="nav-link" active-class="active">操作指引</router-link>
          <span class="nav-link ai-service" @click="openAIService">AI客服</span>
        </nav>
        <div class="user-area">
          <template v-if="userStore.isLoggedIn">
            <span class="username">{{ userStore.user?.username }}</span>
            <button class="btn-logout" @click="logout">退出</button>
          </template>
          <template v-else>
            <router-link to="/login" class="btn-login">登录</router-link>
            <router-link to="/register" class="btn-register">注册</router-link>
          </template>
        </div>
      </div>
    </header>
    
    <main class="main-content">
      <router-view />
    </main>
    
    <footer class="footer" v-if="!isAuthPage">
      <div class="footer-content">
        <div class="footer-section">
          <h4>关于我们</h4>
          <p class="about-text">智能学习平台是专注于职业技能培训和考试服务的在线教育平台，致力于为学员提供优质的培训课程和考试辅导服务。</p>
          <div class="contact-info">
            <p>📞 咨询电话：400-888-9999</p>
            <p>📧 邮箱：service@learning.com</p>
            <p>🕐 服务时间：周一至周五 9:00-18:00</p>
          </div>
        </div>
        <div class="footer-section">
          <h4>快速链接</h4>
          <router-link to="/registration">📝 立即报名</router-link>
          <router-link to="/downloads">📥 资料下载</router-link>
          <router-link to="/exams">📅 考试信息</router-link>
          <router-link to="/practice" v-if="userStore.isLoggedIn">✍️ 刷题中心</router-link>
        </div>
        <div class="footer-section">
          <h4>帮助中心</h4>
          <a href="#" @click.prevent="openAIService">🤖 在线客服</a>
          <router-link to="/browser">📖 操作指引</router-link>
          <a href="#" @click.prevent="showFAQ">❓ 常见问题</a>
          <a href="#" @click.prevent="showFeedback">💬 意见反馈</a>
        </div>
        <div class="footer-section">
          <h4>热门课程</h4>
          <a href="#">Python数据分析</a>
          <a href="#">人工智能应用师</a>
          <a href="#">Web全栈开发</a>
          <a href="#">计算机二级培训</a>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© 2024 智能学习平台 版权所有 | 备案号：京ICP备XXXXXXXX号</p>
        <div class="footer-links">
          <a href="#">隐私政策</a>
          <span class="divider">|</span>
          <a href="#">服务条款</a>
          <span class="divider">|</span>
          <a href="#">网站地图</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from './stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const isAuthPage = computed(() => {
  return route.path === '/login' || route.path === '/register'
})

const goHome = () => {
  router.push('/')
}

const logout = () => {
  userStore.logout()
  router.push('/')
}

const openAIService = () => {
  const maxkbBtn = document.querySelector('.maxkb-chat-button')
  if (maxkbBtn) {
    maxkbBtn.click()
  }
}

const showFAQ = () => {
  alert('常见问题：\n\n1. 如何注册账号？\n点击右上角"注册"按钮，填写信息即可。\n\n2. 报名后如何查看状态？\n登录后在个人中心查看报名记录。\n\n3. 忘记密码怎么办？\n点击登录页"忘记密码"进行重置。\n\n更多问题请联系在线客服。')
}

const showFeedback = () => {
  alert('感谢您的反馈！\n\n如有意见或建议，请发送邮件至：\nservice@learning.com\n\n我们会尽快处理您的反馈。')
}
</script>
