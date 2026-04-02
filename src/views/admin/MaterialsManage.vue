<template>
  <div class="admin-page">
    <div class="page-toolbar">
      <div class="filter-group">
        <select v-model="filterCategory" @change="loadMaterials">
          <option value="">全部分类</option>
          <option value="exam">考试资料</option>
          <option value="study">学习资料</option>
          <option value="video">视频教程</option>
          <option value="other">其他</option>
        </select>
      </div>
      <button class="btn-primary" @click="showAddModal = true">
        + 添加资料
      </button>
    </div>
    
    <div class="data-table" v-if="!loading">
      <table>
        <thead>
          <tr>
            <th>资料名称</th>
            <th>分类</th>
            <th>文件类型</th>
            <th>文件大小</th>
            <th>下载次数</th>
            <th>上传时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="material in materials" :key="material.id">
            <td>{{ material.title }}</td>
            <td>{{ getCategoryLabel(material.category) }}</td>
            <td>{{ material.file_type || '-' }}</td>
            <td>{{ formatFileSize(material.file_size) }}</td>
            <td>{{ material.download_count }}</td>
            <td>{{ formatDate(material.created_at) }}</td>
            <td class="actions">
              <button class="btn-edit" @click="editMaterial(material)">编辑</button>
              <button class="btn-delete" @click="deleteMaterial(material)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div class="empty-state" v-if="materials.length === 0">
        暂无资料数据
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
    
    <div class="modal" v-if="showAddModal || editingMaterial">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingMaterial ? '编辑资料' : '添加资料' }}</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <form @submit.prevent="saveMaterial">
          <div class="form-group">
            <label>资料名称 *</label>
            <input type="text" v-model="materialForm.title" required />
          </div>
          <div class="form-group">
            <label>分类</label>
            <select v-model="materialForm.category">
              <option value="">请选择</option>
              <option value="exam">考试资料</option>
              <option value="study">学习资料</option>
              <option value="video">视频教程</option>
              <option value="other">其他</option>
            </select>
          </div>
          <div class="form-group">
            <label>文件路径</label>
            <input type="text" v-model="materialForm.file_path" placeholder="输入文件URL或路径" />
          </div>
          <div class="form-group">
            <label>文件类型</label>
            <input type="text" v-model="materialForm.file_type" placeholder="如: PDF, MP4" />
          </div>
          <div class="form-group">
            <label>文件大小(字节)</label>
            <input type="number" v-model="materialForm.file_size" min="0" />
          </div>
          <div class="form-group">
            <label>描述</label>
            <textarea v-model="materialForm.description" rows="3"></textarea>
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
const filterCategory = ref('')
const showAddModal = ref(false)
const editingMaterial = ref(null)

const materials = ref([])
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0
})

const materialForm = reactive({
  title: '',
  category: '',
  file_path: '',
  file_type: '',
  file_size: 0,
  description: ''
})

const categoryLabels = {
  'exam': '考试资料',
  'study': '学习资料',
  'video': '视频教程',
  'other': '其他'
}

const getCategoryLabel = (category) => categoryLabels[category] || category || '-'

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const formatFileSize = (bytes) => {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}

const loadMaterials = async () => {
  loading.value = true
  try {
    const params = {}
    if (filterCategory.value) params.category = filterCategory.value
    
    const response = await adminAPI.getMaterials(params)
    materials.value = response.materials
    pagination.total = response.pagination.total
    pagination.totalPages = response.pagination.totalPages
  } catch (error) {
    console.error('加载资料数据失败:', error)
    alert(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const changePage = (page) => {
  pagination.page = page
  loadMaterials()
}

const editMaterial = (material) => {
  editingMaterial.value = material
  Object.assign(materialForm, {
    title: material.title,
    category: material.category || '',
    file_path: material.file_path || '',
    file_type: material.file_type || '',
    file_size: material.file_size || 0,
    description: material.description || ''
  })
}

const deleteMaterial = async (material) => {
  if (!confirm(`确定要删除资料 "${material.title}" 吗？`)) return
  
  try {
    await adminAPI.deleteMaterial(material.id)
    loadMaterials()
  } catch (error) {
    alert(error.message || '删除失败')
  }
}

const closeModal = () => {
  showAddModal.value = false
  editingMaterial.value = null
  Object.assign(materialForm, {
    title: '',
    category: '',
    file_path: '',
    file_type: '',
    file_size: 0,
    description: ''
  })
}

const saveMaterial = async () => {
  saving.value = true
  try {
    if (editingMaterial.value) {
      await adminAPI.updateMaterial(editingMaterial.value.id, materialForm)
    } else {
      await adminAPI.createMaterial(materialForm)
    }
    closeModal()
    loadMaterials()
  } catch (error) {
    alert(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadMaterials()
})
</script>
