<template>
  <div class="register-page">
    <div class="register-container">
      <div class="register-header">
        <h1>创建账户</h1>
        <p>开启您的学习之旅</p>
      </div>
      
      <form class="register-form" @submit.prevent="handleRegister">
        <div class="form-group">
          <label>用户名</label>
          <input 
            type="text" 
            v-model="form.username" 
            placeholder="请输入用户名（3-50个字符）"
            required
            minlength="3"
            maxlength="50"
          />
        </div>
        
        <div class="form-group">
          <label>邮箱</label>
          <input 
            type="email" 
            v-model="form.email" 
            placeholder="请输入邮箱"
            required
          />
        </div>
        
        <div class="form-group">
          <label>密码</label>
          <input 
            type="password" 
            v-model="form.password" 
            placeholder="请输入密码（至少6位，需包含字母和数字）"
            required
            minlength="6"
          />
        </div>
        
        <div class="form-group">
          <label>确认密码</label>
          <input 
            type="password" 
            v-model="form.confirmPassword" 
            placeholder="请再次输入密码"
            required
          />
        </div>
        
        <div class="error-message" v-if="errorMessage">
          {{ errorMessage }}
        </div>
        
        <button type="submit" class="btn-register" :disabled="loading">
          {{ loading ? '注册中...' : '注册' }}
        </button>
        
        <p class="login-link">
          已有账户？ <router-link to="/login">立即登录</router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const errorMessage = ref('')
const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const handleRegister = async () => {
  if (form.password !== form.confirmPassword) {
    errorMessage.value = '两次输入的密码不一致'
    return
  }
  
  if (form.password.length < 6) {
    errorMessage.value = '密码长度至少6个字符'
    return
  }
  
  if (!/^(?=.*[a-zA-Z])(?=.*\d)/.test(form.password)) {
    errorMessage.value = '密码必须包含字母和数字'
    return
  }
  
  loading.value = true
  errorMessage.value = ''
  
  const result = await userStore.register(form.username, form.email, form.password, form.confirmPassword)
  
  if (result.success) {
    router.push('/')
  } else {
    errorMessage.value = result.message
  }
  
  loading.value = false
}
</script>
