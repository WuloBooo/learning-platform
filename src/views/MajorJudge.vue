<template>
  <div class="major-check-page">
    <div class="check-card">
      <h1>专业报考条件查询（Beta）</h1>
      <p class="subtitle">人工智能训练师（三级）— 查询你的专业是否符合报名条件</p>

      <div class="form-section">
        <div class="search-row">
          <input
            v-model="searchText"
            placeholder="请输入专业名称或专业代码"
            @keyup.enter="handleSearch"
            autocomplete="off"
          />
          <button class="search-btn" @click="handleSearch" :disabled="loading">
            {{ loading ? '搜索中...' : '搜索' }}
          </button>
        </div>
        <p class="search-hint">💡 研究生按一级学科匹配</p>

        <!-- 学信网查询结果（搜索时自动获取） -->
      <div class="chsi-section" v-if="chsiResults.length > 0">
        <h3>📚 学信网专业变化查询结果（{{ chsiResults.length }}条）</h3>
        <div class="chsi-list">
          <div class="chsi-item" v-for="item in chsiResults" :key="item.zydm" :class="{'chsi-pass': item._qualified, 'chsi-fail': item._checked && !item._qualified}">
            <div class="chsi-current">
              <span class="chsi-badge">{{ item._qualified ? '✅' : '❌' }}</span>
              <span class="chsi-code">{{ item.zydm }}</span>
              <span class="chsi-name">{{ item.zymc }}</span>
              <span class="chsi-level-tag" v-if="item._level">{{ item._level }}</span>
            </div>
            <div class="chsi-qualify" v-if="item._qualified">
              <span class="qualify-text">{{ item._reason }}</span>
              <span class="chain-text" v-if="item._traceResult && item._traceResult._chain && item._traceResult._chain.length > 0">
                （{{ item._traceResult._chain.map(c => c.zymc).join(' → ') }} → {{ item._traceResult.name }}）
              </span>
            </div>
            <div class="chsi-qualify" v-if="item._checked && !item._qualified">
              <span class="qualify-text">{{ item._reason }}</span>
              <span class="chain-text" v-if="item._finalName"> → 最新专业名：{{ item._finalName }}</span>
            </div>
            <div class="chsi-old" v-if="item.yzyList && item.yzyList.length > 0">
              <span class="chsi-arrow">← 原专业：</span>
              <span class="chsi-old-item" v-for="y in item.yzyList" :key="y.zydm">
                {{ y.zymc }}（{{ y.zydm }}）
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="chsi-hint" v-if="chsiLoading">
        <p>正在从学信网查询...</p>
      </div>
        <!-- 本地搜索建议（暂时隐藏，仅使用学信网判断）
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
        -->
      </div>

      <!-- 本地判断结果（暂时隐藏，仅使用学信网判断）
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
      -->

      <!-- 未找到提示（暂时隐藏）
      <div class="multi-hint" v-if="searched && !result && !showSuggestions && chsiResults.length === 0 && !chsiLoading">
        <p>未找到匹配的专业，请检查输入是否正确。</p>
      </div>
      -->

      <!-- 说明 -->
      <div class="info-section">
        <p class="disclaimer">⚠️ 以上查询结果仅供参考，最终报考资格以实际审核结果为准。</p>
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
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import majorCatalog from '../data/majorCatalog.json'
import { checkQualification, checkQualificationByName, checkQualificationByZK, masterLevelOneNames, gzMajorNames, zyjyMajorNames, benkeMajorNames } from '../data/majorData'

onMounted(() => { document.title = '专业报考条件查询' })
onBeforeUnmount(() => { document.title = '智能学习平台' })

const searchText = ref('')
const suggestions = ref([])
const showSuggestions = ref(false)
const selectedMajor = ref(null)
const result = ref(null)
const loading = ref(false)
const searched = ref(false)
const chsiResults = ref([])
const chsiLoading = ref(false)

// cc参数映射
const ccMap = { '本科': 'ptjy', '专科': 'gz', '高职本科': 'zyjy', '研究生': 'yjs' }

