<template>
  <div class="admin-page">
    <div class="page-toolbar">
      <div class="filter-group">
        <select v-model="filterStatus" @change="loadExams">
          <option value="">全部状态</option>
          <option value="upcoming">即将开始</option>
          <option value="ongoing">进行中</option>
          <option value="ended">已结束</option>
        </select>
      </div>
      <button class="btn-primary" @click="showAddModal = true">
        + 添加考试
      </button>
    </div>
    
    <div class="data-table" v-if="!loading">
      <table>
        <thead>
          <tr>
            <th>考试名称</th>
            <th>考试类型</th>
            <th>考试日期</th>
            <th>地点</th>
            <th>报名人数</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="exam in exams" :key="exam.id">
            <td>{{ exam.name }}</td>
            <td>{{ getExamTypeLabel(exam.exam_type) }}</td>
            <td>{{ formatDate(exam.exam_date) }}</td>
            <td>{{ exam.location || '-' }}</td>
            <td>{{ exam.current_participants }} / {{ exam.max_participants }}</td>
            <td>
              <span :class="['status-badge', exam.status]">
                {{ getStatusLabel(exam.status) }}
              </span>
            </td>
            <td class="actions">
              <button class="btn-edit" @click="editExam(exam)">编辑</button>
              <button class="btn-delete" @click="deleteExam(exam)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div class="empty-state" v-if="exams.length === 0">
        暂无考试数据
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
    
    <div class="modal" v-if="showAddModal || editingExam">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingExam ? '编辑考试' : '添加考试' }}</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <form @submit.prevent="saveExam">
          <div class="form-group">
            <label>考试名称 *</label>
            <input type="text" v-model="examForm.name" required />
          </div>
          <div class="form-group">
            <label>考试类型 *</label>
            <select v-model="examForm.exam_type" required>
              <option value="">请选择</option>
              <option value="ai">人工智能训练师</option>
              <option value="data">数据分析</option>
              <option value="software">软件开发</option>
              <option value="python">Python数据分析</option>
              <option value="web">Web前端开发</option>
            </select>
          </div>
          <div class="form-group">
            <label>考试日期</label>
            <input type="date" v-model="examForm.exam_date" />
          </div>
          <div class="form-group">
            <label>考试地点</label>
            <input type="text" v-model="examForm.location" />
          </div>
          <div class="form-group">
            <label>最大人数</label>
            <input type="number" v-model="examForm.max_participants" min="1" />
          </div>
          <div class="form-group">
            <label>考试说明</label>
            <textarea v-model="examForm.description" rows="3"></textarea>
          </div>
          <div class="form-group" v-if="editingExam">
            <label>状态</label>
            <select v-model="examForm.status">
              <option value="upcoming">即将开始</option>
              <option value="ongoing">进行中</option>
              <option value="ended">已结束</option>
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
const filterStatus = ref('')
const showAddModal = ref(false)
const editingExam = ref(null)

const exams = ref([])
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0
})

const examForm = reactive({
  name: '',
  exam_type: '',
  exam_date: '',
  location: '',
  max_participants: 100,
  description: '',
  status: 'upcoming'
})

const examTypeLabels = {
  'ai': '人工智能训练师',
  'data': '数据分析',
  'software': '软件开发',
  'python': 'Python数据分析',
  'web': 'Web前端开发'
}

const getExamTypeLabel = (type) => examTypeLabels[type] || type || '-'

const getStatusLabel = (status) => {
  const labels = {
    upcoming: '即将开始',
    ongoing: '进行中',
    ended: '已结束'
  }
  return labels[status] || status
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const loadExams = async () => {
  loading.value = true
  try {
    const params = {}
    if (filterStatus.value) params.status = filterStatus.value
    
    const response = await adminAPI.getExams(params)
    exams.value = response.exams
    pagination.total = response.pagination.total
    pagination.totalPages = response.pagination.totalPages
  } catch (error) {
    console.error('加载考试数据失败:', error)
    alert(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const changePage = (page) => {
  pagination.page = page
  loadExams()
}

const editExam = (exam) => {
  editingExam.value = exam
  Object.assign(examForm, {
    name: exam.name,
    exam_type: exam.exam_type,
    exam_date: exam.exam_date || '',
    location: exam.location || '',
    max_participants: exam.max_participants,
    description: exam.description || '',
    status: exam.status
  })
}

const deleteExam = async (exam) => {
  if (!confirm(`确定要删除考试 "${exam.name}" 吗？`)) return
  
  try {
    await adminAPI.deleteExam(exam.id)
    loadExams()
  } catch (error) {
    alert(error.message || '删除失败')
  }
}

const closeModal = () => {
  showAddModal.value = false
  editingExam.value = null
  Object.assign(examForm, {
    name: '',
    exam_type: '',
    exam_date: '',
    location: '',
    max_participants: 100,
    description: '',
    status: 'upcoming'
  })
}

const saveExam = async () => {
  saving.value = true
  try {
    if (editingExam.value) {
      await adminAPI.updateExam(editingExam.value.id, examForm)
    } else {
      await adminAPI.createExam(examForm)
    }
    closeModal()
    loadExams()
  } catch (error) {
    alert(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadExams()
})
</script>
