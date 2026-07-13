<template>
  <div class="major-check-page">
    <div class="check-card">
      <!-- 页眉:证书感装饰线 -->
      <div class="cert-header">
        <div class="cert-line"></div>
        <span class="cert-mark">※</span>
        <div class="cert-line"></div>
      </div>

      <h1>专业报考条件查询</h1>
      <p class="subtitle">人工智能训练师（三级）— 查询你的专业是否符合报名条件</p>

      <div class="form-section">
        <div class="search-row">
          <input
            v-model="searchText"
            placeholder="请输入专业名称或专业代码"
            @keyup.enter="handleSearch"
            autocomplete="off"
            aria-label="专业名称或专业代码"
          />
          <button class="search-btn" @click="handleSearch" :disabled="loading">
            {{ loading ? '查询中' : '查 询' }}
          </button>
        </div>
        <p class="search-hint">研究生按一级学科匹配 · 数据来源:学信网</p>

        <!-- 学信网查询结果 -->
      <div class="chsi-section" v-if="chsiResults.length > 0">
        <h3>学信网专业变化查询结果<span class="result-count">{{ chsiResults.length }} 条</span></h3>
        <div class="chsi-list">
          <div class="chsi-item" v-for="item in chsiResults" :key="item.zydm" :class="{'chsi-pass': item._qualified, 'chsi-fail': item._checked && !item._qualified}">
            <div class="chsi-current">
              <span class="chsi-seal" v-if="item._qualified">
                <!-- 通过印章:SVG勾 -->
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
              <span class="chsi-seal seal-fail" v-else-if="item._checked">
                <!-- 不通过:SVG叉 -->
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </span>
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
        <div class="loading-spinner"></div>
        <p>正在从学信网查询...</p>
      </div>
      </div>

      <!-- 说明 -->
      <div class="info-section">
        <p class="disclaimer">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          以上查询结果仅供参考，最终报考资格以实际审核结果为准。
        </p>
        <h3>报考条件说明</h3>
        <p class="info-intro">人工智能训练师可报考的专业范围（按学历层次）：</p>
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

      <!-- 页脚:证书感装饰线 -->
      <div class="cert-header cert-footer">
        <div class="cert-line"></div>
        <span class="cert-mark">※</span>
        <div class="cert-line"></div>
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

// 每个层次对应的777表（严格按层次匹配，不跨层次）
const level777Map = {
  '本科': benkeMajorNames,
  '专科': gzMajorNames,
  '高职本科': zyjyMajorNames,
}