const searchChsi = async () => {
  if (!searchText.value.trim()) return
  chsiLoading.value = true
  chsiResults.value = []
  try {
    const all = {}
    const ccList = [
      { cc: 'ptjy', level: '本科' },
      { cc: 'gz', level: '专科' },
      { cc: 'zyjy', level: '高职本科' },
      { cc: 'yjs', level: '研究生' }
    ]
    for (const { cc, level } of ccList) {
      const res = await fetch(`/api/chsi/major-search?cc=${cc}&key=${encodeURIComponent(searchText.value.trim())}`)
      const data = await res.json()
      if (data.result && data.result[0] && data.result[0].resultVo) {
        data.result[0].resultVo.forEach(v => {
          // 跳过专业类（needBold=true 表示是专业类而非具体专业）
          if (v.needBold) return
          if (!all[v.zydm]) {
            all[v.zydm] = { ...v, _level: level }
          }
        })
      }
    }

    // 对每个结果，循环追踪到最终专业，用最终专业做判断
    for (const key of Object.keys(all)) {
      const item = all[key]
      const finalMajor = await traceFinalMajor(item)
      all[key]._traceResult = finalMajor
      all[key]._qualified = finalMajor.qualified
      all[key]._checked = true
      all[key]._reason = finalMajor.qualified
        ? `符合条件（${finalMajor.level || item._level}：${finalMajor.name || item.zymc}）`
        : `不符合（${item.zymc} 不在可报考专业范围内）`
      if (finalMajor.name !== item.zymc) {
        all[key]._finalName = finalMajor.name
      }
    }

    chsiResults.value = Object.values(all)

    // 兜底：如果学信网没有返回任何结果，用本地名称列表匹配
    if (chsiResults.value.length === 0) {
      const input = searchText.value.trim()
      // 先用777表名称精确匹配
      const localQual = checkQualificationByName(input)
      if (localQual.qualified) {
        chsiResults.value = [{
          zydm: '',
          zymc: input,
          _level: localQual.levels ? localQual.levels.join('、') : localQual.level,
          _qualified: true,
          _checked: true,
          _reason: `符合条件（${localQual.level}：${input}）`,
          _traceResult: localQual,
          yzyList: []
        }]
      } else {
        // 777表没匹配到，尝试自考旧名称匹配
        const zkQual = checkQualificationByZK(input)
        if (zkQual.qualified) {
          chsiResults.value = [{
            zydm: '',
            zymc: input,
            _level: zkQual.level,
            _qualified: true,
            _checked: true,
            _reason: `符合条件（${zkQual.level}）`,
            _traceResult: zkQual,
            yzyList: []
          }]
        }
      }
    }
  } catch (e) {
    console.error('学信网查询失败:', e)
  }
  chsiLoading.value = false
}

// 追踪专业变化链，找到最终专业后做判断
const traceFinalMajor = async (item, depth = 0) => {
  if (depth > 5) return { qualified: false, reason: '追踪层级过深' }
  const level = item._level || '本科'
  const name = item.zymc

  // 研究生：按一级学科名称匹配
  if (level === '研究生') {
    const matched = masterLevelOneNames?.filter(n => name.includes(n))
    if (matched && matched.length > 0) {
      return { qualified: true, matchedName: matched[0], level: '研究生', name }
    }
  }

  // 去掉学信网返回的注释后缀（如"(注：可授工学或理学学士学位)"），用纯净名再匹配一次
  const cleanName = name.replace(/（注[：:].+）/, '').replace(/\(注[：:].+\)/, '').trim()

  // 按学信网标注的层次精确匹配（原名 + 纯净名）
  if (level === '专科') {
    const matched = gzMajorNames.has(name) ? name : (gzMajorNames.has(cleanName) ? cleanName : null)
    if (matched) return { qualified: true, matchedName: matched, level: '高职专科', name }
  }
  if (level === '高职本科') {
    const matched = zyjyMajorNames.has(name) ? name : (zyjyMajorNames.has(cleanName) ? cleanName : null)
    if (matched) return { qualified: true, matchedName: matched, level: '高职本科', name }
  }
  if (level === '本科') {
    const matched = benkeMajorNames.has(name) ? name : (benkeMajorNames.has(cleanName) ? cleanName : null)
    if (matched) return { qualified: true, matchedName: matched, level: '普通本科', name }
  }

  // 不限层次的名称匹配（学信网层次无匹配时兜底，用纯净名再试一次）
  const nameQual = checkQualificationByName(name) || {}
  const cleanNameQual = (!nameQual.qualified && cleanName !== name) ? checkQualificationByName(cleanName) : null
  const finalNameQual = nameQual.qualified ? nameQual : cleanNameQual
  if (finalNameQual && finalNameQual.qualified) {
    // 非研究生层次不能使用研究生一级学科的 includes 匹配，否则会把本科专业误判为符合
    if (level !== '研究生' && finalNameQual.levels && finalNameQual.levels.every(l => l === '研究生')) {
      // 忽略该匹配，继续往下走
    } else {
      return { ...finalNameQual, name }
    }
  }

  // 名称不匹配时，走旧逻辑（普通本科/研究生）
  const major = buildMajorFromChsi(item, level)
  if (major) {
    const qual = checkQualification(major)
    if (qual.qualified) return { ...qual, name }
  }

  // 不合格时，用专业名称再搜一次学信网，追踪变化链
  const cc = ccMap[level]
  if (!cc) return { ...nameQual, name }
  try {
    const res = await fetch(`/api/chsi/major-search?cc=${cc}&key=${encodeURIComponent(item.zymc)}`)
    const data = await res.json()
    if (data.result && data.result[0] && data.result[0].resultVo) {
      for (const v of data.result[0].resultVo) {
        if (v.yzyList && v.yzyList.some(y => y.zydm === item.zydm) && v.zydm !== item.zydm) {
          const nextItem = { ...v, _level: level }
          const finalResult = await traceFinalMajor(nextItem, depth + 1)
          if (finalResult.qualified) {
            finalResult._chain = finalResult._chain || []
            finalResult._chain.unshift({ zydm: item.zydm, zymc: item.zymc })
            return finalResult
          }
        }
      }
    }
  } catch (e) {
    console.error('追踪专业变化失败:', e)
  }
  return { ...nameQual, name: item.zymc }
}

