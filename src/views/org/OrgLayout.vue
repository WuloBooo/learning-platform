<template>
  <div class="org-layout">
    <!-- 顶栏 -->
    <header class="org-header">
      <div class="header-left">
        <h1>{{ orgUser.org_name || '机构管理平台' }}</h1>
      </div>
      <div class="header-right">
        <span class="user-info">{{ orgUser.contact_name || orgUser.username }}</span>
        <button class="logout-btn" @click="handleLogout">退出登录</button>
      </div>
    </header>

    <!-- 内容区 -->
    <main class="org-main">
      <!-- 数据表列表 -->
      <div v-if="!currentSheet" class="sheets-view">
        <h2>我的数据表</h2>
        <div class="sheets-grid">
          <div class="sheet-card" v-for="sheet in sheets" :key="sheet.id" @click="openSheet(sheet)">
            <div class="sheet-icon">📊</div>
            <div class="sheet-info">
              <h3>{{ sheet.sheet_name }}</h3>
              <p>{{ sheet.description || '暂无描述' }}</p>
            </div>
            <span class="sheet-status" :class="sheet.status === 'active' ? 'active' : 'archived'">
              {{ sheet.status === 'active' ? '使用中' : '已归档' }}
            </span>
          </div>
          <div class="empty-state" v-if="sheets.length === 0">
            <p>暂无数据表</p>
            <p class="hint">请等待管理员为您创建数据表</p>
          </div>
        </div>
      </div>

      <!-- 表格编辑视图 -->
      <div v-else class="editor-view">
        <div class="editor-header">
          <button class="back-btn" @click="closeSheet">← 返回列表</button>
          <h2>{{ currentSheet.sheet_name }}</h2>
        </div>

        <div class="table-toolbar">
          <button class="tool-btn" @click="addRow">+ 添加空行</button>
          <button class="tool-btn secondary" @click="exportExcel">导出 Excel</button>
          <button class="tool-btn outline" @click="loadSheetData">刷新数据</button>
        </div>

        <div class="table-scroll">
          <table class="edit-table">
            <thead>
              <tr>
                <th class="col-idx">#</th>
                <th v-for="col in columns" :key="col.key" :style="{ minWidth: col.width }">{{ col.label }}</th>
                <th class="col-act">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in rows" :key="row.id">
                <td class="col-idx">{{ idx + 1 }}</td>
                <td v-for="col in columns" :key="col.key"
                    :class="{ editing: editingCell === `${row.id}-${col.key}` }"
                    @dblclick="startEdit(row, col.key)">
                  <template v-if="editingCell === `${row.id}-${col.key}`">
                    <input :value="row[col.key]"
                      @blur="saveEdit(row, col.key, $event)"
                      @keyup.enter="$event.target.blur()"
                      @keyup.escape="cancelEdit"
                      class="cell-input"
                      ref="editInput" />
                  </template>
                  <template v-else>
                    {{ row[col.key] || '' }}
                  </template>
                </td>
                <td class="col-act">
                  <button class="row-del" @click="deleteRow(row)">删除</button>
                </td>
              </tr>
              <tr v-if="rows.length === 0">
                <td :colspan="columns.length + 2" class="empty-row">暂无数据，点击"添加空行"开始录入</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { orgAPI } from '../../api'
import * as XLSX from 'xlsx'

const router = useRouter()
const orgUser = ref(JSON.parse(localStorage.getItem('org_user') || '{}'))
const sheets = ref([])
const currentSheet = ref(null)
const rows = ref([])
const editingCell = ref(null)
const editInput = ref(null)

const columns = [
  { key: 'name', label: '姓名', width: '90px' },
  { key: 'phone', label: '电话', width: '120px' },
  { key: 'id_card', label: '身份证号', width: '180px' },
  { key: 'job_type', label: '工种', width: '120px' },
  { key: 'level', label: '级别', width: '70px' },
  { key: 'reg_date', label: '报名日期', width: '120px' },
  { key: 'exam_date', label: '考试日期', width: '120px' },
  { key: 'condition', label: '报考条件', width: '120px' },
  { key: 'major', label: '专业/岗位', width: '120px' }
]

const loadSheets = async () => {
  try {
    const res = await orgAPI.getSheets()
    sheets.value = res.data || []
  } catch (e) {
    console.error('加载数据表失败', e)
  }
}

const openSheet = async (sheet) => {
  currentSheet.value = sheet
  await loadSheetData()
}

const loadSheetData = async () => {
  if (!currentSheet.value) return
  try {
    const res = await orgAPI.getSheetStudents(currentSheet.value.id)
    rows.value = res.data?.students || []
  } catch (e) {
    console.error('加载失败', e)
  }
}

const closeSheet = () => {
  currentSheet.value = null
  rows.value = []
  editingCell.value = null
}

const startEdit = (row, colKey) => {
  editingCell.value = `${row.id}-${colKey}`
  nextTick(() => {
    const inputs = document.querySelectorAll('.cell-input')
    if (inputs.length > 0) inputs[inputs.length - 1].focus()
  })
}

