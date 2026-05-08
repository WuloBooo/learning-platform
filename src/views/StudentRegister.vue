<template>
  <div class="page-container">
    <div class="page-header">
      <h1>学员信息登记</h1>
      <p>填写您的信息，系统将自动判断报考资格并生成资料清单</p>
    </div>

    <div class="form-card" v-if="!submitted">
      <div class="form-section">
        <h3>基本信息</h3>
        <div class="form-row">
          <div class="form-group">
            <label>姓名 <span class="required">*</span></label>
            <input v-model="form.name" placeholder="请输入姓名" />
          </div>
          <div class="form-group">
            <label>手机号 <span class="required">*</span></label>
            <input v-model="form.phone" placeholder="请输入手机号" maxlength="11" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>性别</label>
            <select v-model="form.gender">
              <option value="">请选择</option>
              <option value="男">男</option>
              <option value="女">女</option>
            </select>
          </div>
          <div class="form-group">
            <label>年龄</label>
            <input v-model.number="form.age" type="number" placeholder="请输入年龄" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>身份证号</label>
            <input v-model="form.id_card" placeholder="请输入身份证号" maxlength="18" />
          </div>
          <div class="form-group">
            <label>邮箱</label>
            <input v-model="form.email" placeholder="请输入邮箱" />
          </div>
        </div>
      </div>

      <div class="form-section">
        <h3>学历与专业</h3>
        <div class="form-row">
          <div class="form-group">
            <label>最高学历</label>
            <select v-model="form.education">
              <option value="">请选择</option>
              <option value="初中">初中</option>
              <option value="高中">高中</option>
              <option value="中专">中专</option>
              <option value="大专">大专</option>
              <option value="本科">本科</option>
              <option value="硕士">硕士</option>
              <option value="博士">博士</option>
            </select>
          </div>
          <div class="form-group">
            <label>所学专业</label>
            <input v-model="form.major" placeholder="请输入所学专业" />
          </div>
        </div>
      </div>

      <div class="form-section">
        <h3>工作经历</h3>
        <div class="form-row">
          <div class="form-group">
            <label>工作年限</label>
            <input v-model.number="form.work_years" type="number" placeholder="请输入工作年限" min="0" />
          </div>
          <div class="form-group">
            <label>社保缴纳年限</label>
            <input v-model.number="form.social_security_years" type="number" placeholder="请输入社保缴纳年限" min="0" />
          </div>
        </div>
      </div>

      <div class="form-section">
        <h3>其他信息</h3>
        <div class="form-group">
          <label>目标报考等级</label>
          <select v-model="form.target_level">
            <option value="">请选择</option>
            <option value="初级">初级</option>
            <option value="中级">中级</option>
            <option value="高级">高级</option>
          </select>
        </div>
        <div class="form-group">
          <label>所属机构</label>
          <input v-model="form.organization" placeholder="如无机构可留空" />
        </div>
        <div class="form-group">
          <label>备注</label>
          <textarea v-model="form.remark" placeholder="其他需要说明的信息" rows="3"></textarea>
        </div>
      </div>

      <div class="check-result" v-if="checkResult">
        <h3>📋 自动校验结果</h3>
        <div class="check-item" v-for="item in checkResult" :key="item.label">
          <span :class="item.pass ? 'pass' : 'fail'">{{ item.pass ? '✅' : '❌' }}</span>
          <span>{{ item.label }}：{{ item.value }}</span>
        </div>
      </div>

      <button class="btn-primary btn-submit" @click="submitForm" :disabled="submitting">
        {{ submitting ? '提交中...' : '提交信息' }}
      </button>
    </div>

    <div class="success-card" v-if="submitted">
      <div class="success-icon">✅</div>
      <h2>信息提交成功</h2>
      <p>您的信息已提交，老师会尽快与您联系。</p>
      <p>如有疑问请联系：400-888-9999</p>
      <button class="btn-primary" @click="resetForm">继续登记</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const API_BASE = '/api/workflow'
const submitting = ref(false)
const submitted = ref(false)

const form = ref({
  name: '', phone: '', email: '', gender: '', age: null,
  education: '', major: '', work_years: null, social_security_years: null,
  id_card: '', target_level: '', organization: '', remark: ''
})

const checkResult = computed(() => {
  const results = []
  const f = form.value
  if (!f.age && !f.education && !f.work_years) return null

  if (f.education) {
    const eduLevels = ['初中', '高中', '中专', '大专', '本科', '硕士', '博士']
    const eduIdx = eduLevels.indexOf(f.education)
    results.push({
      label: '学历要求',
      value: eduIdx >= 3 ? `(${f.education}) 满足大专及以上学历要求` : `(${f.education}) 大专以下学历，可能需额外工作经验`,
      pass: eduIdx >= 3
    })
  }

  if (f.age) {
    results.push({
      label: '年龄',
      value: f.age >= 18 ? `${f.age}岁，满足18岁以上要求` : `${f.age}岁，未满18岁`,
      pass: f.age >= 18
    })
  }

  if (f.work_years !== null) {
    results.push({
      label: '工作经验',
      value: f.work_years >= 1 ? `${f.work_years}年，满足要求` : `${f.work_years}年，至少需要1年工作经验`,
      pass: f.work_years >= 1
    })
  }

  return results.length > 0 ? results : null
})

const submitForm = async () => {
  if (!form.value.name || !form.value.phone) {
    alert('请填写姓名和手机号')
    return
  }
  if (!/^1\d{10}$/.test(form.value.phone)) {
    alert('请输入正确的手机号')
    return
  }

  submitting.value = true
  try {
    const res = await fetch(`${API_BASE}/student/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    })
    const data = await res.json()
    if (res.ok) {
      submitted.value = true
    } else {
      alert(data.message || '提交失败')
    }
  } catch (e) {
    alert('提交失败，请稍后重试')
  }
  submitting.value = false
}

const resetForm = () => {
  submitted.value = false
  form.value = {
    name: '', phone: '', email: '', gender: '', age: null,
    education: '', major: '', work_years: null, social_security_years: null,
    id_card: '', target_level: '', organization: '', remark: ''
  }
}
</script>

<style scoped>
.page-container {
  max-width: 700px;
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
.form-card {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: 30px;
  box-shadow: var(--shadow-md);
}
.form-section {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}
.form-section:last-of-type {
  border-bottom: none;
}
.form-section h3 {
  font-size: 16px;
  margin-bottom: 16px;
  color: var(--primary-color);
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.form-group {
  margin-bottom: 16px;
}
.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
}
.required {
  color: #ef4444;
}
.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 14px;
  background: var(--bg-primary);
}
.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary-color);
}
.check-result {
  background: var(--bg-secondary);
  padding: 16px 20px;
  border-radius: var(--radius-md);
  margin-bottom: 20px;
}
.check-result h3 {
  font-size: 16px;
  margin-bottom: 12px;
}
.check-item {
  padding: 6px 0;
  font-size: 14px;
}
.btn-submit {
  width: 100%;
  padding: 14px;
  font-size: 16px;
}
.success-card {
  text-align: center;
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: 60px 30px;
  box-shadow: var(--shadow-md);
}
.success-icon {
  font-size: 64px;
  margin-bottom: 16px;
}
.success-card h2 {
  font-size: 24px;
  margin-bottom: 12px;
}
.success-card p {
  color: var(--text-secondary);
  margin-bottom: 8px;
}
.success-card .btn-primary {
  margin-top: 24px;
}
@media (max-width: 600px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