// 从学信网数据构建专业对象用于判断
const buildMajorFromChsi = (item, level) => {
  const code = item.zydm || ''
  const name = item.zymc || ''
  // 判断是专业类还是具体专业：代码长度4位且needBold为true的是专业类
  if (item.needBold) {
    return { level, className: name, name: name, code: code }
  }
  // 具体专业，代码前4位是专业类代码
  const classCode = code.substring(0, 4)
  // 从catalog中找到对应专业类名
  const found = majorCatalog.find(m => m.level === level && String(m.code).startsWith(classCode))
  const className = found ? found.className : classCode
  return { level, className, name, code }
}

const handleSearch = () => {
  searched.value = true
  showSuggestions.value = false
  result.value = null
  selectedMajor.value = null

  if (!searchText.value.trim()) {
    suggestions.value = []
    chsiResults.value = []
    return
  }

  const keyword = searchText.value.trim().toLowerCase()
  const filtered = majorCatalog.filter(m =>
    m.name.toLowerCase().includes(keyword) || String(m.code).includes(keyword)
  )

  // 自动查学信网
  searchChsi()

  if (filtered.length === 0) {
    suggestions.value = []
    return
  }

  if (filtered.length === 1) {
    selectMajor(filtered[0])
    return
  }

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

.search-hint {
  font-size: 12px;
  color: #94a3b8;
  margin: 8px 0 0;
  text-align: center;
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

.chsi-btn {
  margin-top: 12px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}
.chsi-btn:hover { opacity: 0.9; }
.chsi-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.chsi-btn-inline {
  margin-top: 12px;
  padding: 8px 16px;
  background: white;
  color: #3b82f6;
  border: 1px solid #3b82f6;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}
.chsi-btn-inline:hover { background: #eff6ff; }
.chsi-btn-inline:disabled { opacity: 0.5; cursor: not-allowed; }

.chsi-section {
  margin-bottom: 24px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}
.chsi-section h3 {
  margin: 0 0 12px;
  font-size: 15px;
  color: #1e40af;
}
.chsi-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.chsi-item {
  padding: 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}
.chsi-item.chsi-pass {
  background: #f0fdf4;
  border-color: #86efac;
}
.chsi-item.chsi-fail {
  background: #fef2f2;
  border-color: #fecaca;
}
.chsi-current {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.chsi-badge {
  font-size: 14px;
  flex-shrink: 0;
}
.chsi-code {
  font-size: 12px;
  color: white;
  background: #3b82f6;
  padding: 2px 8px;
  border-radius: 4px;
}
.chsi-name {
  font-size: 16px;
  font-weight: 500;
  color: #1e293b;
}
.chsi-level-tag {
  font-size: 12px;
  color: white;
  padding: 1px 6px;
  border-radius: 4px;
  background: #6366f1;
}
.chsi-qualify {
  margin-top: 4px;
}
.qualify-text {
  font-size: 12px;
  color: #166534;
  font-weight: 500;
}
.chsi-item.chsi-fail .qualify-text {
  color: #991b1b;
}
.chain-text {
  font-size: 11px;
  color: #6366f1;
  margin-left: 4px;
}
.chsi-old {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
  line-height: 1.6;
}
.chsi-arrow { color: #94a3b8; }
.chsi-old-item {
  margin-right: 8px;
}
.chsi-hint {
  text-align: center;
  padding: 12px;
  color: #64748b;
  font-size: 13px;
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

.disclaimer {
  text-align: center;
  font-size: 13px !important;
  color: #e67e22 !important;
  margin: 0 0 16px !important;
  padding: 10px;
  background: #fef9e7;
  border-radius: 8px;
  border: 1px solid #f9e79f;
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
