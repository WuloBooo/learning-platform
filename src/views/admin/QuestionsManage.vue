<template>
  <div class="admin-page">
    <div class="page-toolbar">
      <div class="filter-group">
        <input type="text" v-model="searchQuery" placeholder="搜索题目内容..." @input="searchQuestions" class="search-input" />
        <select v-model="filterCategory" @change="loadQuestions">
          <option value="">全部分类</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
        <select v-model="filterType" @change="loadQuestions">
          <option value="">全部题型</option>
          <option value="single">单选题</option>
          <option value="multiple">多选题</option>
          <option value="judge">判断题</option>
          <option value="fill">填空题</option>
        </select>
        <select v-model="filterDifficulty" @change="loadQuestions">
          <option value="">全部难度</option>
          <option value="easy">简单</option>
          <option value="medium">中等</option>
          <option value="hard">困难</option>
        </select>
      </div>
      <div class="action-buttons">
        <button class="btn-secondary" v-if="selectedQuestionIds.length > 0" @click="showBatchActions = true">
          批量操作 ({{ selectedQuestionIds.length }})
        </button>
        <button class="btn-secondary" @click="showImportModal = true">
          📥 批量导入
        </button>
        <button class="btn-primary" @click="showAddModal = true">
          + 添加题目
        </button>
      </div>
    </div>
    
    <div class="search-stats" v-if="searchQuery || filterCategory || filterType || filterDifficulty">
      <span class="stat-item">搜索结果: {{ filteredQuestions.length }} 条</span>
      <button class="btn-sm" @click="clearFilters">清除筛选</button>
    </div>
    
    <div class="data-table" v-if="!loading">
      <table>
        <thead>
          <tr>
            <th width="40">
              <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" />
            </th>
            <th width="50">ID</th>
            <th>题目内容</th>
            <th width="80">题型</th>
            <th>选项/答案</th>
            <th width="80">难度</th>
            <th width="100">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="question in filteredQuestions" :key="question.id">
            <td>
              <input type="checkbox" :value="question.id" v-model="selectedQuestionIds" />
            </td>
            <td>{{ question.id }}</td>
            <td class="question-title">{{ truncate(question.title, 40) }}</td>
            <td>
              <span :class="['type-badge', question.question_type]">
                {{ getTypeLabel(question.question_type) }}
              </span>
            </td>
            <td class="options-preview">
              <div v-if="question.options" class="options-list">
                <span v-for="(opt, idx) in parseOptions(question.options)" :key="idx" :class="['opt-item', { correct: isCorrectOption(question, idx) }]">
                  {{ String.fromCharCode(65 + idx) }}. {{ truncate(opt, 15) }}
                </span>
              </div>
              <div v-else class="answer-only">
                答案: {{ question.answer }}
              </div>
            </td>
            <td>
              <span :class="['difficulty-badge', question.difficulty]">
                {{ getDifficultyLabel(question.difficulty) }}
              </span>
            </td>
            <td class="actions">
              <button class="btn-edit" @click="editQuestion(question)">编辑</button>
              <button class="btn-delete" @click="deleteQuestion(question)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div class="empty-state" v-if="filteredQuestions.length === 0">
        暂无题目数据
      </div>
      
      <div class="pagination" v-if="pagination.totalPages > 1">
        <button :disabled="pagination.page === 1" @click="changePage(pagination.page - 1)">上一页</button>
        <span>第 {{ pagination.page }} / {{ pagination.totalPages }} 页</span>
        <div class="page-input">
          <span>跳转到</span>
          <input type="number" :min="1" :max="pagination.totalPages" v-model.number="targetPage" @keyup.enter="goToPage" />
          <span>页</span>
          <button class="btn-sm" @click="goToPage">跳转</button>
        </div>
        <button :disabled="pagination.page === pagination.totalPages" @click="changePage(pagination.page + 1)">下一页</button>
      </div>
    </div>
    
    <div class="loading-state" v-if="loading">加载中...</div>
    
    <div class="modal" v-if="showAddModal || editingQuestion">
      <div class="modal-content modal-lg">
        <div class="modal-header">
          <h3>{{ editingQuestion ? '编辑题目' : '添加题目' }}</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <form @submit.prevent="saveQuestion">
          <div class="form-row">
            <div class="form-group">
              <label>题型 *</label>
              <select v-model="questionForm.question_type" required>
                <option value="single">单选题</option>
                <option value="multiple">多选题</option>
                <option value="judge">判断题</option>
                <option value="fill">填空题</option>
              </select>
            </div>
            <div class="form-group">
              <label>分类</label>
              <select v-model="questionForm.category_id">
                <option value="">请选择</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>难度</label>
              <select v-model="questionForm.difficulty">
                <option value="easy">简单</option>
                <option value="medium">中等</option>
                <option value="hard">困难</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label>题目内容 *</label>
            <textarea v-model="questionForm.title" rows="3" required placeholder="请输入题目内容"></textarea>
          </div>
          
          <div class="form-group" v-if="['single', 'multiple'].includes(questionForm.question_type)">
            <label>选项</label>
            <div class="options-editor">
              <div v-for="(opt, index) in questionForm.optionsList" :key="index" class="option-item">
                <span class="option-label">{{ String.fromCharCode(65 + index) }}.</span>
                <input type="text" v-model="questionForm.optionsList[index]" placeholder="选项内容" />
                <button type="button" class="btn-remove" @click="removeOption(index)" v-if="questionForm.optionsList.length > 2">×</button>
              </div>
              <button type="button" class="btn-add-option" @click="addOption" v-if="questionForm.optionsList.length < 6">+ 添加选项</button>
            </div>
          </div>
          
          <div class="form-group">
            <label>正确答案 *</label>
            <template v-if="questionForm.question_type === 'single'">
              <select v-model="questionForm.answer" required>
                <option value="">请选择</option>
                <option v-for="(opt, index) in questionForm.optionsList" :key="index" :value="String.fromCharCode(65 + index)">
                  {{ String.fromCharCode(65 + index) }}. {{ opt || '选项' + (index + 1) }}
                </option>
              </select>
            </template>
            <template v-else-if="questionForm.question_type === 'multiple'">
              <div class="checkbox-group">
                <label v-for="(opt, index) in questionForm.optionsList" :key="index" class="checkbox-item">
                  <input type="checkbox" :value="String.fromCharCode(65 + index)" v-model="questionForm.answerList" />
                  {{ String.fromCharCode(65 + index) }}. {{ opt || '选项' + (index + 1) }}
                </label>
              </div>
            </template>
            <template v-else-if="questionForm.question_type === 'judge'">
              <select v-model="questionForm.answer" required>
                <option value="">请选择</option>
                <option value="正确">正确</option>
                <option value="错误">错误</option>
              </select>
            </template>
            <template v-else>
              <input type="text" v-model="questionForm.answer" required placeholder="请输入正确答案" />
            </template>
          </div>
          
          <div class="form-group">
            <label>答案解析</label>
            <textarea v-model="questionForm.analysis" rows="2" placeholder="可选，填写答案解析"></textarea>
          </div>
          
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="closeModal">取消</button>
            <button type="submit" class="btn-primary" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
          </div>
        </form>
      </div>
    </div>
    
    <div class="modal" v-if="showImportModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>批量导入题目</h3>
          <button class="close-btn" @click="closeImportModal">×</button>
        </div>
        <div class="import-content">
          <div class="import-tips">
            <h4>📋 模板说明</h4>
            <ul>
              <li><strong>题型</strong>：单选题、多选题、判断题、填空题</li>
              <li><strong>选项</strong>：多个选项用 | 分隔（如：选项A|选项B|选项C|选项D）</li>
              <li><strong>答案</strong>：单选填A/B/C/D，多选填ABC，判断填正确/错误，填空填具体答案</li>
              <li><strong>难度</strong>：简单、中等、困难</li>
            </ul>
          </div>
          <div class="import-steps">
            <div class="step">
              <h4>第一步：下载模板</h4>
              <p>请先下载Excel模板，按模板格式填写题目（模板含示例）</p>
              <button class="btn-secondary" @click="downloadTemplate">📥 下载Excel模板（含示例）</button>
            </div>
            <div class="step">
              <h4>第二步：上传文件</h4>
              <p>选择填写好的Excel文件进行导入</p>
              <div class="upload-area" @click="triggerUpload" :class="{ 'has-file': importFile }">
                <input type="file" ref="fileInput" @change="handleFileSelect" accept=".xlsx,.xls" hidden />
                <template v-if="importFile">
                  <span class="file-name">📄 {{ importFile.name }}</span>
                </template>
                <template v-else>
                  <span class="upload-icon">📁</span>
                  <span>点击选择Excel文件</span>
                </template>
              </div>
            </div>
            <div class="step">
              <h4>第三步：选择考试类型并导入</h4>
              <div class="form-group">
                <label>考试类型（可选）</label>
                <select v-model="importExamType">
                  <option value="">通用题目</option>
                  <option value="ai">人工智能训练师</option>
                </select>
              </div>
            </div>
          </div>
          <div class="import-result" v-if="importResult">
            <h4>导入结果</h4>
            <p class="result-summary">{{ importResult.message }}</p>
            <div class="result-details" v-if="importResult.results?.errors?.length">
              <p class="error-title">错误详情：</p>
              <ul>
                <li v-for="(err, idx) in importResult.results.errors.slice(0, 5)" :key="idx">{{ err }}</li>
                <li v-if="importResult.results.errors.length > 5">...还有{{ importResult.results.errors.length - 5 }}条错误</li>
              </ul>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-cancel" @click="closeImportModal">关闭</button>
          <button type="button" class="btn-primary" @click="doImport" :disabled="importing || !importFile">
            {{ importing ? '导入中...' : '开始导入' }}
          </button>
        </div>
      </div>
    </div>
    
    <div class="modal" v-if="showBatchActions">
      <div class="modal-content">
        <div class="modal-header">
          <h3>批量操作 ({{ selectedQuestionIds.length }} 道题)</h3>
          <button class="close-btn" @click="showBatchActions = false">×</button>
        </div>
        <div class="batch-actions">
          <button class="btn-danger" @click="batchDelete">
            🗑️ 批量删除
          </button>
          <button class="btn-secondary" @click="batchExport">
            📥 批量导出
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { practiceAPI } from '../../api'
import * as XLSX from 'xlsx'

