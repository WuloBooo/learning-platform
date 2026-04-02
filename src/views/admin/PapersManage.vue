<template>
  <div class="admin-page">
    <div class="page-toolbar">
      <div class="filter-group">
        <select v-model="filterStatus" @change="loadPapers">
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="published">已发布</option>
        </select>
      </div>
      <button class="btn-primary" @click="showAddModal = true">+ 创建试卷</button>
    </div>
    
    <div class="papers-grid" v-if="!loading && !selectedPaper">
      <div class="paper-card" v-for="paper in papers" :key="paper.id" @click="selectPaper(paper)">
        <div class="paper-header">
          <h3>{{ paper.name }}</h3>
          <span :class="['status-badge', paper.status]">{{ getStatusLabel(paper.status) }}</span>
        </div>
        <div class="paper-stats">
          <div class="stat">
            <span class="stat-value">{{ paper.question_count }}</span>
            <span class="stat-label">题目数</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ paper.total_score }}</span>
            <span class="stat-label">总分</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ paper.duration }}</span>
            <span class="stat-label">分钟</span>
          </div>
        </div>
        <div class="paper-exam-type" v-if="paper.exam_type">{{ getExamTypeLabel(paper.exam_type) }}</div>
        <div class="paper-actions">
          <button class="btn-sm" @click.stop="editPaper(paper)">编辑</button>
          <button class="btn-sm btn-danger" @click.stop="deletePaper(paper)">删除</button>
        </div>
      </div>
      <div class="empty-state" v-if="papers.length === 0">暂无试卷数据</div>
    </div>
    
    <div class="paper-detail" v-if="selectedPaper">
      <div class="detail-header">
        <button class="btn-back" @click="selectedPaper = null">← 返回试卷列表</button>
        <h2>{{ selectedPaper.name }}</h2>
        <div class="detail-actions">
          <button class="btn-secondary" @click="showImportInPaper = true">📥 批量导入题目</button>
          <button class="btn-primary" @click="showAddQuestionModal = true">+ 手动添加题目</button>
        </div>
      </div>
      
      <div class="questions-section">
        <div class="section-title">题目列表 ({{ paperQuestions.length }}题)</div>
        <div class="questions-list" v-if="paperQuestions.length > 0">
          <div class="question-item" v-for="(q, index) in paperQuestions" :key="q.id">
            <div class="question-number">{{ index + 1 }}</div>
            <div class="question-content">
              <div class="question-title">{{ q.title }}</div>
              <div class="question-meta">
                <span :class="['type-badge', q.question_type]">{{ getTypeLabel(q.question_type) }}</span>
                <span :class="['difficulty-badge', q.difficulty]">{{ getDifficultyLabel(q.difficulty) }}</span>
                <span class="question-score">{{ q.score || 2 }}分</span>
              </div>
            </div>
            <div class="question-actions">
              <button class="btn-sm" @click="removeQuestionFromPaper(q.id)">移除</button>
            </div>
          </div>
        </div>
        <div class="empty-state" v-else>暂无题目，请点击上方按钮添加</div>
      </div>
    </div>
    
    <div class="loading-state" v-if="loading">加载中...</div>
    
    <div class="modal" v-if="showAddModal || editingPaper">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingPaper ? '编辑试卷' : '创建试卷' }}</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <form @submit.prevent="savePaper">
          <div class="form-group">
            <label>试卷名称 *</label>
            <input type="text" v-model="paperForm.name" required />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>考试类型</label>
              <select v-model="paperForm.exam_type">
                <option value="">请选择</option>
                <option value="ai">人工智能训练师</option>
                <option value="data">数据分析</option>
              </select>
            </div>
            <div class="form-group">
              <label>状态</label>
              <select v-model="paperForm.status">
                <option value="draft">草稿</option>
                <option value="published">已发布</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>总分</label>
              <input type="number" v-model="paperForm.total_score" />
            </div>
            <div class="form-group">
              <label>时长(分钟)</label>
              <input type="number" v-model="paperForm.duration" />
            </div>
            <div class="form-group">
              <label>及格分</label>
              <input type="number" v-model="paperForm.pass_score" />
            </div>
          </div>
          <div class="form-group">
            <label>描述</label>
            <textarea v-model="paperForm.description" rows="3"></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="closeModal">取消</button>
            <button type="submit" class="btn-primary" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
          </div>
        </form>
      </div>
    </div>
    
    <div class="modal" v-if="showAddQuestionModal">
      <div class="modal-content modal-lg">
        <div class="modal-header">
          <h3>添加题目到试卷</h3>
          <button class="close-btn" @click="showAddQuestionModal = false">×</button>
        </div>
        <div class="question-selector">
          <div class="selector-toolbar">
            <input type="text" v-model="searchQuestion" placeholder="搜索题目..." @input="searchQuestions" />
            <select v-model="filterQuestionType">
              <option value="">全部题型</option>
              <option value="single">单选题</option>
              <option value="multiple">多选题</option>
              <option value="judge">判断题</option>
            </select>
          </div>
          <div class="available-questions">
            <div class="question-checkbox" v-for="q in availableQuestions" :key="q.id">
              <label>
                <input type="checkbox" :value="q.id" v-model="selectedQuestionIds" />
                <span class="q-type">[{{ getTypeLabel(q.question_type) }}]</span>
                <span class="q-title">{{ truncate(q.title, 50) }}</span>
              </label>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showAddQuestionModal = false">取消</button>
          <button class="btn-primary" @click="addQuestionsToPaper" :disabled="selectedQuestionIds.length === 0">添加选中题目 ({{ selectedQuestionIds.length }})</button>
        </div>
      </div>
    </div>
    
    <div class="modal" v-if="showImportInPaper">
      <div class="modal-content modal-lg">
        <div class="modal-header">
          <h3>批量导入题目到 {{ selectedPaper.name }}</h3>
          <button class="close-btn" @click="closeImportModal">×</button>
        </div>
        <div class="import-content">
          <div class="import-steps">
            <div class="step">
              <h4>第一步：下载模板</h4>
              <p>下载Excel模板，按格式填写题目</p>
              <button class="btn-secondary" @click="downloadTemplate">📥 下载模板</button>
            </div>
            <div class="step">
              <h4>第二步：上传文件</h4>
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
          </div>
          <div class="import-result" v-if="importResult">
            <h4>导入结果</h4>
            <p class="result-summary">{{ importResult.message }}</p>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="closeImportModal">关闭</button>
          <button class="btn-primary" @click="doImport" :disabled="importing || !importFile">{{ importing ? '导入中...' : '开始导入' }}</button>
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
const filterStatus = ref('')
const papers = ref([])
const selectedPaper = ref(null)
const paperQuestions = ref([])
const showAddModal = ref(false)
const editingPaper = ref(null)
const showAddQuestionModal = ref(false)
const showImportInPaper = ref(false)
const searchQuestion = ref('')
const filterQuestionType = ref('')
const availableQuestions = ref([])
const selectedQuestionIds = ref([])
const importing = ref(false)
const importFile = ref(null)
const importResult = ref(null)
const fileInput = ref(null)
 
