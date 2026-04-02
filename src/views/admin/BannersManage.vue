<template>
  <div class="admin-page">
    <div class="page-toolbar">
      <button class="btn-primary" @click="showAddModal = true">
        + 添加Banner
      </button>
    </div>
    
    <div class="banner-list" v-if="!loading">
      <div class="banner-item" v-for="banner in banners" :key="banner.id">
        <div class="banner-preview">
          <img v-if="banner.image_url" :src="banner.image_url" :alt="banner.title" />
          <div v-else class="no-image">暂无图片</div>
        </div>
        <div class="banner-info">
          <h4>{{ banner.title }}</h4>
          <p class="subtitle">{{ banner.subtitle || '-' }}</p>
          <p class="link">{{ banner.link_url || '无链接' }}</p>
          <span class="sort-order">排序: {{ banner.sort_order }}</span>
        </div>
        <div class="banner-actions">
          <button class="btn-edit" @click="editBanner(banner)">编辑</button>
          <button class="btn-delete" @click="deleteBanner(banner)">删除</button>
        </div>
      </div>
      
      <div class="empty-state" v-if="banners.length === 0">
        暂无Banner数据
      </div>
    </div>
    
    <div class="loading-state" v-if="loading">
      加载中...
    </div>
    
    <div class="modal" v-if="showAddModal || editingBanner">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingBanner ? '编辑Banner' : '添加Banner' }}</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <form @submit.prevent="saveBanner">
          <div class="form-group">
            <label>标题 *</label>
            <input type="text" v-model="bannerForm.title" required />
          </div>
          <div class="form-group">
            <label>副标题</label>
            <input type="text" v-model="bannerForm.subtitle" />
          </div>
          <div class="form-group">
            <label>图片URL</label>
            <input type="text" v-model="bannerForm.image_url" placeholder="输入图片URL" />
          </div>
          <div class="form-group">
            <label>链接地址</label>
            <input type="text" v-model="bannerForm.link_url" placeholder="点击跳转的链接" />
          </div>
          <div class="form-group">
            <label>排序</label>
            <input type="number" v-model="bannerForm.sort_order" min="0" />
            <small>数字越小越靠前</small>
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
const editingBanner = ref(null)

const banners = ref([])

const bannerForm = reactive({
  title: '',
  subtitle: '',
  image_url: '',
  link_url: '',
  sort_order: 0
})

const loadBanners = async () => {
  loading.value = true
  try {
    const response = await adminAPI.getBanners()
    banners.value = response.banners
  } catch (error) {
    console.error('加载Banner数据失败:', error)
    alert(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const editBanner = (banner) => {
  editingBanner.value = banner
  Object.assign(bannerForm, {
    title: banner.title,
    subtitle: banner.subtitle || '',
    image_url: banner.image_url || '',
    link_url: banner.link_url || '',
    sort_order: banner.sort_order || 0
  })
}

const deleteBanner = async (banner) => {
  if (!confirm(`确定要删除Banner "${banner.title}" 吗？`)) return
  
  try {
    await adminAPI.deleteBanner(banner.id)
    loadBanners()
  } catch (error) {
    alert(error.message || '删除失败')
  }
}

const closeModal = () => {
  showAddModal.value = false
  editingBanner.value = null
  Object.assign(bannerForm, {
    title: '',
    subtitle: '',
    image_url: '',
    link_url: '',
    sort_order: 0
  })
}

const saveBanner = async () => {
  saving.value = true
  try {
    if (editingBanner.value) {
      await adminAPI.updateBanner(editingBanner.value.id, bannerForm)
    } else {
      await adminAPI.createBanner(bannerForm)
    }
    closeModal()
    loadBanners()
  } catch (error) {
    alert(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadBanners()
})
</script>

<style scoped>
.banner-list {
  display: grid;
  gap: 16px;
}

.banner-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.banner-preview {
  width: 200px;
  height: 100px;
  border-radius: 4px;
  overflow: hidden;
  background: #f5f5f5;
  flex-shrink: 0;
}

.banner-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-image {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
  font-size: 14px;
}

.banner-info {
  flex: 1;
}

.banner-info h4 {
  margin: 0 0 8px;
  font-size: 16px;
}

.banner-info .subtitle {
  color: #666;
  font-size: 14px;
  margin: 0 0 4px;
}

.banner-info .link {
  color: #999;
  font-size: 12px;
  margin: 0 0 8px;
}

.banner-info .sort-order {
  font-size: 12px;
  color: #4F46E5;
}

.banner-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
