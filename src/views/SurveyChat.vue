<template>
  <div class="survey-container">
    <div class="chat-window">
      <div class="chat-header">
        <div class="header-info">
          <h2>工作流程调研</h2>
          <p>帮助我们了解您的日常工作，寻找优化机会</p>
        </div>
      </div>

      <div class="chat-messages" ref="messagesContainer">
        <div
          v-for="msg in messages"
          :key="msg.id || msg.tempId"
          :class="['message', msg.role === 'user' ? 'message-user' : 'message-ai']"
        >
          <div class="message-avatar">
            <span v-if="msg.role === 'assistant'">AI</span>
            <span v-else>我</span>
          </div>
          <div class="message-content">
            <div class="message-bubble">{{ msg.content }}</div>
          </div>
        </div>
        <div v-if="loading" class="message message-ai">
          <div class="message-avatar"><span>AI</span></div>
          <div class="message-content">
            <div class="message-bubble typing">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>
          </div>
        </div>
      </div>

      <div class="chat-input">
        <div class="input-wrapper">
          <input
            v-model="inputText"
            @keyup.enter="sendMessage"
            placeholder="输入你想说的..."
            :disabled="loading"
            ref="inputRef"
          />
          <button @click="sendMessage" :disabled="loading || !inputText.trim()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 开始前的引导页 -->
    <div v-if="!started" class="welcome-overlay">
      <div class="welcome-card">
        <div class="welcome-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <h2>工作流程调研</h2>
        <p>我们将通过一段简短的对话，了解您日常工作中哪些任务是重复性的，以便寻找自动化优化的机会。</p>
        <p class="welcome-note">对话内容仅用于流程分析，不会对外公开。</p>
        <div class="name-input">
          <input
            v-model="userName"
            placeholder="请输入您的姓名（选填）"
            @keyup.enter="startChat"
          />
        </div>
        <button class="start-btn" @click="startChat">开始对话</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue'

const messages = ref([])
const inputText = ref('')
const loading = ref(false)
const started = ref(false)
const sessionId = ref(null)
const userName = ref('')
const messagesContainer = ref(null)
const inputRef = ref(null)
const API_BASE = '/api/survey'

const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 恢复历史会话
const restoreSession = async () => {
  const savedId = localStorage.getItem('survey_session_id')
  if (!savedId) return false

  try {
    const res = await fetch(`${API_BASE}/sessions/${savedId}/messages`)
    const data = await res.json()
    if (!res.ok || !data.messages || data.messages.length === 0) {
      localStorage.removeItem('survey_session_id')
      return false
    }

    sessionId.value = parseInt(savedId)
    messages.value = data.messages
    started.value = true
    await scrollToBottom()
    return true
  } catch {
    localStorage.removeItem('survey_session_id')
    return false
  }
}

onMounted(() => {
  restoreSession()
})

const startChat = async () => {
  try {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: userName.value || '匿名' })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message)

    sessionId.value = data.sessionId
    localStorage.setItem('survey_session_id', data.sessionId)
    messages.value.push({
      tempId: Date.now(),
      role: 'assistant',
      content: data.openingMessage
    })
    started.value = true
    await scrollToBottom()
    inputRef.value?.focus()
  } catch (e) {
    alert('启动失败：' + e.message)
  }
}

const sendMessage = async () => {
  const text = inputText.value.trim()
  if (!text || loading.value) return

  messages.value.push({
    tempId: Date.now(),
    role: 'user',
    content: text
  })
  inputText.value = ''
  loading.value = true
  await scrollToBottom()

  try {
    const res = await fetch(`${API_BASE}/sessions/${sessionId.value}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message)

    messages.value.push({
      tempId: Date.now() + 1,
      role: 'assistant',
      content: data.reply
    })
  } catch (e) {
    messages.value.push({
      tempId: Date.now() + 1,
      role: 'assistant',
      content: '抱歉，处理出了点问题，请重试一下。'
    })
  } finally {
    loading.value = false
    await scrollToBottom()
    inputRef.value?.focus()
  }
}
</script>

<style scoped>
.survey-container {
  max-width: 700px;
  margin: 0 auto;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
  position: relative;
}

.chat-window {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-header {
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  color: white;
  padding: 20px 24px;
  flex-shrink: 0;
}

.chat-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.chat-header p {
  margin: 4px 0 0;
  font-size: 13px;
  opacity: 0.85;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 16px;
  -webkit-overflow-scrolling: touch;
}

.message {
  display: flex;
  margin-bottom: 16px;
  gap: 10px;
}

.message-user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.message-ai .message-avatar {
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  color: white;
}

.message-user .message-avatar {
  background: #E0E7FF;
  color: #4F46E5;
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 16px;
  line-height: 1.6;
  font-size: 14px;
  max-width: calc(100vw - 120px);
  word-break: break-word;
}

.message-ai .message-bubble {
  background: white;
  color: #1f2937;
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.message-user .message-bubble {
  background: linear-gradient(135deg, #4F46E5, #6366F1);
  color: white;
  border-bottom-right-radius: 4px;
}

.typing {
  display: flex;
  gap: 4px;
  padding: 16px 20px;
}

.dot {
  width: 8px;
  height: 8px;
  background: #9CA3AF;
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
  30% { opacity: 1; transform: scale(1); }
}

.chat-input {
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  background: white;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.input-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
}

.input-wrapper input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 24px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s;
}

.input-wrapper input:focus {
  border-color: #4F46E5;
}

.input-wrapper button {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #4F46E5, #6366F1);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s, transform 0.1s;
}

.input-wrapper button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-wrapper button:not(:disabled):hover {
  opacity: 0.9;
}

.input-wrapper button:not(:disabled):active {
  transform: scale(0.95);
}

/* 欢迎页遮罩 */
.welcome-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  padding: 20px;
}

.welcome-card {
  background: white;
  border-radius: 20px;
  padding: 40px 32px;
  text-align: center;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
}

.welcome-icon {
  margin-bottom: 20px;
}

.welcome-card h2 {
  margin: 0 0 12px;
  font-size: 22px;
  color: #1f2937;
}

.welcome-card p {
  margin: 0 0 8px;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.6;
}

.welcome-note {
  font-size: 12px !important;
  color: #9CA3AF !important;
  margin-bottom: 24px !important;
}

.name-input {
  margin-bottom: 20px;
}

.name-input input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  font-size: 16px;
  outline: none;
  text-align: center;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.name-input input:focus {
  border-color: #4F46E5;
}

.start-btn {
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

.start-btn:hover {
  opacity: 0.9;
}

/* 手机适配 */
@media (max-width: 480px) {
  .chat-header {
    padding: 16px;
  }

  .chat-header h2 {
    font-size: 16px;
  }

  .chat-messages {
    padding: 12px 10px;
  }

  .message {
    gap: 8px;
    margin-bottom: 12px;
  }

  .message-avatar {
    width: 32px;
    height: 32px;
    font-size: 11px;
  }

  .message-bubble {
    padding: 10px 14px;
    font-size: 14px;
    max-width: calc(100vw - 90px);
  }

  .chat-input {
    padding: 10px 12px;
    padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  }

  .welcome-card {
    padding: 28px 20px;
    border-radius: 16px;
  }

  .welcome-card h2 {
    font-size: 19px;
  }
}
</style>