const paperForm = reactive({
  name: '',
  exam_type: '',
  description: '',
  total_score: 100,
  duration: 60,
  pass_score: 60,
  status: 'draft'
})
 
const pagination = reactive({
  page: 1,
  totalPages: 1,
  total: 0
})
 
const truncate = (str, len) => {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '...' : str
}
 
const getStatusLabel = (status) => {
  const labels = { draft: '草稿', published: '已发布' }
  return labels[status] || status
}
 
const getTypeLabel = (type) => {
  const labels = { single: '单选', multiple: '多选', judge: '判断' }
  return labels[type] || type
}
 
const getDifficultyLabel = (difficulty) => {
  const labels = { easy: '简单', medium: '中等', hard: '困难' }
  return labels[difficulty] || difficulty
}
 
const getExamTypeLabel = (examType) => {
  const labels = { ai: '人工智能训练师', data: '数据分析' }
  return labels[examType] || examType
}
 
const loadPapers = async () => {
  loading.value = true
  try {
    const params = { status: filterStatus.value }
    const res = await practiceAPI.getPapers(params)
    papers.value = res.papers || []
  } catch (e) {
    alert(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}
 
const selectPaper = async (paper) => {
  selectedPaper.value = paper
  await loadPaperQuestions()
}
 
const loadPaperQuestions = async () => {
  if (!selectedPaper.value) return
  loading.value = true
  try {
    const res = await practiceAPI.getPaper(selectedPaper.value.id)
    paperQuestions.value = res.questions || []
  } catch (e) {
    alert(e.message || '加载题目失败')
  } finally {
    loading.value = false
  }
}
 
const editPaper = (paper) => {
  editingPaper.value = paper
  Object.assign(paperForm, {
    name: paper.name,
    exam_type: paper.exam_type || '',
    description: paper.description || '',
    total_score: paper.total_score,
    duration: paper.duration,
    pass_score: paper.pass_score,
    status: paper.status
  })
}
 
const closeModal = () => {
  showAddModal.value = false
  editingPaper.value = null
}
 
const savePaper = async () => {
  saving.value = true
  try {
    const data = { ...paperForm }
    if (editingPaper.value) {
      await practiceAPI.updatePaper(editingPaper.value.id, data)
    } else {
      await practiceAPI.createPaper(data)
    }
    closeModal()
    loadPapers()
  } catch (e) {
    alert(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}
 
const deletePaper = async (paper) => {
  if (!confirm(`确定删除试卷"${paper.name}"吗？`)) return
  try {
    await practiceAPI.deletePaper(paper.id)
    loadPapers()
  } catch (e) {
    alert(e.message || '删除失败')
  }
}
 
const searchQuestions = async () => {
  if (!searchQuestion.value && !filterQuestionType.value) {
    availableQuestions.value = []
    return
  }
  try {
    const params = {
      search: searchQuestion.value,
      question_type: filterQuestionType.value,
      pageSize: 20
    }
    const res = await practiceAPI.getQuestions(params)
    availableQuestions.value = res.questions || []
  } catch (e) {
    console.error('搜索题目失败:', e)
  }
}
 
const addQuestionsToPaper = async () => {
  if (selectedQuestionIds.value.length === 0) return
  saving.value = true
  try {
    for (const qId of selectedQuestionIds.value) {
      await practiceAPI.addQuestionToPaper(selectedPaper.value.id, qId)
    }
    showAddQuestionModal.value = false
    selectedQuestionIds.value = []
    await loadPaperQuestions()
  } catch (e) {
    alert(e.message || '添加失败')
  } finally {
    saving.value = false
  }
}
 
const removeQuestionFromPaper = async (questionId) => {
  if (!confirm('确定从试卷中移除该题目吗？')) return
  try {
    await practiceAPI.removeQuestionFromPaper(selectedPaper.value.id, questionId)
    await loadPaperQuestions()
  } catch (e) {
    alert(e.message || '移除失败')
  }
}
 
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
  showImportInPaper.value = false
  importFile.value = null
  importResult.value = null
  if (fileInput.value) fileInput.value.value = ''
}
 
const downloadTemplate = () => {
  const templateData = [
    { '题目内容': 'AI的英文全称是什么？', '题型': '单选题', '选项': 'Artificial Intelligence|Advanced Intelligence|Automated Intelligence|Algorithmic Intelligence', '正确答案': 'A', '解析': 'AI是Artificial Intelligence的缩写', '难度': '简单', '分值': 2 }
  ]
  const ws = XLSX.utils.json_to_sheet(templateData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '题目模板')
  ws['!cols'] = [{ wch: 50 }, { wch: 10 }, { wch: 60 }, { wch: 15 }, { wch: 40 }, { wch: 10 }, { wch: 8 }]
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
            points: row['分值'] || 2
          })),
          exam_type: selectedPaper.value.exam_type,
          paper_id: selectedPaper.value.id
        })
        importResult.value = res
        if (res.results?.success > 0) {
          await loadPaperQuestions()
        }
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
 
