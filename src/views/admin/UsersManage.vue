<template>
  <div class="admin-page">
    <div class="page-toolbar">
      <div class="search-box">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="搜索用户名或邮箱..."
          @keyup.enter="loadUsers"
        />
      </div>
      <div class="filter-group">
        <select v-model="filterRole" @change="loadUsers">
          <option value="">全部角色</option>
          <option value="student">学生</option>
          <option value="admin">管理员</option>
        </select>
        <select v-model="filterStatus" @change="loadUsers">
          <option value="">全部状态</option>
          <option value="active">正常</option>
          <option value="inactive">禁用</option>
        </select>
      </div>
      <button class="btn-primary" @click="showAddModal = true">
        + 添加用户
      </button>
    </div>
    
    <div class="data-table" v-if="!loading">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>用户名</th>
            <th>邮箱</th>
            <th>角色</th>
            <th>状态</th>
            <th>注册时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.id }}</td>
            <td>{{ user.username }}</td>
            <td>{{ user.email }}</td>
            <td>
              <span :class="['role-badge', user.role]">
                {{ user.role === 'admin' ? '管理员' : '学生' }}
              </span>
            </td>
            <td>
              <span :class="['status-badge', user.status]">
                {{ user.status === 'active' ? '正常' : '禁用' }}
              </span>
            </td>
            <td>{{ formatDate(user.created_at) }}</td>
            <td class="actions">
              <button class="btn-edit" @click="editUser(user)">编辑</button>
              <button 
                class="btn-toggle" 
                @click="toggleUserStatus(user)"
                :class="{ disable: user.status === 'active' }"
              >
                {{ user.status === 'active' ? '禁用' : '启用' }}
              </button>
              <button class="btn-delete" @click="deleteUser(user)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div class="empty-state" v-if="users.length === 0">
        暂无用户数据
      </div>
      
      <div class="pagination" v-if="pagination.totalPages > 1">
        <button 
          :disabled="pagination.page === 1" 
          @click="changePage(pagination.page - 1)"
        >
          上一页
        </button>
        <span>第 {{ pagination.page }} / {{ pagination.totalPages }} 页</span>
        <button 
          :disabled="pagination.page === pagination.totalPages" 
          @click="changePage(pagination.page + 1)"
        >
          下一页
        </button>
      </div>
    </div>
    
    <div class="loading-state" v-if="loading">
      加载中...
    </div>
    
    <div class="modal" v-if="showAddModal || editingUser">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingUser ? '编辑用户' : '添加用户' }}</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <form @submit.prevent="saveUser">
          <div class="form-group">
            <label>用户名</label>
            <input type="text" v-model="userForm.username" required />
          </div>
          <div class="form-group">
            <label>邮箱</label>
            <input type="email" v-model="userForm.email" required />
          </div>
          <div class="form-group" v-if="!editingUser">
            <label>密码</label>
            <input type="password" v-model="userForm.password" required />
          </div>
          <div class="form-group">
            <label>角色</label>
            <select v-model="userForm.role">
              <option value="student">学生</option>
              <option value="admin">管理员</option>
            </select>
          </div>
          <div class="form-group">
            <label>状态</label>
            <select v-model="userForm.status">
              <option value="active">正常</option>
              <option value="inactive">禁用</option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="closeModal">取消</button>
            <button type="submit" class="btn-primary" :disabled="saving">
              {{ saving ? '保存中...' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { adminAPI } from '../../api'

const loading = ref(false)
const saving = ref(false)
const searchQuery = ref('')
const filterRole = ref('')
const filterStatus = ref('')
const showAddModal = ref(false)
const editingUser = ref(null)

const users = ref([])
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0
})

const userForm = reactive({
  username: '',
  email: '',
  password: '',
  role: 'student',
  status: 'active'
})

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const loadUsers = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (searchQuery.value) params.search = searchQuery.value
    if (filterRole.value) params.role = filterRole.value
    if (filterStatus.value) params.status = filterStatus.value
    
    const response = await adminAPI.getUsers(params)
    users.value = response.users
    pagination.total = response.pagination.total
    pagination.totalPages = response.pagination.totalPages
  } catch (error) {
    console.error('加载用户失败:', error)
    alert(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const changePage = (page) => {
  pagination.page = page
  loadUsers()
}

const editUser = (user) => {
  editingUser.value = user
  Object.assign(userForm, {
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status
  })
}

const toggleUserStatus = async (user) => {
  const newStatus = user.status === 'active' ? 'inactive' : 'active'
  try {
    await adminAPI.updateUser(user.id, { status: newStatus })
    user.status = newStatus
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

const deleteUser = async (user) => {
  if (!confirm(`确定要删除用户 "${user.username}" 吗？`)) return
  
  try {
    await adminAPI.deleteUser(user.id)
    loadUsers()
  } catch (error) {
    alert(error.message || '删除失败')
  }
}

const closeModal = () => {
  showAddModal.value = false
  editingUser.value = null
  Object.assign(userForm, {
    username: '',
    email: '',
    password: '',
    role: 'student',
    status: 'active'
  })
}

const saveUser = async () => {
  saving.value = true
  try {
    if (editingUser.value) {
      await adminAPI.updateUser(editingUser.value.id, userForm)
    } else {
      await adminAPI.createUser(userForm)
    }
    closeModal()
    loadUsers()
  } catch (error) {
    alert(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadUsers()
})
</script>
