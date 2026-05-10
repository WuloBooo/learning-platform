<template>
  <div class="admin-page">
    <div class="page-toolbar">
      <div class="toolbar-info">
        <h2>学员管理</h2>
        <p class="hint">管理学员信息、审核状态、跟踪进度</p>
      </div>
      <div class="filter-group">
        <select v-model="filterStatus" @change="loadStudents">
          <option value="">全部状态</option>
          <option value="意向">意向</option>
          <option value="已报名">已报名</option>
          <option value="资料审核">资料审核</option>
          <option value="已缴费">已缴费</option>
          <option value="学习中">学习中</option>
          <option value="已考试">已考试</option>
          <option value="已拿证">已拿证</option>
        </select>
        <input v-model="searchKey" placeholder="搜索姓名/手机号" @keyup.enter="loadStudents" />
        <button class="btn-primary" @click="openAddModal">+ 手动添加学员</button>
      </div>
    </div>

    <div class="data-table" v-if="!loading">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>姓名</th>
            <th>手机号</th>
            <th>专业</th>
            <th>目标等级</th>
            <th>来源</th>
            <th>学员进度</th>
            <th>提交时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in filteredStudents" :key="s.id">
            <td>{{ s.id }}</td>
            <td>{{ s.name }}</td>
            <td>{{ s.phone }}</td>
            <td>{{ s.major || '-' }}</td>
            <td>{{ s.target_level || '-' }}</td>
            <td><span class="source-badge">{{ s.source || '网站' }}</span></td>
            <td class="progress-cell">
              <div class="stage-progress">
                <div v-for="(stage, idx) in STAGES" :key="idx"
                     class="stage-dot-wrap" @click="quickChangeStatus(s, stage)">
                  <div :class="['stage-dot', getDotClass(idx, s.status)]"></div>
                  <span class="stage-label">{{ STAGE_SHORT[idx] }}</span>
                </div>
              </div>
            </td>
            <td>{{ formatDate(s.created_at) }}</td>
            <td class="actions">
              <button class="btn-view" @click="viewDetail(s)">详情</button>
              <button class="btn-delete" @click="deleteStudent(s)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="empty-state" v-if="filteredStudents.length === 0">暂无学员数据</div>
    </div>
    <div class="loading-state" v-else>加载中...</div>

    <!-- 详情弹窗 -->
    <div class="exam-modal" v-if="showDetail" @click.self="showDetail = false">
      <div class="exam-modal-content exam-modal-lg">
        <div class="exam-modal-header">
          <h3>学员详情 - {{ detailData.name }}</h3>
          <button class="exam-modal-close" @click="showDetail = false">&times;</button>
        </div>
        <div class="exam-modal-body">
          <div class="detail-grid">
            <div class="detail-item"><label>姓名</label><span>{{ detailData.name }}</span></div>
            <div class="detail-item"><label>手机号</label><span>{{ detailData.phone }}</span></div>
            <div class="detail-item"><label>性别</label><span>{{ detailData.gender || '-' }}</span></div>
            <div class="detail-item"><label>年龄</label><span>{{ detailData.age || '-' }}</span></div>
            <div class="detail-item"><label>身份证号</label><span>{{ detailData.id_card || '-' }}</span></div>
            <div class="detail-item"><label>邮箱</label><span>{{ detailData.email || '-' }}</span></div>
            <div class="detail-item"><label>学历</label><span>{{ detailData.education || '-' }}</span></div>
            <div class="detail-item"><label>专业</label><span>{{ detailData.major || '-' }}</span></div>
            <div class="detail-item"><label>工作年限</label><span>{{ detailData.work_years || 0 }}年</span></div>
            <div class="detail-item"><label>社保年限</label><span>{{ detailData.social_security_years || 0 }}年</span></div>
            <div class="detail-item"><label>目标等级</label><span>{{ detailData.target_level || '-' }}</span></div>
            <div class="detail-item"><label>机构</label><span>{{ detailData.organization || '-' }}</span></div>
            <div class="detail-item"><label>备注</label><span>{{ detailData.remark || '-' }}</span></div>
            <div class="detail-item"><label>当前状态</label><span class="status-text">{{ detailData.status }}</span></div>
          </div>

          <h4 class="history-title">状态变更记录</h4>
          <div class="timeline" v-if="statusHistory.length > 0">
            <div v-for="h in statusHistory" :key="h.id" class="timeline-item">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <span class="timeline-stage">{{ h.stage }}</span>
                <span class="timeline-operator">{{ h.operator }}</span>
                <span class="timeline-note" v-if="h.note">{{ h.note }}</span>
                <span class="timeline-time">{{ formatDate(h.created_at) }}</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">暂无状态记录</div>
        </div>
      </div>
    </div>

    <!-- 更新状态弹窗 -->
    <div class="exam-modal" v-if="showStatusModal" @click.self="showStatusModal = false">
      <div class="exam-modal-content">
        <div class="exam-modal-header">
          <h3>更新状态 - {{ statusStudent?.name }}</h3>
          <button class="exam-modal-close" @click="showStatusModal = false">&times;</button>
        </div>
        <div class="exam-modal-body">
          <div class="form-group">
            <label>选择新状态</label>
            <select v-model="newStatus">
              <option value="意向">意向</option>
              <option value="已报名">已报名</option>
              <option value="资料审核">资料审核</option>
              <option value="已缴费">已缴费</option>
              <option value="学习中">学习中</option>
              <option value="已考试">已考试</option>
              <option value="已拿证">已拿证</option>
            </select>
          </div>
          <div class="form-group">
            <label>备注</label>
            <textarea v-model="statusNote" placeholder="可选备注" rows="3"></textarea>
          </div>
        </div>
        <div class="exam-modal-footer">
          <button class="btn-cancel" @click="showStatusModal = false">取消</button>
          <button class="btn-primary" @click="submitStatus">确认</button>
        </div>
      </div>
    </div>

    <!-- 手动添加学员弹窗 -->
    <div class="exam-modal" v-if="showAddModal" @click.self="showAddModal = false">
      <div class="exam-modal-content exam-modal-lg">
        <div class="exam-modal-header">
          <h3>手动添加学员</h3>
          <button class="exam-modal-close" @click="showAddModal = false">&times;</button>
        </div>
        <div class="exam-modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>姓名 <span class="required">*</span></label>
              <input v-model="addForm.name" placeholder="学员姓名" />
            </div>
            <div class="form-group">
              <label>手机号 <span class="required">*</span></label>
              <input v-model="addForm.phone" placeholder="手机号" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>性别</label>
              <select v-model="addForm.gender">
                <option value="">请选择</option>
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
            </div>
            <div class="form-group">
              <label>年龄</label>
              <input v-model.number="addForm.age" type="number" placeholder="年龄" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>身份证号</label>
              <input v-model="addForm.id_card" placeholder="身份证号" />
            </div>
            <div class="form-group">
              <label>邮箱</label>
              <input v-model="addForm.email" placeholder="邮箱" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>学历</label>
              <select v-model="addForm.education">
                <option value="">请选择</option>
                <option value="初中">初中</option>
                <option value="高中">高中</option>
                <option value="大专">大专</option>
                <option value="本科">本科</option>
                <option value="硕士">硕士</option>
                <option value="博士">博士</option>
              </select>
            </div>
            <div class="form-group">
              <label>专业</label>
              <input v-model="addForm.major" placeholder="所学专业" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>工作年限</label>
              <input v-model.number="addForm.work_years" type="number" placeholder="工作年限" />
            </div>
            <div class="form-group">
              <label>社保年限</label>
              <input v-model.number="addForm.social_security_years" type="number" placeholder="社保年限" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>目标等级</label>
              <select v-model="addForm.target_level">
                <option value="">请选择</option>
                <option value="初级">初级</option>
                <option value="中级">中级</option>
                <option value="高级">高级</option>
              </select>
            </div>
            <div class="form-group">
              <label>来源渠道</label>
              <select v-model="addForm.source">
                <option value="网站">网站咨询</option>
                <option value="微信">微信咨询</option>
                <option value="电话">电话咨询</option>
                <option value="机构">机构推荐</option>
                <option value="其他">其他</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>所属机构</label>
              <input v-model="addForm.organization" placeholder="所属机构（可选）" />
            </div>
            <div class="form-group">
              <label>初始状态</label>
              <select v-model="addForm.status">
                <option value="意向">意向</option>
                <option value="已报名">已报名</option>
                <option value="资料审核">资料审核</option>
                <option value="已缴费">已缴费</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>备注</label>
            <textarea v-model="addForm.remark" placeholder="备注信息" rows="2"></textarea>
          </div>
        </div>
        <div class="exam-modal-footer">
          <button class="btn-cancel" @click="showAddModal = false">取消</button>
          <button class="btn-primary" @click="submitAddStudent">添加学员</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const API_BASE = '/api/workflow'
