const STORAGE_KEY = "littlemind-bruce-local-chat-v1";
const MEMORY_KEY = `${STORAGE_KEY}:saved-memories`;
const form = document.querySelector("#chat-form");
const input = document.querySelector("#message-input");
const sendButton = document.querySelector("#send-button");
const welcome = document.querySelector("#welcome");
const messagesView = document.querySelector("#messages");
const chatScroll = document.querySelector("#chat-scroll");
let history = readHistory();
let memories = readMemories();
let busy = false;

function readHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((item) => ["user", "assistant"].includes(item.role) && typeof item.content === "string") : [];
  } catch {
    return [];
  }
}

function saveHistory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function readMemories() {
  try {
    const saved = JSON.parse(localStorage.getItem(MEMORY_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((item) => item && typeof item.text === "string") : [];
  } catch {
    return [];
  }
}

function saveMemories() {
  localStorage.setItem(MEMORY_KEY, JSON.stringify(memories));
  renderMemories();
}

function renderMemories() {
  const list = document.querySelector("#memory-list");
  const count = document.querySelector("#memory-count");
  count.textContent = String(memories.length);
  list.replaceChildren();
  if (!memories.length) {
    const empty = document.createElement("p");
    empty.className = "memory-empty";
    empty.textContent = "还没有保存的记忆。聊天时说“记住：我喜欢……”就可以添加。";
    list.append(empty);
    return;
  }
  for (const [index, memory] of memories.entries()) {
    const row = document.createElement("div");
    row.className = "memory-row";
    const note = document.createElement("span");
    note.textContent = memory.text;
    const remove = document.createElement("button");
    remove.className = "memory-remove";
    remove.type = "button";
    remove.textContent = "删除";
    remove.setAttribute("aria-label", `删除记忆：${memory.text}`);
    remove.addEventListener("click", () => {
      memories.splice(index, 1);
      saveMemories();
    });
    row.append(note, remove);
    list.append(row);
  }
}

function makeMessage(role, content, pending = false) {
  const article = document.createElement("article");
  article.className = `message ${role}`;
  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = role === "assistant" ? "B" : "你";
  const body = document.createElement("div");
  body.className = "message-body";
  const name = document.createElement("div");
  name.className = "message-name";
  name.textContent = role === "assistant" ? "Bruce" : "你";
  const text = document.createElement("div");
  text.className = "message-text";
  if (pending) {
    text.classList.add("typing");
    text.setAttribute("aria-label", "Bruce 正在回复");
    for (let i = 0; i < 3; i += 1) text.append(document.createElement("i"));
  } else {
    text.textContent = content;
  }
  body.append(name, text);
  article.append(avatar, body);
  messagesView.append(article);
  chatScroll.scrollTop = chatScroll.scrollHeight;
  return text;
}

function renderHistory() {
  messagesView.replaceChildren();
  welcome.hidden = history.length > 0;
  messagesView.hidden = history.length === 0;
  for (const message of history) makeMessage(message.role, message.content);
  const firstUserMessage = history.find((message) => message.role === "user");
  document.querySelector("#conversation-title").textContent = firstUserMessage ? firstUserMessage.content.slice(0, 24) : "和 Bruce 聊聊";
}

function setBusy(value) {
  busy = value;
  sendButton.disabled = value;
  input.disabled = value;
}

async function sendMessage(value) {
  const content = value.trim();
  if (!content || busy) return;
  const rememberMatch = content.match(/^记住[：:]\s*(.+)$/s);
  if (rememberMatch) {
    const note = rememberMatch[1].trim();
    if (note.length > 500) {
      makeMessage("assistant", "这条记忆有点长，请缩短到 500 字以内再说。");
      return;
    }
    welcome.hidden = true;
    messagesView.hidden = false;
    history.push({ role: "user", content });
    makeMessage("user", content);
    if (!memories.some((memory) => memory.text === note)) {
      memories.push({ text: note, savedAt: new Date().toISOString() });
      memories = memories.slice(-30);
      saveMemories();
    }
    const acknowledgement = "好，我把这件事记在当前浏览器里了。你可以在右上角查看或删除。";
    history.push({ role: "assistant", content: acknowledgement });
    saveHistory();
    makeMessage("assistant", acknowledgement);
    input.value = "";
    input.style.height = "auto";
    return;
  }
  welcome.hidden = true;
  messagesView.hidden = false;
  history.push({ role: "user", content });
  saveHistory();
  makeMessage("user", content);
  input.value = "";
  input.style.height = "auto";
  setBusy(true);
  const answerNode = makeMessage("assistant", "", true);
  let answer = "";

  try {
    const response = await fetch("/api/v1/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history.slice(-20), memories: memories.map((memory) => memory.text) }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail || "暂时连不上后端，请稍后再试。");
    }
    if (!response.body) throw new Error("浏览器无法读取流式回复，请更新浏览器后再试。");

    answerNode.classList.remove("typing");
    answerNode.removeAttribute("aria-label");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value: chunk, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(chunk, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";
      for (const event of events) {
        const dataLine = event.split("\n").find((line) => line.startsWith("data: "));
        if (!dataLine) continue;
        const data = dataLine.slice(6);
        if (data === "[DONE]") continue;
        const item = JSON.parse(data);
        if (item.error) throw new Error(item.error);
        if (item.text) {
          answer += item.text;
          answerNode.textContent = answer;
          chatScroll.scrollTop = chatScroll.scrollHeight;
        }
      }
    }
    if (!answer) throw new Error("没有收到回复，请重试。");
    history.push({ role: "assistant", content: answer });
    saveHistory();
  } catch (error) {
    answerNode.classList.remove("typing");
    answerNode.removeAttribute("aria-label");
    answerNode.textContent = error.message || "出了点问题，请重试。";
    answerNode.classList.add("error-message");
    history.pop();
  } finally {
    setBusy(false);
    input.focus();
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(input.value);
});

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => sendMessage(button.dataset.prompt));
});

