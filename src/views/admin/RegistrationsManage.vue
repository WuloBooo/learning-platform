<template>
  <div class="admin-page">
    <div class="page-toolbar">
      <div class="filter-group">
        <select v-model="filterStatus" @change="loadRegistrations">
          <option value="all">全部状态</option>
          <option value="pending">待审核</option>
          <option value="approved">已通过</option>
          <option value="rejected">已拒绝</option>
        </select>
      </div>
      <div class="search-box">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="搜索姓名或报名号..."
          @keyup.enter="loadRegistrations"
        />
      </div>
    </div>
    
    <div class="data-table" v-if="!loading">
      <table>
        <thead>
          <tr>
            <th>报名号</th>
            <th>姓名</th>
            <th>考试类型</th>
            <th>联系方式</th>
            <th>提交时间</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="reg in registrations" :key="reg.id">
            <td>{{ reg.registration_no }}</td>
            <td>{{ reg.name }}</td>
            <td>{{ getExamTypeLabel(reg.exam_type) }}</td>
            <td>
              <div class="contact-info">
                <span>{{ reg.phone }}</span>
                <span class="email">{{ reg.email || '-' }}</span>
              </div>
            </td>
            <td>{{ formatDate(reg.created_at) }}</td>
            <td>
              <span :class="['status-badge', reg.status]">
                {{ getStatusLabel(reg.status) }}
              </span>
            </td>
            <td class="actions">
              <button class="btn-view" @click="viewDetail(reg)">查看</button>
              <button 
                class="btn-approve" 
                v-if="reg.status === 'pending'"
                @click="updateStatus(reg, 'approved')"
              >
                通过
              </button>
              <button 
                class="btn-reject" 
                v-if="reg.status === 'pending'"
                @click="updateStatus(reg, 'rejected')"
              >
                拒绝
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div class="empty-state" v-if="registrations.length === 0">
        暂无报名记录
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
    
    <div class="modal" v-if="selectedRegistration">
      <div class="modal-content modal-lg">
        <div class="modal-header">
          <h3>报名详情</h3>
          <button class="close-btn" @click="selectedRegistration = null">×</button>
        </div>
        <div class="detail-content">
          <div class="detail-section">
            <h4>基本信息</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">报名号：</span>
                <span class="value">{{ selectedRegistration.registration_no }}</span>
              </div>
              <div class="detail-item">
                <span class="label">姓名：</span>
                <span class="value">{{ selectedRegistration.name }}</span>
              </div>
              <div class="detail-item">
                <span class="label">性别：</span>
                <span class="value">{{ selectedRegistration.gender === 'male' ? '男' : selectedRegistration.gender === 'female' ? '女' : '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">身份证号：</span>
                <span class="value">{{ selectedRegistration.id_card || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">手机号码：</span>
                <span class="value">{{ selectedRegistration.phone }}</span>
              </div>
              <div class="detail-item">
                <span class="label">电子邮箱：</span>
                <span class="value">{{ selectedRegistration.email || '-' }}</span>
              </div>
            </div>
          </div>
          <div class="detail-section">
            <h4>报考信息</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">考试类型：</span>
                <span class="value">{{ getExamTypeLabel(selectedRegistration.exam_type) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">报考级别：</span>
                <span class="value">{{ getExamLevelLabel(selectedRegistration.exam_level) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">工作经验：</span>
                <span class="value">{{ selectedRegistration.has_experience ? '有' : '无' }}</span>
              </div>
              <div class="detail-item" v-if="selectedRegistration.experience">
                <span class="label">工作经历：</span>
                <span class="value">{{ selectedRegistration.experience }}</span>
              </div>
            </div>
          </div>
          <div class="detail-section">
            <h4>教育背景</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">最高学历：</span>
                <span class="value">{{ getEducationLabel(selectedRegistration.education) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">毕业院校：</span>
                <span class="value">{{ selectedRegistration.school || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">所学专业：</span>
                <span class="value">{{ selectedRegistration.major || '-' }}</span>
              </div>
            </div>
          </div>
          <div class="detail-section">
            <h4>审核状态</h4>
            <div class="status-actions">
              <span :class="['status-badge', selectedRegistration.status, 'lg']">
                {{ getStatusLabel(selectedRegistration.status) }}
              </span>
              <div class="action-buttons" v-if="selectedRegistration.status === 'pending'">
                <button class="btn-approve" @click="updateStatus(selectedRegistration, 'approved')">
                  ✓ 审核通过
                </button>
                <button class="btn-reject" @click="updateStatus(selectedRegistration, 'rejected')">
                  ✗ 拒绝申请
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { registrationAPI } from '../../api'

const loading = ref(false)
const filterStatus = ref('all')
const searchQuery = ref('')
const selectedRegistration = ref(null)

const registrations = ref([])
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0
})

const examTypeLabels = {
  'ai': '人工智能训练师',
  'data': '数据分析',
  'software': '软件开发',
  'python': 'Python数据分析',
  'web': 'Web前端开发'
}

const examLevelLabels = {
  '5': '五级（初级）',
  '4': '四级（中级）',
  '3': '三级（高级）'
}

const educationLabels = {
  'high_school': '高中',
  'college': '大专',
  'bachelor': '本科',
  'master': '硕士',
  'doctor': '博士'
}

const getExamTypeLabel = (type) => examTypeLabels[type] || type || '-'
const getExamLevelLabel = (level) => examLevelLabels[level] || level || '-'
const getEducationLabel = (edu) => educationLabels[edu] || edu || '-'

const getStatusLabel = (status) => {
  const labels = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝'
  }
  return labels[status] || status
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const loadRegistrations = async () => {
  loading.value = true
  try {
    const response = await registrationAPI.getAll()
    let data = response.registrations
    
    if (filterStatus.value !== 'all') {
      data = data.filter(r => r.status === filterStatus.value)
    }
    
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      data = data.filter(r => 
        r.name?.toLowerCase().includes(query) || 
        r.registration_no?.toLowerCase().includes(query)
      )
    }
    
    pagination.total = data.length
    pagination.totalPages = Math.ceil(data.length / pagination.pageSize)
    
    const start = (pagination.page - 1) * pagination.pageSize
    registrations.value = data.slice(start, start + pagination.pageSize)
  } catch (error) {
    console.error('加载报名数据失败:', error)
    alert(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const changePage = (page) => {
  pagination.page = page
  loadRegistrations()
}

const viewDetail = (reg) => {
  selectedRegistration.value = reg
}

const updateStatus = async (reg, status) => {
  try {
    await registrationAPI.updateStatus(reg.id, status)
    reg.status = status
    if (selectedRegistration.value?.id === reg.id) {
      selectedRegistration.value.status = status
    }
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

onMounted(() => {
  loadRegistrations()
})
</script>