const saveEdit = async (row, colKey, event) => {
  editingCell.value = null
  const newVal = event.target.value.trim()
  if (newVal === (row[colKey] || '')) return
  row[colKey] = newVal

  if (!currentSheet.value || !row.id) return
  try {
    await orgAPI.updateStudent(currentSheet.value.id, row.id, { [colKey]: newVal })
    console.log('保存成功:', colKey, '=', newVal)
  } catch (e) {
    console.error('保存失败:', e)
    alert('保存失败，请重试')
  }
}

const cancelEdit = () => {
  editingCell.value = null
}

const addRow = async () => {
  if (!currentSheet.value) return
  try {
    const res = await orgAPI.addStudent(currentSheet.value.id, {})
    if (res.data?.id) {
      rows.value.push({
        id: res.data.id,
        sheet_id: currentSheet.value.id,
        name: '', phone: '', id_card: '', job_type: '', level: '',
        reg_date: '', exam_date: '', condition: '', major: ''
      })
    }
  } catch (e) {
    console.error('添加失败', e)
    alert('添加失败')
  }
}

const deleteRow = async (row) => {
  if (!confirm('确定删除该行？')) return
  try {
    await orgAPI.deleteStudent(currentSheet.value.id, row.id)
    rows.value = rows.value.filter(r => r.id !== row.id)
  } catch (e) {
    console.error('删除失败', e)
  }
}

const exportExcel = () => {
  const data = rows.value.map(r => {
    const row = {}
    columns.forEach(c => { row[c.label] = r[c.key] || '' })
    return row
  })
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '学员数据')
  XLSX.writeFile(wb, `${currentSheet.value.sheet_name || '数据表'}.xlsx`)
}

const handleLogout = () => {
  localStorage.removeItem('org_token')
  localStorage.removeItem('org_user')
  router.push('/org/login')
}

onMounted(() => {
  loadSheets()
})
</script>

<style scoped>
.org-layout {
  min-height: 100vh;
  background: #f5f6fa;
}

.org-header {
  background: white;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.org-header h1 {
  font-size: 18px;
  color: #1a1a2e;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info { font-size: 14px; color: #666; }

.logout-btn {
  padding: 6px 16px;
  background: #f0f0f0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #666;
}
.logout-btn:hover { background: #e0e0e0; }

.org-main { padding: 16px; }

.sheets-view h2 { margin-bottom: 20px; color: #1a1a2e; }

.sheets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.sheet-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.1s;
  border: 1px solid #eee;
}
.sheet-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); transform: translateY(-2px); }

.sheet-icon { font-size: 32px; }
.sheet-info { flex: 1; }
.sheet-info h3 { margin: 0 0 4px; font-size: 16px; color: #333; }
.sheet-info p { margin: 0; font-size: 13px; color: #999; }

.sheet-status { font-size: 12px; padding: 4px 10px; border-radius: 12px; }
.sheet-status.active { background: #d1fae5; color: #065f46; }
.sheet-status.archived { background: #f3f4f6; color: #9ca3af; }

.empty-state { text-align: center; padding: 60px 20px; color: #999; }
.empty-state .hint { font-size: 13px; margin-top: 8px; }

.editor-header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }

.back-btn {
  padding: 8px 16px;
  background: #f0f0f0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}
.back-btn:hover { background: #e0e0e0; }

.editor-header h2 { margin: 0; font-size: 20px; color: #1a1a2e; }

.table-toolbar { display: flex; gap: 8px; margin-bottom: 12px; }

.tool-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  background: #667eea;
  color: white;
}
.tool-btn:hover { opacity: 0.9; }
.tool-btn.secondary { background: #10b981; }
.tool-btn.outline { background: white; color: #667eea; border: 1px solid #667eea; }

.table-scroll {
  background: white;
  border-radius: 12px;
  border: 1px solid #eee;
  overflow: auto;
}

.edit-table { width: 100%; border-collapse: collapse; font-size: 14px; }

.edit-table th {
  background: #f8f9fa;
  padding: 12px 10px;
  text-align: left;
  font-weight: 600;
  color: #555;
  border-bottom: 2px solid #e5e7eb;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 1;
}

.edit-table td {
  padding: 10px;
  border-bottom: 1px solid #f0f0f0;
  cursor: default;
  white-space: nowrap;
}

.edit-table tbody tr:hover td { background: #f8f9ff; }

.col-idx { width: 40px; text-align: center; color: #999; font-size: 13px; }
.col-act { width: 60px; text-align: center; }

.edit-table td.editing {
  padding: 4px;
  background: #fef3c7 !important;
}

.cell-input {
  width: 100%;
  padding: 6px 8px;
  border: 2px solid #667eea;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}

.row-del {
  background: none;
  border: none;
  color: #e74c3c;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 6px;
}
.row-del:hover { text-decoration: underline; }

.empty-row { text-align: center; padding: 40px !important; color: #999; }
</style>
