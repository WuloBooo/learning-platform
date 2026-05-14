<template>
  <div class="major-check-page">
    <div class="check-card">
      <h1>专业报考条件查询</h1>
      <p class="subtitle">人工智能训练师 — 查询您的专业是否符合报名条件</p>

      <div class="form-section">
        <div class="form-group">
          <label>学历层次</label>
          <div class="level-tabs">
            <button
              v-for="l in levels"
              :key="l"
              :class="['level-btn', { active: selectedLevel === l }]"
              @click="selectedLevel = l"
            >{{ l }}</button>
          </div>
        </div>

        <div class="form-group">
          <label>输入专业名称</label>
          <input
            v-model="searchText"
            placeholder="请输入专业名称，如：计算机科学与技术"
            @input="handleSearch"
          />
        </div>

        <!-- 搜索建议 -->
        <div class="suggestions" v-if="suggestions.length > 0 && showSuggestions">
          <div
            v-for="item in suggestions"
            :key="item.code + item.name"
            class="suggestion-item"
            @click="selectMajor(item)"
          >
            <span class="sug-name">{{ item.name }}</span>
            <span class="sug-meta">{{ item.level }} · {{ item.className }}</span>
          </div>
        </div>
      </div>

      <!-- 查询结果 -->
      <div class="result-section" v-if="result">
        <div :class="['result-card', result.qualified ? 'pass' : 'fail']">
          <div class="result-icon">{{ result.qualified ? '✅' : '❌' }}</div>
          <div class="result-info">
            <h3>{{ result.qualified ? '符合报名条件' : '不符合报名条件' }}</h3>
            <p>{{ selectedMajor.name }}（{{ selectedMajor.level }} · {{ selectedMajor.className }}）</p>
            <p v-if="result.qualified" class="detail">匹配条件：{{ result.matchedKeywords.join('、') }}</p>
            <p v-else class="detail">{{ result.reason }}</p>
          </div>
        </div>
      </div>

      <!-- 说明 -->
      <div class="info-section">
        <h3>报考条件说明</h3>
        <p>人工智能训练师可报考的学历及专业范围：</p>
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

const levels = ['本科', '专科', '研究生']
const selectedLevel = ref('本科')
const searchText = ref('')
const suggestions = ref([])
const showSuggestions = ref(false)
const selectedMajor = ref(null)
const result = ref(null)

const handleSearch = () => {
  result.value = null
  selectedMajor.value = null

  if (!searchText.value.trim()) {
    suggestions.value = []
    return
  }

  const keyword = searchText.value.trim().toLowerCase()
  const filtered = majorCatalog.filter(m =>
    m.level === selectedLevel.value &&
    (m.name.toLowerCase().includes(keyword) || m.code.includes(keyword))
  )

  suggestions.value = filtered.slice(0, 20)
  showSuggestions.value = true
}

const selectMajor = (item) => {
  selectedMajor.value = item
  searchText.value = item.name
  showSuggestions.value = false
  suggestions.value = []

  result.value = checkQualification(item.level, item.className, item.name)
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

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 16px;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.level-tabs {
  display: flex;
  gap: 8px;
}

.level-btn {
  flex: 1;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
}

.level-btn.active {
  border-color: #667eea;
  background: #667eea;
  color: white;
}

.suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  max-height: 300px;
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
}

.result-section {
  margin-bottom: 24px;
}

.result-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
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

.result-icon {
  font-size: 36px;
}

.result-info h3 {
  margin: 0 0 4px;
  font-size: 18px;
}

.result-card.pass .result-info h3 { color: #166534; }
.result-card.fail .result-info h3 { color: #991b1b; }

.result-info p {
  margin: 4px 0;
  font-size: 14px;
  color: #666;
}

.detail {
  font-size: 13px !important;
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
  .check-card { padding: 24px; }
  .info-grid { grid-template-columns: 1fr; }
}
</style>
