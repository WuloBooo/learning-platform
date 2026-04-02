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
          <h4>联系我们</h4>
          <p>咨询电话：400-XXX-XXXX</p>
          <p>服务时间：周一至周五 9:00-18:00</p>
          <p>邮箱：service@example.com</p>
        </div>
        <div class="footer-section">
          <h4>快速链接</h4>
          <router-link to="/registration">立即报名</router-link>
          <router-link to="/downloads">资料下载</router-link>
          <router-link to="/exams">考试信息</router-link>
        </div>
        <div class="footer-section">
          <h4>帮助中心</h4>
          <a href="#" @click.prevent="openAIService">在线客服</a>
          <router-link to="/browser">操作指引</router-link>
          <a href="#">常见问题</a>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© 2024 智能学习平台 版权所有</p>
        <div class="footer-links">
          <a href="#">隐私政策</a>
          <a href="#">服务条款</a>
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
</script>