// 所有本科/专科白名单（用于条件④跨层兜底匹配）
const allMajorSets = { benkeMajorNames, zyjyMajorNames, gzMajorNames }

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
// 核心原则：学信网返回的层次就是该条结果的层次，先查对应777表，再跨层次兜底，最后追踪变化链
const traceFinalMajor = async (item, depth = 0) => {
  if (depth > 5) return { qualified: false, reason: '追踪层级过深' }
  const level = item._level || '本科'
  const name = item.zymc

  // 去掉学信网返回的注释后缀（如"(注：可授工学或理学学士学位)"）
  const cleanName = name.replace(/（注[：:].+）/, '').replace(/\(注[：:].+\)/, '').trim()

  // 研究生：按一级学科名称 includes 匹配
  if (level === '研究生') {
    const matched = masterLevelOneNames?.filter(n => name.includes(n))
    if (matched && matched.length > 0) {
      return { qualified: true, matchedName: matched[0], level: '研究生', name }
    }
  } else {
    // 本科/专科/高职本科：先用对应层次的777表精确匹配（原名 + 纯净名）
    const set777 = level777Map[level]
    if (set777) {
      const matched = set777.has(name) ? name : (set777.has(cleanName) ? cleanName : null)
      if (matched) return { qualified: true, matchedName: matched, level, name }
    }

    // 条件④兜底：当前层次白名单未命中，去所有本科白名单里查一次
    // 用于解决"专业跨层对应"问题，例如：
    //   普通本科"商务英语"在本科表里没有，但它是职业本科"应用英语"的原名，应当符合
    //   普通本科"健康服务与管理"同理（职业本科"健康管理"的原名）
    for (const setName of ['benkeMajorNames', 'zyjyMajorNames', 'gzMajorNames']) {
      const otherSet = allMajorSets[setName]
      if (otherSet && otherSet !== set777) {
        const crossMatched = otherSet.has(name) ? name : (otherSet.has(cleanName) ? cleanName : null)
        if (crossMatched) {
          return { qualified: true, matchedName: crossMatched, level: level + '（跨层匹配）', name }
        }
      }
    }
  }

  // 以上未匹配到，尝试追踪学信网专业变化链（同名专业可能已更名）
  const cc = ccMap[level]
  if (!cc) return { qualified: false, name, reason: '该专业不在人工智能训练师报考条件范围内' }
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
  return { qualified: false, name, reason: '该专业不在人工智能训练师报考条件范围内' }
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
/* ========== 设计系统:Trust & Authority 权威学术风 ==========
   配色:深墨蓝主色 + 证书金点缀 + 米白底
   字体:EB Garamond(衬线标题) + Lato(无衬线正文)
   skill 来源:ui-ux-pro-max --design-system + style/color/typography 检索
================================================================ */

.major-check-page {
  --color-primary: #0f172a;        /* 深墨蓝 */
  --color-secondary: #334155;      /* 板岩灰 */
  --color-accent: #0369a1;         /* 权威天蓝 */
  --color-gold: #a16207;           /* 证书金 */
  --color-bg: #faf8f3;             /* 米白底 */
  --color-card: #ffffff;           /* 卡片白 */
  --color-border: #e2e0d8;         /* 米色边框 */
  --color-border-strong: #c9c5b8;  /* 强边框 */
  --color-muted: #6b6757;          /* 次要文字 */
  --color-pass: #15803d;           /* 通过绿(权威深绿) */
  --color-pass-bg: #f7faf7;
  --color-fail: #991b1b;           /* 不通过红(权威深红) */
  --color-fail-bg: #fdf8f8;

  --font-serif: 'EB Garamond', 'Songti SC', 'STSong', Georgia, serif;
  --font-sans: 'Lato', -apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif;

  min-height: 100vh;
  background: var(--color-bg);
  background-image:
    radial-gradient(circle at 20% 10%, rgba(3, 105, 161, 0.03) 0%, transparent 40%),
    radial-gradient(circle at 80% 90%, rgba(161, 98, 7, 0.03) 0%, transparent 40%);
  padding: 48px 20px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  font-family: var(--font-sans);
  color: var(--color-primary);
}

.check-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  padding: 48px 56px;
  width: 720px;
  max-width: 100%;
  box-shadow:
    0 1px 0 rgba(15, 23, 42, 0.04),
    0 4px 24px rgba(15, 23, 42, 0.06);
  position: relative;
}

/* 证书感装饰线(页眉/页脚) */
.cert-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;
}
.cert-footer {
  margin-bottom: 0;
  margin-top: 40px;
}
.cert-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-border-strong), transparent);
}
.cert-mark {
  color: var(--color-gold);
  font-size: 14px;
  font-family: var(--font-serif);
}

.check-card h1 {
  text-align: center;
  font-family: var(--font-serif);
  font-size: 32px;
  font-weight: 600;
  color: var(--color-primary);
  margin: 0 0 10px;
  letter-spacing: 1px;
}

.subtitle {
  text-align: center;
  color: var(--color-muted);
  font-size: 14px;
  margin: 0 0 36px;
  letter-spacing: 0.5px;
}

/* ========== 搜索区 ========== */
.form-section {
  margin-bottom: 28px;
  position: relative;
}

.search-row {
  display: flex;
  gap: 0;
  border: 1px solid var(--color-border-strong);
  border-radius: 2px;
  overflow: hidden;
  background: var(--color-card);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.search-row:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(3, 105, 161, 0.1);
}

.search-row input {
  flex: 1;
  padding: 16px 18px;
  border: none;
  background: transparent;
  font-family: var(--font-sans);
  font-size: 15px;
  color: var(--color-primary);
  outline: none;
}
.search-row input::placeholder {
  color: var(--color-muted);
  opacity: 0.7;
}

.search-btn {
  padding: 0 32px;
  background: var(--color-primary);
  color: #fff;
  border: none;
  font-family: var(--font-sans);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 4px;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.2s ease;
  min-height: 52px;
}
.search-btn:hover:not(:disabled) { background: var(--color-secondary); }
.search-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.search-hint {
  font-size: 12px;
  color: var(--color-muted);
  margin: 10px 2px 0;
  text-align: right;
  letter-spacing: 0.3px;
}