watch([searchQuestion, filterQuestionType], () => {
  searchQuestions()
})
 
onMounted(() => {
  loadPapers()
})
</script>

<style scoped>
.admin-page { padding: 24px; }
.page-toolbar { display: flex; justify-content: space-between; margin-bottom: 24px; }
.filter-group { display: flex; gap: 12px; }
.filter-group select { padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; }
.btn-primary { background: #4F46E5; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
.btn-secondary { background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
.btn-sm { padding: 4px 8px; font-size: 12px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; }
.btn-danger { color: #dc3545; border-color: #dc3545; }
 
.papers-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
.paper-card { background: white; border-radius: 8px; padding: 20px; cursor: pointer; transition: all 0.3s; border: 1px solid #eee; }
.paper-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-color: #4F46E5; }
.paper-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.paper-header h3 { margin: 0; font-size: 16px; }
.status-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
.status-badge.draft { background: #fff3e0; color: #f57c00; }
.status-badge.published { background: #e8f5e9; color: #4caf50; }
.paper-stats { display: flex; gap: 24px; margin-bottom: 16px; }
.stat { text-align: center; }
.stat-value { font-size: 24px; font-weight: 600; color: #333; }
.stat-label { font-size: 12px; color: #666; }
.paper-exam-type { font-size: 12px; color: #666; margin-bottom: 12px; }
.paper-actions { display: flex; gap: 8px; }
 
.paper-detail { background: white; border-radius: 8px; padding: 24px; }
.detail-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #eee; }
.btn-back { background: none; border: 1px solid #ddd; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
.detail-header h2 { margin: 0; flex: 1; }
.detail-actions { margin-left: auto; display: flex; gap: 12px; }
 
.questions-section { margin-top: 24px; }
.section-title { font-size: 14px; font-weight: 600; margin-bottom: 16px; }
.questions-list { display: flex; flex-direction: column; gap: 12px; }
.question-item { display: flex; align-items: center; padding: 12px; border: 1px solid #eee; border-radius: 6px; }
.question-number { width: 32px; height: 32px; background: #4F46E5; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; margin-right: 12px; }
.question-content { flex: 1; }
.question-title { font-size: 14px; margin-bottom: 4px; }
.question-meta { display: flex; gap: 8px; font-size: 12px; }
.type-badge, .difficulty-badge { padding: 2px 6px; border-radius: 3px; }
.type-badge.single { background: #e3f2fd; color: #1976d2; }
.type-badge.multiple { background: #f3e5f5; color: #7b1fa2; }
.type-badge.judge { background: #e8f5e9; color: #388e3c; }
.difficulty-badge.easy { background: #c8e6c9; color: #2e7d32; }
.difficulty-badge.medium { background: #fff8e1; color: #f57c00; }
.difficulty-badge.hard { background: #ffebee; color: #c62828; }
.question-score { color: #666; }
.question-actions { margin-left: auto; }
 
.modal { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: white; border-radius: 12px; padding: 24px; width: 90%; max-width: 500px; max-height: 80vh; overflow-y: auto; }
.modal-content.modal-lg { max-width: 800px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.modal-header h3 { margin: 0; }
.close-btn { background: none; border: none; font-size: 24px; cursor: pointer; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: 500; }
.form-group input, .form-group select, .form-group textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; }
.form-row { display: flex; gap: 16px; }
.form-row .form-group { flex: 1; }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; }
.btn-cancel { background: #f5f5f5; border: 1px solid #ddd; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
 
.question-selector { padding: 20px 0; }
.selector-toolbar { display: flex; gap: 12px; margin-bottom: 16px; }
.selector-toolbar input { flex: 1; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; }
.available-questions { max-height: 400px; overflow-y: auto; border: 1px solid #eee; border-radius: 6px; }
.question-checkbox { padding: 12px; border-bottom: 1px solid #eee; }
.question-checkbox:last-child { border-bottom: none; }
.question-checkbox label { display: flex; align-items: center; gap: 12px; cursor: pointer; }
.question-checkbox:hover { background: #f9f9f9; }
.q-type { font-size: 12px; color: #666; }
.q-title { flex: 1; }
 
.import-content { padding: 20px 0; }
.import-steps { display: flex; flex-direction: column; gap: 24px; }
.step h4 { margin: 0 0 8px; font-size: 14px; }
.step p { margin: 0 0 12px; font-size: 13px; color: #666; }
.upload-area { border: 2px dashed #ddd; border-radius: 8px; padding: 30px; text-align: center; cursor: pointer; }
.upload-area:hover { border-color: #4F46E5; background: #f8f9ff; }
.upload-area.has-file { border-color: #4caf50; background: #f1f8e9; }
.file-name { color: #4caf50; font-weight: 500; }
.import-result { margin-top: 20px; padding: 16px; background: #f5f5f5; border-radius: 8px; }
.result-summary { font-weight: 500; }
 
.loading-state { text-align: center; padding: 40px; color: #666; }
.empty-state { text-align: center; padding: 40px; color: #999; }
</style>
