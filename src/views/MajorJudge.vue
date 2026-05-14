<template>
  <div class="major-check-page">
    <div class="check-card">
      <h1>专业报考条件查询</h1>
      <p class="subtitle">人工智能训练师 — 查询您的专业是否符合报名条件</p>

      <div class="form-section">
        <div class="search-row">
          <input
            v-model="searchText"
            placeholder="请输入专业名称或专业代码"
            @keyup.enter="handleSearch"
          />
          <button class="search-btn" @click="handleSearch" :disabled="loading">
            {{ loading ? '搜索中...' : '搜索' }}
          </button>
        </div>

        <!-- 搜索建议（输入时出现） -->
        <div class="suggestions" v-if="suggestions.length > 0 && showSuggestions">
          <div
            v-for="item in suggestions"
            :key="item.level + item.code + item.name"
            class="suggestion-item"
            @click="selectMajor(item)"
          >
            <span class="sug-name">{{ item.name }}</span>
            <span class="sug-meta">
              <span :class="['level-tag', item.level]">{{ item.level }}</span>
              {{ item.className }}
              <span class="sug-code" v-if="item.code">（{{ item.code }}）</span>
            </span>
          </div>
        </div>
      </div>

      <!-- 查询结果 -->
      <div class="result-section" v-if="result">
        <div :class="['result-card', result.qualified ? 'pass' : 'fail']">
          <div class="result-icon">{{ result.qualified ? '✅' : '❌' }}</div>
          <div class="result-info">
            <h3>{{ result.qualified ? '符合报名条件' : '不符合报名条件' }}</h3>
            <div class="result-detail">
              <p><strong>专业名称：</strong>{{ selectedMajor.name }}</p>
              <p><strong>学历层次：</strong>{{ selectedMajor.level }}</p>
              <p><strong>所属专业类：</strong>{{ selectedMajor.className }}</p>
              <p v-if="selectedMajor.code"><strong>专业代码：</strong>{{ selectedMajor.code }}</p>
              <p v-if="result.qualified && result.matchedCode" class="match-info">
                匹配条件：专业类代码 {{ result.matchedCode }}
              </p>
              <p v-if="result.qualified && result.matchedName" class="match-info">
                匹配条件：{{ result.matchedName }}
              </p>
              <p v-if="!result.qualified" class="fail-reason">{{ result.reason }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 多个专业提示 -->
      <div class="multi-hint" v-if="searched && !result && !showSuggestions">
        <p>未找到匹配的专业，请检查输入是否正确。</p>
      </div>

      <!-- 说明 -->
      <div class="info-section">
        <h3>报考条件说明</h3>
        <p>人工智能训练师可报考的专业范围（按学历层次）：</p>
        <div class="info-grid">
          <div class="info-item">
            <h4>本科</h4>
            <p>电子与信息大类、医药卫生大类、装备制造大类、教育与体育大类</p>
          </div>
          <div class="info-item">
            <h4>专科</h4>
            <p>电子与信息大类、医药卫生大类、装备制造大类、教育与体育大类</p>
          </div>
          <div class="info-item">
            <h4>研究生</h4>
            <p>电子与信息、医药卫生、装备制造、教育与体育相关学科</p>
          </div>
        </div>
        <p class="related">相关职业：{{ relatedOccupations }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import majorCatalog from '../data/majorCatalog.json'
import { checkQualification, relatedOccupations } from '../data/majorData'

const searchText = ref('')
const suggestions = ref([])
const showSuggestions = ref(false)
const selectedMajor = ref(null)
const result = ref(null)
const loading = ref(false)
const searched = ref(false)

const handleSearch = () => {
  searched.value = true
  showSuggestions.value = false
  result.value = null
  selectedMajor.value = null

  if (!searchText.value.trim()) {
    suggestions.value = []
    return
  }

  const keyword = searchText.value.trim().toLowerCase()
  const filtered = majorCatalog.filter(m =>
    m.name.toLowerCase().includes(keyword) || String(m.code).includes(keyword)
  )

  if (filtered.length === 0) {
    suggestions.value = []
    return
  }

  if (filtered.length === 1) {
    // 只有一个结果，直接判断
    selectMajor(filtered[0])
    return
  }

  // 多个结果，显示候选列表
  suggestions.value = filtered.slice(0, 30)
  showSuggestions.value = true
}

const selectMajor = (item) => {
  selectedMajor.value = item
  searchText.value = item.name
  showSuggestions.value = false
  suggestions.value = []
  searched.value = true

  result.value = checkQualification(item)
}
</script>

<style scoped>
.major-check-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 40px 20px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.check-card {
  background: white;
  border-radius: 16px;
  padding: 40px;
  width: 680px;
  max-width: 100%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.1);
}

.check-card h1 {
  text-align: center;
  font-size: 24px;
  color: #1a1a2e;
  margin: 0 0 8px;
}

.subtitle {
  text-align: center;
  color: #888;
  font-size: 14px;
  margin: 0 0 32px;
}

.form-section {
  margin-bottom: 24px;
  position: relative;
}

.search-row {
  display: flex;
  gap: 8px;
}

.search-row input {
  flex: 1;
  padding: 14px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 16px;
  transition: border-color 0.2s;
}

.search-row input:focus {
  outline: none;
  border-color: #667eea;
}

.search-btn {
  padding: 14px 28px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.2s;
}

.search-btn:hover { opacity: 0.9; }
.search-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  max-height: 320px;
  overflow-y: auto;
  z-index: 100;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
}