/* ========== 学信网结果区 ========== */
.chsi-section {
  margin-bottom: 28px;
  padding: 0;
  border-left: 3px solid var(--color-accent);
  padding-left: 20px;
}
.chsi-section h3 {
  margin: 0 0 16px;
  font-family: var(--font-serif);
  font-size: 17px;
  font-weight: 600;
  color: var(--color-primary);
  display: flex;
  align-items: center;
  gap: 10px;
}
.result-count {
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 400;
  color: var(--color-muted);
  letter-spacing: 0.5px;
}

.chsi-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.chsi-item {
  padding: 16px 18px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}
.chsi-item.chsi-pass {
  background: var(--color-pass-bg);
  border-left: 3px solid var(--color-pass);
}
.chsi-item.chsi-fail {
  background: var(--color-fail-bg);
  border-left: 3px solid var(--color-fail);
}

.chsi-current {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

/* 印章式状态标记(替代emoji) */
.chsi-seal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--color-pass);
  color: #fff;
  flex-shrink: 0;
}
.chsi-seal.seal-fail {
  background: var(--color-fail);
}

.chsi-code {
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: 12px;
  color: var(--color-muted);
  background: var(--color-bg);
  padding: 3px 8px;
  border-radius: 2px;
  border: 1px solid var(--color-border);
  letter-spacing: 0.5px;
}
.chsi-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-primary);
  font-family: var(--font-sans);
}
.chsi-level-tag {
  font-size: 11px;
  color: var(--color-accent);
  padding: 2px 8px;
  border: 1px solid var(--color-accent);
  border-radius: 2px;
  background: rgba(3, 105, 161, 0.05);
  letter-spacing: 0.5px;
}

.chsi-qualify {
  margin-top: 6px;
  padding-left: 36px;
}
.qualify-text {
  font-size: 13px;
  color: var(--color-pass);
  font-weight: 500;
}
.chsi-item.chsi-fail .qualify-text {
  color: var(--color-fail);
}
.chain-text {
  font-size: 12px;
  color: var(--color-muted);
  margin-left: 6px;
}
.chsi-old {
  font-size: 12px;
  color: var(--color-muted);
  margin-top: 6px;
  padding-left: 36px;
  line-height: 1.7;
}
.chsi-arrow { color: var(--color-border-strong); margin-right: 4px; }
.chsi-old-item {
  margin-right: 10px;
}

.chsi-hint {
  text-align: center;
  padding: 24px;
  color: var(--color-muted);
  font-size: 13px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.loading-spinner {
  width: 22px;
  height: 22px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
  .loading-spinner { animation: none; }
}

/* ========== 信息说明区 ========== */
.info-section {
  margin-top: 40px;
  padding-top: 32px;
  border-top: 1px solid var(--color-border);
}

.disclaimer {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--color-gold);
  margin: 0 0 24px;
  padding: 12px 16px;
  background: rgba(161, 98, 7, 0.05);
  border: 1px solid rgba(161, 98, 7, 0.2);
  border-radius: 2px;
  letter-spacing: 0.3px;
}

.info-section h3 {
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 600;
  color: var(--color-primary);
  margin: 0 0 8px;
}
.info-intro {
  font-size: 14px;
  color: var(--color-muted);
  margin: 0 0 20px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: var(--color-border);
  border: 1px solid var(--color-border);
  margin-bottom: 0;
}
.info-item {
  padding: 20px;
  background: var(--color-card);
}
.info-item h4 {
  margin: 0 0 8px;
  font-family: var(--font-serif);
  font-size: 15px;
  font-weight: 600;
  color: var(--color-accent);
}
.info-item p {
  margin: 0;
  font-size: 12px;
  color: var(--color-muted);
  line-height: 1.7;
}

/* ========== 响应式 ========== */
@media (max-width: 600px) {
  .major-check-page { padding: 20px 12px; }
  .check-card { padding: 32px 24px; }
  .check-card h1 { font-size: 26px; }
  .search-row { flex-direction: column; }
  .search-btn { padding: 14px; letter-spacing: 8px; }
  .info-grid { grid-template-columns: 1fr; }
  .chsi-qualify, .chsi-old { padding-left: 0; }
}
</style>