function clearChat() {
  if (busy) return;
  history = [];
  saveHistory();
  renderHistory();
  input.focus();
}

document.querySelector("#new-chat").addEventListener("click", clearChat);
document.querySelector("#clear-chat").addEventListener("click", clearChat);
document.querySelector("#memory-button").addEventListener("click", () => {
  renderMemories();
  document.querySelector("#memory-dialog").hidden = false;
});
document.querySelector("#close-memory").addEventListener("click", () => {
  document.querySelector("#memory-dialog").hidden = true;
});
document.querySelector("#memory-dialog").addEventListener("click", (event) => {
  if (event.target.id === "memory-dialog") event.currentTarget.hidden = true;
});
document.querySelector("#clear-memories").addEventListener("click", () => {
  memories = [];
  saveMemories();
});

const accessGate = document.querySelector("#access-gate");
const accessError = document.querySelector("#access-error");
const logoutButton = document.querySelector("#logout-button");

async function checkAccess() {
  try {
    const response = await fetch("/api/v1/session");
    if (!response.ok) throw new Error("访问验证服务暂时不可用，请刷新页面。");
    const status = await response.json();
    if (status.access_required) {
      logoutButton.hidden = false;
      if (!status.authenticated) accessGate.hidden = false;
    }
  } catch (error) {
    accessGate.hidden = false;
    accessError.textContent = error.message;
    document.querySelector("#access-code").disabled = true;
  }
}

document.querySelector("#access-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const field = document.querySelector("#access-code");
  accessError.textContent = "";
  try {
    const response = await fetch("/api/v1/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_code: field.value }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.detail || "无法登录，请稍后重试。");
    accessGate.hidden = true;
    logoutButton.hidden = false;
    input.focus();
  } catch (error) {
    accessError.textContent = error.message;
  }
});

logoutButton.addEventListener("click", async () => {
  await fetch("/api/v1/logout", { method: "POST" });
  accessGate.hidden = false;
  document.querySelector("#access-code").value = "";
});
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    clearChat();
  }
});

renderHistory();
renderMemories();
checkAccess();