const loading = ref(false)
const saving = ref(false)
const filterCategory = ref('')
const filterType = ref('')
const filterDifficulty = ref('')
const searchQuery = ref('')
const showAddModal = ref(false)
const editingQuestion = ref(null)
const showImportModal = ref(false)
const showBatchActions = ref(false)
const importing = ref(false)
const importFile = ref(null)
const importExamType = ref('')
const importResult = ref(null)
const fileInput = ref(null)

const questions = ref([])
const categories = ref([])
const selectedQuestionIds = ref([])
const pagination = reactive({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
const targetPage = ref(1)

const questionForm = reactive({
  question_type: 'single',
  category_id: '',
  difficulty: 'medium',
  title: '',
  optionsList: ['', '', '', ''],
  answer: '',
  answerList: [],
  analysis: ''
})

const typeLabels = { single: '单选', multiple: '多选', judge: '判断', fill: '填空' }
const difficultyLabels = { easy: '简单', medium: '中等', hard: '困难' }

const getTypeLabel = (type) => typeLabels[type] || type
const getDifficultyLabel = (diff) => difficultyLabels[diff] || diff
const truncate = (str, len) => str?.length > len ? str.slice(0, len) + '...' : str || ''

const parseOptions = (options) => {
  try {
    const parsed = typeof options === 'string' ? JSON.parse(options) : options
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const isCorrectOption = (question, idx) => {
  const letter = String.fromCharCode(65 + idx)
  return question.answer && question.answer.includes(letter)
}

const filteredQuestions = computed(() => {
  let filtered = questions.value
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(q => 
      q.title.toLowerCase().includes(query)
    )
  }
  
  return filtered
})

const selectAll = computed({
  get: () => {
    return filteredQuestions.value.length > 0 && 
           filteredQuestions.value.every(q => selectedQuestionIds.value.includes(q.id))
  },
  set: (value) => {
    if (value) {
      selectedQuestionIds.value = filteredQuestions.value.map(q => q.id)
    } else {
      selectedQuestionIds.value = []
    }
  }
})

const toggleSelectAll = () => {
}

const loadCategories = async () => {
  try {
    const res = await practiceAPI.getCategories()
    categories.value = res.categories
  } catch (e) { console.error(e) }
}

const loadQuestions = async () => {
  loading.value = true
  try {
    const params = { page: pagination.page, pageSize: pagination.pageSize }
    if (filterCategory.value) params.category_id = filterCategory.value
    if (filterType.value) params.question_type = filterType.value
    if (filterDifficulty.value) params.difficulty = filterDifficulty.value
    if (searchQuery.value) params.search = searchQuery.value
    
    const res = await practiceAPI.getQuestions(params)
    questions.value = res.questions
    pagination.total = res.pagination.total
    pagination.totalPages = res.pagination.totalPages
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

const searchQuestions = () => {
  loadQuestions()
}

const clearFilters = () => {
  searchQuery.value = ''
  filterCategory.value = ''
  filterType.value = ''
  filterDifficulty.value = ''
  loadQuestions()
}

const changePage = (page) => { pagination.page = page; loadQuestions() }

const goToPage = () => {
  if (targetPage.value && targetPage.value >= 1 && targetPage.value <= pagination.totalPages) {
    pagination.page = targetPage.value
    loadQuestions()
  } else {
    alert(`请输入 1 到 ${pagination.totalPages} 之间的页数`)
  }
}

const addOption = () => { if (questionForm.optionsList.length < 6) questionForm.optionsList.push('') }
const removeOption = (index) => { questionForm.optionsList.splice(index, 1) }

watch(() => questionForm.question_type, (type) => {
  if (['single', 'multiple'].includes(type)) {
    questionForm.optionsList = ['', '', '', '']
  } else {
    questionForm.optionsList = []
  }
  questionForm.answer = ''
  questionForm.answerList = []
})

const editQuestion = (q) => {
  editingQuestion.value = q
  let optionsList = ['', '', '', '']
  try {
    if (q.options) {
      const parsed = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
      if (Array.isArray(parsed)) {
        optionsList = parsed
      }
    }
  } catch (e) {
    console.error('解析选项失败:', e)
  }
  
  let answerList = []
  if (q.question_type === 'multiple' && q.answer) {
    answerList = String(q.answer).split('')
  }
  
  Object.assign(questionForm, {
    question_type: q.question_type || 'single',
    category_id: q.category_id || '',
    difficulty: q.difficulty || 'medium',
    title: q.title,
    optionsList: optionsList,
    answer: q.answer,
    answerList: answerList,
    analysis: q.analysis || ''
  })
}

const deleteQuestion = async (q) => {
  if (!confirm(`确定删除该题目吗？`)) return
  try {
    await practiceAPI.deleteQuestion(q.id)
    loadQuestions()
  } catch (e) { alert(e.message || '删除失败') }
}

const batchDelete = async () => {
  if (!confirm(`确定删除选中的 ${selectedQuestionIds.value.length} 道题目吗？`)) return
  saving.value = true
  try {
    for (const id of selectedQuestionIds.value) {
      await practiceAPI.deleteQuestion(id)
    }
    selectedQuestionIds.value = []
    showBatchActions.value = false
    loadQuestions()
  } catch (e) { alert(e.message || '批量删除失败') }
  finally { saving.value = false }
}

const batchExport = () => {
  const exportData = questions.value.filter(q => selectedQuestionIds.value.includes(q.id)).map(q => ({
    'ID': q.id,
    '题目内容': q.title,
    '题型': getTypeLabel(q.question_type),
    '选项': parseOptions(q.options).join('|'),
    '正确答案': q.answer,
    '解析': q.analysis || '',
    '难度': getDifficultyLabel(q.difficulty),
    '分值': q.points || 2
  }))
  
  const ws = XLSX.utils.json_to_sheet(exportData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '题目导出')
  ws['!cols'] = [{ wch: 8 }, { wch: 50 }, { wch: 10 }, { wch: 60 }, { wch: 15 }, { wch: 40 }, { wch: 10 }, { wch: 8 }]
  XLSX.writeFile(wb, '题目导出.xlsx')
  
  showBatchActions.value = false
}

const closeModal = () => {
  showAddModal.value = false
  editingQuestion.value = null
  Object.assign(questionForm, {
    question_type: 'single', category_id: '', difficulty: 'medium', title: '',
    optionsList: ['', '', '', ''], answer: '', answerList: [], analysis: ''
  })
}

const saveQuestion = async () => {
  saving.value = true
  try {
    let answer = questionForm.answer
    if (questionForm.question_type === 'multiple') {
      answer = questionForm.answerList.sort().join('')
    }
    
    const data = {
      question_type: questionForm.question_type,
      category_id: questionForm.category_id || null,
      difficulty: questionForm.difficulty,
      title: questionForm.title,
      options: ['single', 'multiple'].includes(questionForm.question_type) ? questionForm.optionsList : null,
      answer: answer,
      analysis: questionForm.analysis || null
    }
    
    if (editingQuestion.value) {
      await practiceAPI.updateQuestion(editingQuestion.value.id, data)
    } else {
      await practiceAPI.createQuestion(data)
    }
    closeModal()
    loadQuestions()
  } catch (e) { alert(e.message || '保存失败') }
  finally { saving.value = false }
}

onMounted(() => { loadCategories(); loadQuestions() })

const triggerUpload = () => {
  fileInput.value?.click()
}

const handleFileSelect = (e) => {
  const file = e.target.files[0]
  if (file) {
    importFile.value = file
    importResult.value = null
  }
}

const closeImportModal = () => {
  showImportModal.value = false
  importFile.value = null
  importExamType.value = ''
  importResult.value = null
  if (fileInput.value) fileInput.value.value = ''
}

const downloadTemplate = () => {
  const templateData = [
    { '题目内容': '【示例-单选题】人工智能的英文缩写是什么？', '题型': '单选题', '选项': 'Artificial Intelligence|Advanced Intelligence|Automated Intelligence|Algorithmic Intelligence', '正确答案': 'A', '解析': 'AI是Artificial Intelligence的缩写，选项用|分隔', '难度': '简单', '分值': 2, '考试类型': 'ai' },
    { '题目内容': '【示例-多选题】以下哪些是人工智能的应用领域？', '题型': '多选题', '选项': '图像识别|语音识别|自然语言处理|数据库管理', '正确答案': 'ABC', '解析': '图像识别、语音识别和自然语言处理都是AI的应用领域，多选答案直接拼接如ABC', '难度': '中等', '分值': 3, '考试类型': 'ai' },
    { '题目内容': '【示例-判断题】神经网络是一种模仿人脑结构的计算模型。', '题型': '判断题', '选项': '', '正确答案': '正确', '解析': '神经网络确实是受生物神经系统启发而设计的，判断题选项留空，答案填正确或错误', '难度': '简单', '分值': 2, '考试类型': 'ai' },
    { '题目内容': '【示例-填空题】机器学习的英文是____Learning。', '题型': '填空题', '选项': '', '正确答案': 'Machine', '解析': '填空题选项留空，答案直接填写正确答案文本', '难度': '简单', '分值': 2, '考试类型': 'ai' }
  ]
  const ws = XLSX.utils.json_to_sheet(templateData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '题目模板')
  ws['!cols'] = [{ wch: 50 }, { wch: 10 }, { wch: 60 }, { wch: 15 }, { wch: 40 }, { wch: 10 }, { wch: 8 }, { wch: 15 }]
  XLSX.writeFile(wb, '题目导入模板.xlsx')
}

const doImport = async () => {
  if (!importFile.value) return
  importing.value = true
  importResult.value = null
  try {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = e.target.result
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        if (jsonData.length === 0) {
          importResult.value = { message: 'Excel文件中没有数据', results: { success: 0, failed: 0, errors: ['文件为空'] } }
          importing.value = false
          return
        }
        const res = await practiceAPI.importQuestions({
          questions: jsonData.map(row => ({
            title: row['题目内容'] || row['题目'] || '',
            question_type: row['题型'] || row['类型'] || 'single',
            options: row['选项'] || '',
            answer: row['正确答案'] || row['答案'] || '',
            analysis: row['解析'] || '',
            difficulty: row['难度'] || 'medium',
            points: row['分值'] || 2,
            exam_type: row['考试类型'] || importExamType.value || ''
          })),
          exam_type: importExamType.value
        })
        importResult.value = res
        if (res.results?.success > 0) loadQuestions()
      } catch (err) {
        importResult.value = { message: err.message || '导入失败', results: { success: 0, failed: 0, errors: [err.message] } }
      }
      importing.value = false
    }
    reader.readAsArrayBuffer(importFile.value)
  } catch (e) {
    importResult.value = { message: e.message || '导入失败', results: { success: 0, failed: 0, errors: [e.message] } }
    importing.value = false
  }
}

</script>

<style scoped>
.search-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-width: 200px;
}

.search-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #f5f5f5;
  border-radius: 6px;
}

.stat-item {
  font-size: 14px;
  color: #666;
}

.btn-sm {
  padding: 4px 12px;
  font-size: 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}

.question-title { text-align: left; }
.options-preview { text-align: left; max-width: 250px; }
.options-list { display: flex; flex-wrap: wrap; gap: 4px; }
.opt-item { font-size: 11px; padding: 2px 6px; background: #f5f5f5; border-radius: 3px; }
.opt-item.correct { background: #e8f5e9; color: #4caf50; font-weight: 500; }
.answer-only { font-size: 12px; color: #666; }
.type-badge, .difficulty-badge { padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.type-badge.single { background: #e3f2fd; color: #1976d2; }
.type-badge.multiple { background: #f3e5f5; color: #7b1fa2; }
.type-badge.judge { background: #e8f5e9; color: #388e3c; }
.type-badge.fill { background: #fff3e0; color: #f57c00; }
.difficulty-badge.easy { background: #e8f5e9; color: #4caf50; }
.difficulty-badge.medium { background: #fff8e1; color: #ff9800; }
.difficulty-badge.hard { background: #ffebee; color: #f44336; }
.form-row { display: flex; gap: 16px; }
.form-row .form-group { flex: 1; }
.options-editor { display: flex; flex-direction: column; gap: 8px; }
.option-item { display: flex; align-items: center; gap: 8px; }
.option-label { width: 24px; font-weight: 600; }
.option-item input { flex: 1; }
.btn-remove { background: #ffebee; color: #f44336; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; }
.btn-add-option { background: #e3f2fd; color: #1976d2; border: none; border-radius: 4px; padding: 8px; cursor: pointer; }
.checkbox-group { display: flex; flex-wrap: wrap; gap: 12px; }
.checkbox-item { display: flex; align-items: center; gap: 4px; cursor: pointer; }
.action-buttons { display: flex; gap: 12px; }
.btn-secondary { background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
.btn-secondary:hover { background: #5a6268; }
.btn-danger { background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
.btn-danger:hover { background: #c82333; }
.import-content { padding: 20px 0; }
.import-tips { background: #e3f2fd; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
.import-tips h4 { margin: 0 0 12px; font-size: 14px; color: #1976d2; }
.import-tips ul { margin: 0; padding-left: 20px; font-size: 13px; color: #333; }
.import-tips li { margin: 6px 0; }
.import-steps { display: flex; flex-direction: column; gap: 24px; }
.step h4 { margin: 0 0 8px; font-size: 14px; color: #333; }
.step p { margin: 0 0 12px; font-size: 13px; color: #666; }
.upload-area { border: 2px dashed #ddd; border-radius: 8px; padding: 30px; text-align: center; cursor: pointer; transition: all 0.3s; }
.upload-area:hover { border-color: #4F46E5; background: #f8f9ff; }
.upload-area.has-file { border-color: #4caf50; background: #f1f8e9; }
.upload-icon { font-size: 32px; display: block; margin-bottom: 8px; }
.file-name { color: #4caf50; font-weight: 500; }
.import-result { margin-top: 20px; padding: 16px; background: #f5f5f5; border-radius: 8px; }
.import-result h4 { margin: 0 0 8px; font-size: 14px; }
.result-summary { font-weight: 500; color: #333; margin: 0; }
.result-details { margin-top: 12px; }
.error-title { color: #f44336; font-size: 13px; margin: 0 0 8px; }
.result-details ul { margin: 0; padding-left: 20px; font-size: 12px; color: #666; }
.result-details li { margin: 4px 0; }

.batch-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 0;
}

.batch-actions button {
  width: 100%;
  padding: 12px 20px;
  font-size: 14px;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: center;
  margin-top: 20px;
}

.page-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-input span {
  font-size: 14px;
  color: #666;
}

.page-input input {
  width: 60px;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
}

@media (max-width: 768px) {
  .page-toolbar {
    flex-direction: column;
    gap: 12px;
  }
  
  .filter-group {
    flex-wrap: wrap;
  }
  
  .search-input {
    width: 100%;
  }
  
  .data-table {
    overflow-x: auto;
  }
  
  .pagination {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .page-input {
    width: 100%;
    justify-content: center;
  }
}
</style>