.suggestion-item {
  padding: 12px 16px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f5f5f5;
}

.suggestion-item:hover { background: #f8f9ff; }
.suggestion-item:last-child { border-bottom: none; }

.sug-name {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.sug-meta {
  font-size: 12px;
  color: #999;
  display: flex;
  align-items: center;
  gap: 6px;
}

.level-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  color: white;
}

.level-tag.本科 { background: #667eea; }
.level-tag.专科 { background: #10b981; }
.level-tag.研究生 { background: #f59e0b; }

.sug-code { color: #bbb; }

.result-section { margin-bottom: 24px; }

.result-card {
  display: flex;
  gap: 16px;
  padding: 24px;
  border-radius: 12px;
}

.result-card.pass {
  background: #f0fdf4;
  border: 1px solid #86efac;
}

.result-card.fail {
  background: #fef2f2;
  border: 1px solid #fca5a5;
}

.result-icon { font-size: 36px; flex-shrink: 0; }

.result-info h3 {
  margin: 0 0 12px;
  font-size: 18px;
}

.result-card.pass .result-info h3 { color: #166534; }
.result-card.fail .result-info h3 { color: #991b1b; }

.result-detail p {
  margin: 4px 0;
  font-size: 14px;
  color: #555;
}

.match-info {
  color: #166534 !important;
  font-weight: 500;
}

.fail-reason {
  color: #991b1b !important;
}

.multi-hint {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 14px;
}

.info-section {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #eee;
}

.info-section h3 {
  font-size: 16px;
  color: #1a1a2e;
  margin: 0 0 12px;
}

.info-section > p {
  font-size: 14px;
  color: #666;
  margin: 0 0 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.info-item {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 10px;
}

.info-item h4 {
  margin: 0 0 6px;
  font-size: 14px;
  color: #667eea;
}

.info-item p {
  margin: 0;
  font-size: 12px;
  color: #888;
  line-height: 1.5;
}

.related {
  font-size: 12px !important;
  color: #aaa !important;
  line-height: 1.6;
}

@media (max-width: 600px) {
  .check-card { padding: 24px 16px; }
  .search-row { flex-direction: column; }
  .info-grid { grid-template-columns: 1fr; }
  .suggestion-item { flex-direction: column; align-items: flex-start; gap: 4px; }
}
</style>
