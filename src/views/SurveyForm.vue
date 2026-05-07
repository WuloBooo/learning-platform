<template>
  <div class="form-container">
    <div class="form-header">
      <h1>学员报名审核流程调研</h1>
      <p>请按下面的问题逐一回答，尽量详细</p>
    </div>

    <form @submit.prevent="submitForm" class="form-body">
      <div class="form-section">
        <h2>一、学员来源</h2>

        <div class="form-group">
          <label>1. 散客（自主报名的学员）是怎么找到我们的？</label>
          <textarea v-model="form.q1" rows="3" placeholder="请描述散客联系我们的渠道和方式"></textarea>
        </div>

        <div class="form-group">
          <label>2. 机构学员是机构那边怎么把学员信息给你的？</label>
          <textarea v-model="form.q2" rows="3" placeholder="比如发Excel表格、截图、还是其他方式"></textarea>
        </div>

        <div class="form-group">
          <label>3. 平均一周大概有多少个新学员需要处理？</label>
          <input v-model="form.q3" placeholder="散客和机构分别说" />
        </div>
      </div>

      <div class="form-section">
        <h2>二、收到信息后的操作</h2>

        <div class="form-group">
          <label>4. 收到一个新学员的信息后，你第一步做什么？</label>
          <textarea v-model="form.q4" rows="3" placeholder="请描述第一步操作"></textarea>
        </div>

        <div class="form-group">
          <label>5. 你需要从学员那里收集哪些资料？</label>
          <textarea v-model="form.q5" rows="3" placeholder="比如身份证、学历证明、照片等，列全"></textarea>
        </div>

        <div class="form-group">
          <label>6. 这些资料学员是怎么给你的？</label>
          <input v-model="form.q6" placeholder="企微发图片、发文件、填表？" />
        </div>

        <div class="form-group">
          <label>7. 你收到后是怎么整理和存储的？</label>
          <input v-model="form.q7" placeholder="Excel表格、文件夹、还是其他？" />
        </div>
      </div>

      <div class="form-section">
        <h2>三、报考条件审核</h2>

        <div class="form-group">
          <label>8. 不同等级的报考条件你是在哪里查的？</label>
          <input v-model="form.q8" placeholder="有文档吗？在哪里？" />
        </div>

        <div class="form-group">
          <label>9. 审核一个学员的报考条件大概需要多长时间？</label>
          <input v-model="form.q9" placeholder="大概几分钟或多久" />
        </div>

        <div class="form-group">
          <label>10. 审核过程中最容易出问题的是哪个环节？</label>
          <textarea v-model="form.q10" rows="3" placeholder="请描述容易出问题的环节"></textarea>
        </div>
      </div>

      <div class="form-section">
        <h2>四、提交报名</h2>

        <div class="form-group">
          <label>11. 审核通过后，在第三方报名平台上做什么操作？</label>
          <textarea v-model="form.q11" rows="4" placeholder="请描述具体步骤"></textarea>
        </div>

        <div class="form-group">
          <label>12. 每个学员需要在平台上填写哪些字段？</label>
          <textarea v-model="form.q12" rows="3" placeholder="请列出需要填写的所有字段"></textarea>
        </div>

        <div class="form-group">
          <label>13. 是一个一个手动录入，还是可以批量导入？</label>
          <input v-model="form.q13" placeholder="手动录入 or 批量导入" />
        </div>
      </div>

      <div class="form-section">
        <h2>五、后续跟进</h2>

        <div class="form-group">
          <label>14. 报名提交后还需要做什么？</label>
          <textarea v-model="form.q14" rows="3" placeholder="通知学员、确认缴费、安排课程等"></textarea>
        </div>

        <div class="form-group">
          <label>15. 从收到学员信息到完成报名，整个流程大概多长时间？</label>
          <input v-model="form.q15" placeholder="大概几天或几小时" />
        </div>

        <div class="form-group">
          <label>16. 一个学员大概需要沟通几次才能办完？</label>
          <input v-model="form.q16" placeholder="大概几次" />
        </div>
      </div>

      <div class="form-section">
        <h2>六、你觉得最耗时的环节</h2>

        <div class="form-group">
          <label>17. 整个流程中，最浪费时间的是哪一步？</label>
          <textarea v-model="form.q17" rows="3" placeholder="请描述最耗时的环节"></textarea>
        </div>

        <div class="form-group">
          <label>18. 如果能自动化其中一个环节，你最希望是哪个？</label>
          <textarea v-model="form.q18" rows="3" placeholder="请描述你最想自动化的环节"></textarea>
        </div>
      </div>

      <div class="form-section submit-section">
        <div class="form-group">
          <label>填写人姓名</label>
          <input v-model="form.name" placeholder="请输入您的姓名" />
        </div>
        <button type="submit" class="submit-btn" :disabled="submitting">
          {{ submitting ? '提交中...' : '提交问卷' }}
        </button>
      </div>
    </form>

    <div v-if="submitted" class="success-overlay">
      <div class="success-card">
        <div class="success-icon">✓</div>
        <h2>提交成功</h2>
        <p>感谢您的填写，我们会尽快整理分析。</p>
        <button class="start-btn" @click="submitted = false">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const form = ref({
  name: '',
  q1: '', q2: '', q3: '',
  q4: '', q5: '', q6: '', q7: '',
  q8: '', q9: '', q10: '',
  q11: '', q12: '', q13: '',
  q14: '', q15: '', q16: '',
  q17: '', q18: ''
})

const submitting = ref(false)
const submitted = ref(false)

const submitForm = async () => {
  if (!form.value.name.trim()) {
    alert('请填写您的姓名')
    return
  }

  submitting.value = true
  try {
    const res = await fetch('/api/survey/form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message)
    submitted.value = true
  } catch (e) {
    alert('提交失败：' + e.message)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.form-container {
  max-width: 700px;
  margin: 0 auto;
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 40px;
}

.form-header {
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  color: white;
  padding: 32px 20px;
  text-align: center;
}

.form-header h1 {
  margin: 0 0 8px;
  font-size: 22px;
}

.form-header p {
  margin: 0;
  font-size: 14px;
  opacity: 0.85;
}

.form-body {
  padding: 16px;
}

.form-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.form-section h2 {
  margin: 0 0 16px;
  font-size: 17px;
  color: #4F46E5;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.form-group {
  margin-bottom: 16px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
  line-height: 1.5;
}

.form-group input,
.form-group textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: #4F46E5;
}

.form-group textarea {
  resize: vertical;
}

.submit-section {
  text-align: center;
}

.submit-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submit-btn:not(:disabled):hover {
  opacity: 0.9;
}

.success-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.success-card {
  background: white;
  border-radius: 20px;
  padding: 40px 32px;
  text-align: center;
  max-width: 360px;
  width: 100%;
}

.success-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  color: white;
  font-size: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.success-card h2 {
  margin: 0 0 8px;
  font-size: 20px;
  color: #1f2937;
}

.success-card p {
  margin: 0 0 24px;
  color: #6b7280;
  font-size: 14px;
}

.start-btn {
  padding: 12px 32px;
  border: none;
  border-radius: 8px;
  background: #4F46E5;
  color: white;
  font-size: 14px;
  cursor: pointer;
}
</style>