const token = () => localStorage.getItem('token')
const headers = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` })

const STAGES = ['意向', '已报名', '资料审核', '已缴费', '学习中', '已考试', '已拿证']
const STAGE_SHORT = ['意向', '报名', '审核', '缴费', '学习', '考试', '拿证']

const getStageIndex = (status) => STAGES.indexOf(status)
const getDotClass = (idx, status) => {
  const current = getStageIndex(status)
  if (idx < current) return 'done'
  if (idx === current) return 'active'
  return 'pending'
}

const quickChangeStatus = (s, stage) => {
  const current = getStageIndex(s.status)
  const target = getStageIndex(stage)
  if (target <= current) return
  statusStudent.value = s
  newStatus.value = stage
  statusNote.value = ''
  showStatusModal.value = true
}

const students = ref([])
const loading = ref(false)
const filterStatus = ref('')
const searchKey = ref('')
const showDetail = ref(false)
const showStatusModal = ref(false)
const detailData = ref({})
const statusHistory = ref([])
const statusStudent = ref(null)
const newStatus = ref('已报名')
const statusNote = ref('')

const filteredStudents = computed(() => {
  let list = students.value
  if (filterStatus.value) {
    list = list.filter(s => s.status === filterStatus.value)
  }
  if (searchKey.value) {
    const key = searchKey.value.toLowerCase()
    list = list.filter(s => s.name?.toLowerCase().includes(key) || s.phone?.includes(key))
  }
  return list
})

const loadStudents = async () => {
  loading.value = true
  try {
    const res = await fetch(`${API_BASE}/admin/students`, { headers: headers() })
    const data = await res.json()
    students.value = data.data || []
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}

const viewDetail = async (s) => {
  try {
    const res = await fetch(`${API_BASE}/admin/students/${s.id}`, { headers: headers() })
    const data = await res.json()
    detailData.value = data.data
    statusHistory.value = data.data?.statusHistory || []
    showDetail.value = true
  } catch (e) {
    alert('获取详情失败')
  }
}

const changeStatus = (s) => {
  statusStudent.value = s
  newStatus.value = '已报名'
  statusNote.value = ''
  showStatusModal.value = true
}

const submitStatus = async () => {
  if (!statusStudent.value) return
  try {
    const res = await fetch(`${API_BASE}/admin/students/${statusStudent.value.id}/status`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ stage: newStatus.value, operator: '管理员', note: statusNote.value })
    })
    if (res.ok) {
      showStatusModal.value = false
      await loadStudents()
    } else {
      alert('更新失败')
    }
  } catch (e) {
    alert('更新失败')
  }
}

const deleteStudent = async (s) => {
  if (!confirm(`确定删除学员「${s.name}」？`)) return
  try {
    const res = await fetch(`${API_BASE}/admin/students/${s.id}`, { method: 'DELETE', headers: headers() })
    if (res.ok) await loadStudents()
  } catch (e) {
    alert('删除失败')
  }
}

const getStatusClass = (status) => {
  const map = { '意向': 'pending', '已报名': 'info', '资料审核': 'warning', '已缴费': 'success', '学习中': 'info', '已考试': 'success', '已拿证': 'complete' }
  return map[status] || 'pending'
}

const formatDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN')
}

// 手动添加学员
const showAddModal = ref(false)
const addForm = ref({ name: '', phone: '', gender: '', age: '', id_card: '', email: '', education: '', major: '', work_years: '', social_security_years: '', target_level: '', source: '微信', organization: '', status: '意向', remark: '' })

const openAddModal = () => {
  addForm.value = { name: '', phone: '', gender: '', age: '', id_card: '', email: '', education: '', major: '', work_years: '', social_security_years: '', target_level: '', source: '微信', organization: '', status: '意向', remark: '' }
  showAddModal.value = true
}

const submitAddStudent = async () => {
  if (!addForm.value.name || !addForm.value.phone) {
    alert('请填写姓名和手机号')
    return
  }
  try {
    const res = await fetch(`${API_BASE}/student/submit`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(addForm.value)
    })
    if (res.ok) {
      // 如果初始状态不是意向，需要更新状态
      const data = await res.json()
      if (addForm.value.status !== '意向' && data.data?.id) {
        await fetch(`${API_BASE}/admin/students/${data.data.id}/status`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ stage: addForm.value.status, operator: '管理员', note: `手动添加，初始状态：${addForm.value.status}` })
        })
      }
      showAddModal.value = false
      await loadStudents()
    } else {
      alert('添加失败')
    }
  } catch (e) {
    alert('添加失败')
  }
}

onMounted(loadStudents)
</script>

<style scoped>
.hint { color: var(--text-secondary); font-size: 14px; margin-top: 4px; }
.toolbar-info h2 { margin: 0; font-size: 18px; }
.filter-group { display: flex; gap: 10px; align-items: center; }
.filter-group select, .filter-group input { padding: 6px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px; }
.filter-group input { width: 180px; }
.status-badge { padding: 2px 10px; border-radius: 10px; font-size: 12px; }
.status-badge.pending { background: #fef3c7; color: #92400e; }
.status-badge.info { background: #dbeafe; color: #1e40af; }
.status-badge.warning { background: #fef3c7; color: #92400e; }
.status-badge.success { background: #d1fae5; color: #065f46; }
.status-badge.complete { background: #ede9fe; color: #5b21b6; }
.source-badge { font-size: 11px; padding: 2px 8px; border-radius: 10px; background: #f0f0f0; color: #666; white-space: nowrap; }
.btn-view { padding: 4px 10px; border: 1px solid var(--primary-color); background: transparent; color: var(--primary-color); border-radius: 4px; cursor: pointer; font-size: 12px; }
.btn-view:hover { background: var(--primary-color); color: white; }
.btn-status { padding: 4px 10px; border: 1px solid var(--warning-color); background: transparent; color: var(--warning-color); border-radius: 4px; cursor: pointer; font-size: 12px; }
.btn-status:hover { background: var(--warning-color); color: white; }

/* 弹窗样式 */
.exam-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.exam-modal-content { background: var(--bg-primary); border-radius: var(--radius-lg); width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
.exam-modal-lg { max-width: 700px; }
.exam-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--border-color); }
.exam-modal-header h3 { font-size: 18px; font-weight: 600; margin: 0; }
.exam-modal-close { background: none; border: none; font-size: 24px; color: var(--text-secondary); cursor: pointer; }
.exam-modal-body { padding: 24px; }
.exam-modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid var(--border-color); }
.btn-cancel { padding: 8px 20px; border: 1px solid var(--border-color); background: var(--bg-primary); border-radius: var(--radius-md); cursor: pointer; }

/* 详情 */
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
.detail-item { display: flex; flex-direction: column; gap: 2px; }
.detail-item label { font-size: 12px; color: var(--text-secondary); }
.detail-item span { font-size: 14px; }
.status-text { font-weight: 600; color: var(--primary-color); }
.history-title { font-size: 16px; margin: 20px 0 12px; padding-top: 16px; border-top: 1px solid var(--border-color); }
.timeline { padding-left: 20px; border-left: 2px solid var(--border-color); }
.timeline-item { position: relative; padding: 8px 0 8px 16px; }
.timeline-dot { position: absolute; left: -7px; top: 14px; width: 10px; height: 10px; border-radius: 50%; background: var(--primary-color); }
.timeline-content { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font-size: 14px; }
.timeline-stage { font-weight: 600; }
.timeline-operator { color: var(--text-secondary); }
.timeline-note { color: var(--text-secondary); font-style: italic; }
.timeline-time { color: var(--text-light); font-size: 12px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 6px; }
.form-group select, .form-group textarea { width: 100%; padding: 10px 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px; }
.form-group input { width: 100%; padding: 10px 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px; box-sizing: border-box; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.required { color: #ef4444; }
@media (max-width: 600px) { .detail-grid { grid-template-columns: 1fr; } .form-row { grid-template-columns: 1fr; } }

/* 状态进度条 */
.progress-cell { min-width: 280px; }
.stage-progress { display: flex; align-items: center; gap: 0; }
.stage-dot-wrap { display: flex; flex-direction: column; align-items: center; flex: 1; cursor: pointer; position: relative; }
.stage-dot-wrap:not(:last-child)::after { content: ''; position: absolute; top: 7px; left: 50%; width: 100%; height: 2px; background: #e5e7eb; z-index: 0; }
.stage-dot-wrap.done:not(:last-child)::after { background: #10b981; }
.stage-dot { width: 14px; height: 14px; border-radius: 50%; border: 2px solid #d1d5db; background: #fff; z-index: 1; position: relative; transition: all .15s; }
.stage-dot.done { background: #10b981; border-color: #10b981; }
.stage-dot.active { background: #3b82f6; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
.stage-label { font-size: 10px; color: #9ca3af; margin-top: 3px; white-space: nowrap; line-height: 1; }
.stage-dot-wrap.done .stage-label { color: #059669; }
.stage-dot-wrap.active .stage-label { color: #2563eb; font-weight: 600; }
.stage-dot-wrap:hover .stage-dot { transform: scale(1.3); }
</style>
