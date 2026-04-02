import { defineStore } from 'pinia'
import { authAPI, userAPI } from '../api'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
    loading: false,
    error: null
  }),
  
  getters: {
    isLoggedIn: (state) => !!state.token && !!state.user
  },
  
  actions: {
    async login(username, password) {
      this.loading = true
      this.error = null
      
      try {
        const response = await authAPI.login({ username, password })
        
        this.token = response.token
        this.user = response.user
        
        localStorage.setItem('token', response.token)
        localStorage.setItem('user', JSON.stringify(response.user))
        
        return { success: true }
      } catch (error) {
        this.error = error.message
        return { success: false, message: error.message }
      } finally {
        this.loading = false
      }
    },
    
    async register(username, email, password, confirmPassword) {
      this.loading = true
      this.error = null

      try {
        const response = await authAPI.register({ username, email, password, confirmPassword })
        
        this.token = response.token
        this.user = response.user
        
        localStorage.setItem('token', response.token)
        localStorage.setItem('user', JSON.stringify(response.user))
        
        return { success: true }
      } catch (error) {
        this.error = error.message
        return { success: false, message: error.message }
      } finally {
        this.loading = false
      }
    },
    
    async logout() {
      try {
        await authAPI.logout()
      } catch (error) {
        console.error('Logout error:', error)
      }
      
      this.user = null
      this.token = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },
    
    async fetchProfile() {
      try {
        const response = await userAPI.getProfile()
        this.user = response.user
        localStorage.setItem('user', JSON.stringify(response.user))
        return response.user
      } catch (error) {
        console.error('Fetch profile error:', error)
        return null
      }
    },
    
    async updateProfile(data) {
      try {
        const response = await userAPI.updateProfile(data)
        this.user = response.user
        localStorage.setItem('user', JSON.stringify(response.user))
        return { success: true }
      } catch (error) {
        return { success: false, message: error.message }
      }
    },
    
    async changePassword(currentPassword, newPassword) {
      try {
        await userAPI.changePassword({ currentPassword, newPassword })
        return { success: true }
      } catch (error) {
        return { success: false, message: error.message }
      }
    },
    
    initFromStorage() {
      const token = localStorage.getItem('token')
      const user = localStorage.getItem('user')
      
      if (token && user) {
        this.token = token
        this.user = JSON.parse(user)
      }
    }
  }
})
