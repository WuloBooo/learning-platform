<template>
  <div class="page-container">
    <div class="page-header">
      <h1>专业目录查询</h1>
      <p>输入你的专业名称，查询是否可以报考人工智能训练师</p>
    </div>

    <div class="search-box">
      <input
        v-model="keyword"
        placeholder="请输入专业名称，如：计算机应用技术"
        @keyup.enter="searchMajor"
      />
      <button class="btn-primary" @click="searchMajor" :disabled="loading">
        {{ loading ? '查询中...' : '查询' }}
      </button>
    </div>

    <div class="result-section" v-if="searched">
      <div v-if="results.length > 0" class="result-list">
        <div v-for="item in results" :key="item.id" class="result-card match">
          <div class="result-icon">✅</div>
          <div class="result-info">
            <h3>{{ item.major_name }}</h3>
            <p v-if="item.category">分类：{{ item.category }}</p>
            <p v-if="item.allowed_levels">可报考等级：{{ item.allowed_levels }}</p>
          </div>
        </div>
      </div>
      <div v-else class="no-match">
        <div class="no-match-icon">❌</div>
        <h3>未找到匹配的专业</h3>
        <p>该专业可能不在当前可报考目录中，建议联系老师确认</p>
      </div>
    </div>

    <div class="catalog-section">
      <h2>全部可报考专业目录</h2>
      <button class="btn-toggle" @click="showAll = !showAll">
        {{ showAll ? '收起目录' : '展开目录' }}
      </button>
      <div v-if="showAll" class="catalog-list">
        <div v-if="allMajors.length === 0" class="empty">暂无专业数据，管理员可在后台添加</div>
        <div v-for="item in allMajors" :key="item.id" class="catalog-item">
          <span class="major-name">{{ item.major_name }}</span>
          <span v-if="item.category" class="major-category">{{ item.category }}</span>
          <span v-if="item.allowed_levels" class="major-levels">{{ item.allowed_levels }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const API_BASE = '/api/workflow'
const keyword = ref('')
const results = ref([])
const allMajors = ref([])
const loading = ref(false)
const searched = ref(false)
const showAll = ref(false)

const searchMajor = async () => {
  if (!keyword.value.trim()) return
  loading.value = true
  searched.value = true
  try {
    const res = await fetch(`${API_BASE}/major/search?keyword=${encodeURIComponent(keyword.value)}`)
    const data = await res.json()
    results.value = data.data || []
  } catch (e) {
    results.value = []
  }
  loading.value = false
}

const loadAllMajors = async () => {
  try {
    const res = await fetch(`${API_BASE}/major/list`)
    const data = await res.json()
    allMajors.value = data.data || []
  } catch (e) {
    allMajors.value = []
  }
}

onMounted(loadAllMajors)
</script>

<style scoped>
.page-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
}
.page-header {
  text-align: center;
  margin-bottom: 30px;
}
.page-header h1 {
  font-size: 28px;
  margin-bottom: 8px;
}
.page-header p {
  color: var(--text-secondary);
}
.search-box {
  display: flex;
  gap: 12px;
  margin-bottom: 30px;
}
.search-box input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 16px;
}
.search-box input:focus {
  outline: none;
  border-color: var(--primary-color);
}
.result-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-radius: var(--radius-md);
  margin-bottom: 12px;
  border: 1px solid #10b981;
  background: #f0fdf4;
}
.result-icon {
  font-size: 24px;
}
.result-info h3 {
  font-size: 18px;
  margin-bottom: 4px;
}
.result-info p {
  color: var(--text-secondary);
  font-size: 14px;
}
.no-match {
  text-align: center;
  padding: 40px;
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
}
.no-match-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
.no-match h3 {
  font-size: 18px;
  margin-bottom: 8px;
}
.no-match p {
  color: var(--text-secondary);
}
.catalog-section {
  margin-top: 40px;
  padding-top: 30px;
  border-top: 1px solid var(--border-color);
}
.catalog-section h2 {
  font-size: 20px;
  margin-bottom: 12px;
}
.btn-toggle {
  padding: 6px 16px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 14px;
  margin-bottom: 16px;
}
.btn-toggle:hover {
  background: var(--bg-secondary);
}
.catalog-list {
  display: grid;
  gap: 8px;
}
.catalog-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}
.major-name {
  font-weight: 500;
}
.major-category, .major-levels {
  font-size: 13px;
  color: var(--text-secondary);
  padding: 2px 8px;
  background: var(--bg-tertiary);
  border-radius: 10px;
}
.empty {
  text-align: center;
  color: var(--text-secondary);
  padding: 20px;
}
</style>
