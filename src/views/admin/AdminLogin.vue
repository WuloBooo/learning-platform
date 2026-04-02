<template>
  <div class="admin-login-page">
    <div class="login-container">
      <div class="login-header">
        <span class="logo">📚</span>
        <h1>管理后台登录</h1>
        <p>请使用管理员账号登录</p>
      </div>
      
      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label>用户名</label>
          <input 
            type="text" 
            v-model="form.username" 
            placeholder="请输入管理员用户名"
            required
          />
        </div>
        
        <div class="form-group">
          <label>密码</label>
          <input 
            type="password" 
            v-model="form.password" 
            placeholder="请输入密码"
            required
          />
        </div>
        
        <div class="error-message" v-if="errorMessage">
          {{ errorMessage }}
        </div>
        
        <button type="submit" class="btn-login" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>
      
      <div class="login-footer">
        <router-link to="/">← 返回前台首页</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const errorMessage = ref('')
const form = reactive({
  username: '',
  password: ''
})

const handleLogin = async () => {
  if (!form.username || !form.password) {
    errorMessage.value = '请填写用户名和密码'
    return
  }
  
  loading.value = true
  errorMessage.value = ''
  
  try {
    const result = await userStore.login(form.username, form.password)
    
    if (result.success) {
      if (userStore.user?.role !== 'admin') {
        errorMessage.value = '您不是管理员，无法登录后台'
        userStore.logout()
      } else {
        router.push('/admin')
      }
    } else {
      errorMessage.value = result.message
    }
  } catch (error) {
    errorMessage.value = '登录失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>
