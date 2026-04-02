<template>
  <div class="admin-page">
    <div class="page-toolbar">
      <button class="btn-primary" @click="showAddModal = true">
        + 添加新闻
      </button>
    </div>

    <div class="data-table" v-if="!loading">
      <table>
        <thead>
          <tr>
            <th>标题</th>
            <th>类型</th>
            <th>摘要</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="news in newsList" :key="news.id">
            <td>{{ news.title }}</td>
            <td>
              <span :class="['type-tag', news.type]">
                {{ getTypeLabel(news.type) }}
              </span>
            </td>
            <td class="summary-cell">{{ news.summary || '-' }}</td>
            <td>{{ formatDate(news.created_at) }}</td>
            <td class="actions">
              <button class="btn-edit" @click="editNews(news)">编辑</button>
              <button class="btn-delete" @click="deleteNews(news)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="empty-state" v-if="newsList.length === 0">
        暂无新闻数据
      </div>
    </div>

    <div class="loading-state" v-if="loading">
      加载中...
    </div>

    <div class="modal" v-if="showAddModal || editingNews">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingNews ? '编辑新闻' : '添加新闻' }}</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <form @submit.prevent="saveNews">
          <div class="form-group">
            <label>标题 *</label>
            <input type="text" v-model="newsForm.title" required />
          </div>
          <div class="form-group">
            <label>类型</label>
            <select v-model="newsForm.type">
              <option value="notice">政策通知</option>
              <option value="exam">考试通知</option>
              <option value="training">培训动态</option>
            </select>
          </div>
          <div class="form-group">
            <label>摘要</label>
            <textarea v-model="newsForm.summary" rows="2"></textarea>
          </div>
          <div class="form-group">
            <label>内容</label>
            <textarea v-model="newsForm.content" rows="5"></textarea>
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
const showAddModal = ref(false)
const editingNews = ref(null)

const newsList = ref([])

const newsForm = reactive({
  title: '',
  type: 'notice',
  summary: '',
  content: ''
})

const getTypeLabel = (type) => {
  const labels = {
    notice: '政策通知',
    exam: '考试通知',
    training: '培训动态'
  }
  return labels[type] || type
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const loadNews = async () => {
  loading.value = true
  try {
    const response = await adminAPI.getNews({ pageSize: 50 })
    newsList.value = response.news || []
  } catch (error) {
    console.error('加载新闻数据失败:', error)
    alert(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const editNews = (news) => {
  editingNews.value = news
  Object.assign(newsForm, {
    title: news.title,
    type: news.type || 'notice',
    summary: news.summary || '',
    content: news.content || ''
  })
}

const deleteNews = async (news) => {
  if (!confirm(`确定要删除新闻 "${news.title}" 吗？`)) return

  try {
    await adminAPI.deleteNews(news.id)
    loadNews()
  } catch (error) {
    alert(error.message || '删除失败')
  }
}

const closeModal = () => {
  showAddModal.value = false
  editingNews.value = null
  Object.assign(newsForm, {
    title: '',
    type: 'notice',
    summary: '',
    content: ''
  })
}

const saveNews = async () => {
  saving.value = true
  try {
    if (editingNews.value) {
      await adminAPI.updateNews(editingNews.value.id, newsForm)
    } else {
      await adminAPI.createNews(newsForm)
    }
    closeModal()
    loadNews()
  } catch (error) {
    alert(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadNews()
})
</script>

<style scoped>
.data-table {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

th {
  background: #f8f9fa;
  font-weight: 600;
  color: #333;
}

.type-tag {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.type-tag.notice {
  background: #e3f2fd;
  color: #1976d2;
}

.type-tag.exam {
  background: #fff3e0;
  color: #f57c00;
}

.type-tag.training {
  background: #e8f5e9;
  color: #388e3c;
}

.summary-cell {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #666;
  font-size: 14px;
}

.actions {
  display: flex;
  gap: 8px;
}
</style>
