<template>
  <div class="downloads-page">
    <div class="page-header">
      <h1>资料下载</h1>
      <p>获取备考资料、报名表格等学习资源</p>
    </div>

    <div class="downloads-container">
      <aside class="sidebar">
        <div class="category-nav">
          <h3>资料分类</h3>
          <button
            v-for="cat in categories"
            :key="cat.id"
            :class="['category-btn', { active: activeCategory === cat.id }]"
            @click="activeCategory = cat.id"
          >
            <span class="cat-icon">{{ cat.icon }}</span>
            <span class="cat-name">{{ cat.name }}</span>
            <span class="cat-count">{{ cat.count }}</span>
          </button>
        </div>
      </aside>

      <main class="main-content">
        <div class="download-guide">
          <div class="guide-icon">💡</div>
          <div class="guide-content">
            <h4>下载指引</h4>
            <p>点击资料卡片中的"下载"按钮，部分资料需跳转至外部网站下载，请根据页面提示操作。</p>
          </div>
        </div>

        <div class="materials-list" v-if="materials.length > 0">
          <div class="material-card" v-for="item in filteredMaterials" :key="item.id">
            <div class="material-icon" :class="item.file_type">
              {{ getTypeIcon(item.file_type) }}
            </div>
            <div class="material-info">
              <h4>{{ item.title }}</h4>
              <p class="material-desc">{{ item.description }}</p>
              <div class="material-meta">
                <span>分类：{{ getCategoryName(item.category) }}</span>
                <span>更新：{{ formatDate(item.created_at) }}</span>
                <span v-if="item.file_size">大小：{{ formatFileSize(item.file_size) }}</span>
                <span>下载：{{ item.download_count || 0 }}次</span>
              </div>
            </div>
            <div class="material-actions">
              <button
                class="btn-download"
                @click="downloadMaterial(item)"
              >
                📥 下载
              </button>
            </div>
          </div>
        </div>

        <div class="materials-empty" v-else>
          <p>暂无资料</p>
        </div>

        <!-- 分页 -->
        <div class="pagination" v-if="totalPages > 1">
          <button
            class="page-btn"
            :disabled="currentPage === 1"
            @click="currentPage--"
          >上一页</button>
          <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
          <button
            class="page-btn"
            :disabled="currentPage === totalPages"
            @click="currentPage++"
          >下一页</button>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { publicAPI } from '../api'

const activeCategory = ref('all')
const materials = ref([])
const currentPage = ref(1)
const pageSize = ref(12)
const totalMaterials = ref(0)

const categories = [
  { id: 'all', name: '全部资料', icon: '📁', count: 0 },
  { id: 'exam', name: '备考资料', icon: '📚', count: 0 },
  { id: 'form', name: '报名表格', icon: '📝', count: 0 },
  { id: 'past', name: '历年真题', icon: '📋', count: 0 }
]

const totalPages = computed(() => Math.ceil(totalMaterials.value / pageSize.value))

const filteredMaterials = computed(() => {
  return materials.value
})

const getTypeIcon = (type) => {
  const icons = {
    pdf: '📄',
    doc: '📃',
    docx: '📃',
    zip: '📦',
    xls: '📊',
    xlsx: '📊'
  }
  return icons[type] || '📁'
}

const getCategoryName = (category) => {
  const names = {
    exam: '备考资料',
    form: '报名表格',
    past: '历年真题'
  }
  return names[category] || '其他'
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

const formatFileSize = (bytes) => {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB'
  return (bytes / 1024 / 1024).toFixed(1) + 'MB'
}

const loadMaterials = async () => {
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value
    }
    if (activeCategory.value !== 'all') {
      params.category = activeCategory.value
    }

    const res = await publicAPI.getMaterials(params)
    materials.value = res.materials || []
    totalMaterials.value = res.pagination?.total || 0

    // 更新分类计数
    categories[0].count = res.pagination?.total || 0
  } catch (error) {
    console.error('加载资料失败:', error)
  }
}

const downloadMaterial = async (item) => {
  try {
    // 获取资料详情（会自动增加下载次数）
    const res = await publicAPI.getMaterialDetail(item.id)
    const material = res.material

    if (material.file_path) {
      // 创建下载链接
      const link = document.createElement('a')
      link.href = material.file_path
      link.download = material.title + '.' + (material.file_type || 'pdf')
      link.click()
      document.body.removeChild(link)
    } else {
      alert('该资料暂无下载链接')
    }
  } catch (error) {
    console.error('下载失败:', error)
    alert('下载失败，请稍后重试')
  }
}

// 监听分类和页码变化
watch([activeCategory, currentPage], () => {
  loadMaterials()
})

onMounted(() => {
  loadMaterials()
})
</script>
