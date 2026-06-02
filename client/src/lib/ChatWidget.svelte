<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { sendMessage, getHistory, getConversations, deleteConversation, type ChatMessage, type ConversationPreview } from './api';

  let messages: ChatMessage[] = [];
  let inputText = '';
  let isLoading = false;
  let sessionId: string | null = null;
  let chatContainer: HTMLElement;
  let inputEl: HTMLTextAreaElement;
  let conversations: ConversationPreview[] = [];
  let sidebarOpen = true;
  let isMobile = false;

  const STORAGE_KEY = 'spur-chat-session';

  onMount(async () => {
    isMobile = window.innerWidth <= 768;
    if (isMobile) sidebarOpen = false;
    await loadConversations();
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      await loadChat(saved);
    }
    inputEl?.focus();
  });

  async function loadConversations() {
    try {
      conversations = await getConversations();
    } catch { /* ignore */ }
  }

  async function loadChat(id: string) {
    try {
      const history = await getHistory(id);
      sessionId = history.sessionId;
      messages = history.messages;
      localStorage.setItem(STORAGE_KEY, id);
      if (isMobile) sidebarOpen = false;
      await scrollToBottom();
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  async function scrollToBottom() {
    await tick();
    if (chatContainer) {
      chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
    }
  }

  async function handleSend() {
    const text = inputText.trim();
    if (!text || isLoading) return;

    inputText = '';
    resizeTextarea();
    messages = [...messages, { sender: 'user', text }];
    isLoading = true;
    await scrollToBottom();

    try {
      const response = await sendMessage(text, sessionId || undefined);
      sessionId = response.sessionId;
      localStorage.setItem(STORAGE_KEY, sessionId);
      messages = [...messages, { sender: 'ai', text: response.reply }];
      await loadConversations();
    } catch {
      messages = [...messages, {
        sender: 'ai',
        text: "I couldn't reach the server. Please check your connection and try again."
      }];
    } finally {
      isLoading = false;
      await scrollToBottom();
      inputEl?.focus();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function resizeTextarea() {
    if (!inputEl) return;
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
  }

  async function startNewChat() {
    messages = [];
    sessionId = null;
    localStorage.removeItem(STORAGE_KEY);
    if (isMobile) sidebarOpen = false;
    inputEl?.focus();
  }

  async function handleDeleteConversation(id: string, e: Event) {
    e.stopPropagation();
    await deleteConversation(id);
    if (sessionId === id) {
      messages = [];
      sessionId = null;
      localStorage.removeItem(STORAGE_KEY);
    }
    await loadConversations();
  }

  function formatTime(dateStr: string): string {
    const d = new Date(dateStr + 'Z');
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'Now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  function truncate(text: string | null, len: number): string {
    if (!text) return 'New conversation';
    return text.length > len ? text.slice(0, len) + '...' : text;
  }
</script>

<div class="shell">
  {#if sidebarOpen && isMobile}
    <div class="overlay" on:click={() => sidebarOpen = false} on:keydown={() => {}}></div>
  {/if}

  <aside class="sidebar" class:open={sidebarOpen}>
    <div class="sidebar-top">
      <div class="logo">
        <div class="logo-mark">S</div>
        <span class="logo-text">Spur</span>
      </div>
      <button class="btn-icon" on:click={() => sidebarOpen = false} aria-label="Close sidebar">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>

    <button class="btn-new" on:click={startNewChat} aria-label="New conversation">
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
      <span>New conversation</span>
    </button>

    <nav class="history">
      {#each conversations as convo (convo.id)}
        <div
          class="history-item"
          class:active={sessionId === convo.id}
          role="button"
          tabindex="0"
          on:click={() => loadChat(convo.id)}
          on:keydown={(e) => e.key === 'Enter' && loadChat(convo.id)}
        >
          <svg class="history-icon" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          <div class="history-content">
            <span class="history-text">{truncate(convo.preview, 28)}</span>
            <span class="history-time">{formatTime(convo.created_at)}</span>
          </div>
          <button class="btn-delete" on:click={(e) => handleDeleteConversation(convo.id, e)} aria-label="Delete conversation">
            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
          </button>
        </div>
      {/each}
    </nav>

    <div class="sidebar-footer">
      <div class="powered">
        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        <span>Powered by Claude</span>
      </div>
    </div>
  </aside>

  <main class="chat">
    <header class="topbar">
      <button class="btn-icon menu-toggle" on:click={() => sidebarOpen = !sidebarOpen} aria-label="Toggle sidebar">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
      </button>
      <div class="agent-info">
        <div class="agent-dot"></div>
        <span class="agent-name">SparkStore AI</span>
      </div>
    </header>

    <section class="messages" bind:this={chatContainer}>
      {#if messages.length === 0}
        <div class="empty">
          <div class="empty-icon">
            <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
          </div>
          <h2 class="empty-title">Start a conversation</h2>
          <p class="empty-desc">Ask about shipping, returns, payments, or anything else. I respond instantly.</p>
          <div class="chips">
            <button class="chip" on:click={() => { inputText = "What's your return policy?"; handleSend(); }}>Return policy</button>
            <button class="chip" on:click={() => { inputText = 'Do you ship to USA?'; handleSend(); }}>Ship to USA?</button>
            <button class="chip" on:click={() => { inputText = 'Payment methods'; handleSend(); }}>Payments</button>
            <button class="chip" on:click={() => { inputText = 'Support hours'; handleSend(); }}>Hours</button>
          </div>
        </div>
      {/if}

      {#each messages as msg, i (i)}
        <div class="msg" class:user={msg.sender === 'user'} class:ai={msg.sender === 'ai'}>
          {#if msg.sender === 'ai'}
            <div class="msg-avatar">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
          {/if}
          <div class="msg-content">
            <p class="msg-text">{msg.text}</p>
          </div>
        </div>
      {/each}

      {#if isLoading}
        <div class="msg ai">
          <div class="msg-avatar">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <div class="msg-content">
            <div class="thinking">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      {/if}
    </section>

    <footer class="composer">
      <div class="composer-box" class:focused={false}>
        <textarea
          bind:this={inputEl}
          bind:value={inputText}
          on:keydown={handleKeydown}
          on:input={resizeTextarea}
          placeholder="Message SparkStore AI..."
          disabled={isLoading}
          maxlength="2000"
          rows="1"
        ></textarea>
        <button
          class="btn-send"
          on:click={handleSend}
          disabled={!inputText.trim() || isLoading}
          aria-label="Send message"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>
    </footer>
  </main>
</div>

<style>
  :root {
    --bg: #ffffff;
    --bg-subtle: #f8f9fa;
    --bg-muted: #f1f3f5;
    --border: #e9ecef;
    --border-light: #f1f3f5;
    --text: #212529;
    --text-secondary: #868e96;
    --text-muted: #adb5bd;
    --accent: #228be6;
    --accent-light: #e7f5ff;
    --user-bg: #212529;
    --user-text: #ffffff;
    --ai-bg: #f8f9fa;
    --radius: 12px;
    --radius-sm: 8px;
    --radius-full: 9999px;
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
    --shadow: 0 2px 8px rgba(0,0,0,0.06);
    --transition: 0.15s ease;
  }

  .shell {
    display: flex;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    background: #0f0f11;
    background-image:
      radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.15), transparent),
      radial-gradient(ellipse 60% 40% at 80% 100%, rgba(34, 139, 230, 0.08), transparent),
      radial-gradient(ellipse 40% 30% at 10% 60%, rgba(139, 92, 246, 0.06), transparent);
  }

  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.3);
    z-index: 90;
    animation: fadeIn 0.15s ease;
  }

  /* Sidebar */
  .sidebar {
    width: 260px;
    background: rgba(255,255,255,0.03);
    border-right: 1px solid rgba(255,255,255,0.06);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    transition: transform 0.2s ease, opacity 0.2s ease;
    backdrop-filter: blur(12px);
  }

  .sidebar:not(.open) {
    width: 0;
    overflow: hidden;
    border: none;
  }

  .sidebar-top {
    padding: 14px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .logo-mark {
    width: 26px;
    height: 26px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    border-radius: 6px;
    display: grid;
    place-items: center;
    font-size: 12px;
    font-weight: 700;
  }

  .logo-text {
    font-size: 14px;
    font-weight: 700;
    color: #f1f3f5;
    letter-spacing: -0.3px;
  }

  .btn-icon {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    background: none;
    border: none;
    color: #868e96;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition);
  }

  .btn-icon:hover {
    background: rgba(255,255,255,0.08);
    color: #f1f3f5;
  }

  .btn-new {
    margin: 4px 12px 12px;
    padding: 9px 14px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: var(--radius-sm);
    font-size: 13px;
    color: #dee2e6;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
    transition: all var(--transition);
  }

  .btn-new:hover {
    background: rgba(255,255,255,0.08);
    border-color: rgba(255,255,255,0.15);
  }

  .history {
    flex: 1;
    overflow-y: auto;
    padding: 0 8px;
  }

  .history-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background var(--transition);
    position: relative;
  }

  .history-item:hover {
    background: rgba(255,255,255,0.06);
  }

  .history-item.active {
    background: rgba(99, 102, 241, 0.12);
  }

  .history-icon {
    flex-shrink: 0;
    color: #495057;
  }

  .history-content {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .history-text {
    font-size: 13px;
    color: #dee2e6;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }

  .history-time {
    font-size: 11px;
    color: #495057;
    flex-shrink: 0;
  }

  .btn-delete {
    position: absolute;
    right: 8px;
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    background: none;
    border: none;
    color: #495057;
    border-radius: 4px;
    cursor: pointer;
    opacity: 0;
    transition: all var(--transition);
  }

  .history-item:hover .btn-delete {
    opacity: 1;
  }

  .btn-delete:hover {
    color: #ff6b6b;
    background: rgba(255,107,107,0.1);
  }

  .sidebar-footer {
    padding: 12px 16px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }

  .powered {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #495057;
  }

  /* Main Chat */
  .chat {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    margin: 12px 12px 12px 0;
    background: rgba(255,255,255,0.97);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.05);
  }

  .topbar {
    height: 52px;
    padding: 0 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid var(--border-light);
    flex-shrink: 0;
    background: rgba(255,255,255,0.8);
    backdrop-filter: blur(8px);
  }

  .menu-toggle {
    width: 32px;
    height: 32px;
  }

  .agent-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .agent-dot {
    width: 8px;
    height: 8px;
    background: #40c057;
    border-radius: 50%;
    box-shadow: 0 0 6px rgba(64,192,87,0.4);
  }

  .agent-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }

  /* Messages */
  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 24px 20px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: linear-gradient(180deg, #fafbfc 0%, #ffffff 100%);
  }

  .empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 48px 24px;
    max-width: 400px;
    margin: 0 auto;
  }

  .empty-icon {
    width: 56px;
    height: 56px;
    background: var(--bg-muted);
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: var(--text-muted);
    margin-bottom: 16px;
  }

  .empty-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text);
    margin: 0 0 6px;
  }

  .empty-desc {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0 0 24px;
    line-height: 1.5;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
  }

  .chip {
    padding: 7px 14px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    font-size: 13px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all var(--transition);
  }

  .chip:hover {
    border-color: #6366f1;
    color: #6366f1;
    background: #eef2ff;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(99,102,241,0.12);
  }

  /* Message bubbles */
  .msg {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    max-width: 72%;
    animation: slideUp 0.2s ease;
    margin-bottom: 2px;
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .msg.user {
    align-self: flex-end;
    flex-direction: row-reverse;
    margin-top: 12px;
  }

  .msg.ai {
    align-self: flex-start;
    margin-top: 2px;
  }

  .msg.ai + .msg.user,
  .msg.user + .msg.ai {
    margin-top: 16px;
  }

  .msg-avatar {
    width: 24px;
    height: 24px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: white;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .msg-content {
    min-width: 0;
  }

  .msg-text {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
    padding: 10px 14px;
    border-radius: 18px;
  }

  .msg.user .msg-text {
    background: linear-gradient(135deg, #1a1a2e, #16213e);
    color: var(--user-text);
    border-bottom-right-radius: 4px;
  }

  .msg.ai .msg-text {
    background: var(--ai-bg);
    color: var(--text);
    border-bottom-left-radius: 4px;
  }

  .thinking {
    padding: 12px 16px;
    display: flex;
    gap: 4px;
    background: var(--ai-bg);
    border-radius: 18px;
    border-bottom-left-radius: 4px;
  }

  .thinking span {
    width: 6px;
    height: 6px;
    background: var(--text-muted);
    border-radius: 50%;
    animation: pulse 1.2s infinite ease-in-out;
  }

  .thinking span:nth-child(2) { animation-delay: 0.15s; }
  .thinking span:nth-child(3) { animation-delay: 0.3s; }

  @keyframes pulse {
    0%, 80%, 100% { transform: scale(0.8); opacity: 0.4; }
    40% { transform: scale(1.1); opacity: 1; }
  }

  /* Composer */
  .composer {
    padding: 12px 16px 16px;
    flex-shrink: 0;
  }

  .composer-box {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 6px 6px 6px 16px;
    transition: all var(--transition);
  }

  .composer-box:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(34, 139, 230, 0.08);
    background: var(--bg);
  }

  .composer-box textarea {
    flex: 1;
    border: none;
    background: none;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text);
    resize: none;
    outline: none;
    padding: 6px 0;
    font-family: inherit;
    max-height: 120px;
  }

  .composer-box textarea::placeholder {
    color: var(--text-muted);
  }

  .composer-box textarea:disabled {
    opacity: 0.5;
  }

  .btn-send {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border: none;
    border-radius: 50%;
    color: white;
    cursor: pointer;
    flex-shrink: 0;
    transition: all var(--transition);
  }

  .btn-send:hover:not(:disabled) {
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    transform: scale(1.08);
    box-shadow: 0 2px 12px rgba(99,102,241,0.3);
  }

  .btn-send:disabled {
    opacity: 0.2;
    cursor: not-allowed;
  }

  /* Scrollbar */
  .messages::-webkit-scrollbar,
  .history::-webkit-scrollbar {
    width: 4px;
  }
  .messages::-webkit-scrollbar-thumb,
  .history::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 2px;
  }

  /* Mobile */
  @media (max-width: 768px) {
    .shell {
      background: #0f0f11;
    }
    .chat {
      margin: 0;
      border-radius: 0;
    }
    .sidebar {
      position: fixed;
      left: 0;
      top: 0;
      height: 100vh;
      z-index: 100;
      background: rgba(15,15,17,0.98);
      backdrop-filter: blur(16px);
      box-shadow: 4px 0 24px rgba(0,0,0,0.4);
      transform: translateX(-100%);
    }
    .sidebar.open {
      transform: translateX(0);
      width: 280px;
    }
    .msg {
      max-width: 88%;
    }
  }
</style>
