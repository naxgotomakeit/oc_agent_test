# 间隙 Interspace · OC 平台原型

当前首页已扩展为 OC 平台：接待站、角色广场、人物档案、我的角色、创作中心和个人中心。详见 [平台验收说明](PLATFORM_REVIEW.md)。

Bruce 原有聊天保留在 `/static/bruce.html`，首页与角色档案均可进入。平台收藏和角色草稿仅保存在当前浏览器；账号、发布和支付尚未接入。

这个项目把 Bruce 的角色设定、聊天网页和 FastAPI 后端连在一起。网页与后端由同一个 Python 服务运行；浏览器不直接接触 Anthropic API Key。

## 当前基线

- 聊天调用 Claude Haiku，回复逐段显示。
- 最近 20 条消息作为对话上下文；页面刷新后，对话仍保存在该浏览器。
- 输入 `记住：我喜欢喝茶` 可保存一条明确记忆；后续聊天会带上这些记忆。
- 记忆和聊天可在页面查看、清除。
- 设置 `TEAM_ACCESS_CODE` 后，网页和聊天 API 都要求输入团队访问码。访问会话 12 小时后过期。
- 每个成员在自己的浏览器中保存自己的聊天和记忆；这些记录不会上传到后端或同步给其他成员。

## 本地启动

在终端进入项目文件夹，然后执行：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp -n .env.example .env
```

用文本编辑器打开根目录的 `.env`，填入 `ANTHROPIC_API_KEY`，保存。不要把 Key 发到聊天、写进网页文件或提交到代码仓库。模型默认是 `claude-haiku-4-5-20251001`。

启动网页：

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

浏览器访问 <http://127.0.0.1:8000>。关闭终端或按 `Ctrl+C` 会停止网站。

## 今天的团队发布方式

仓库包含 `render.yaml`，用于把当前单体网页部署到 Render。Render 免费服务适合内部试用，但空闲后会休眠，第一次打开可能需要等待启动；本版本没有服务器数据库，因此不会遇到免费实例重启造成数据库文件丢失的问题。

最简单的操作方式是把这个仓库放到一个私有 GitHub 仓库，然后在 Render 选择 **New → Blueprint** 并连接该仓库。部署时在 Render 的环境变量页面填写：

- `ANTHROPIC_API_KEY`：Anthropic Console 创建的 API Key。
- `TEAM_ACCESS_CODE`：发给团队成员的访问码。
- `SESSION_SECRET`：至少 32 个字符的随机值，可用 `python -c "import secrets; print(secrets.token_urlsafe(32))"` 生成。

请把代码仓库设为 **Private**。生产模式如果没有 `TEAM_ACCESS_CODE` 或有效的 `SESSION_SECRET`，后端会拒绝启动，避免误把无保护的聊天 API 暴露出去。

其他变量已由 `render.yaml` 提供。部署完成后 Render 会给一个 `onrender.com` 网址；把网址和访问码发给团队成员即可。API Key 只放在 Render 的服务端环境变量中，不放入网页或仓库。细节见 [Render 官方免费服务说明](https://render.com/docs/free)。

## 简易隔离的边界

当前团队访问码是所有成员共用的入口密码，不是个人账号。聊天和记忆只存于各自的浏览器，因此成员用不同设备/浏览器时数据自然分开；共用同一台设备和浏览器的人会看到同一份本地数据。清除浏览器站点数据也会一并清除这些内容。

这里的“记忆”是用户主动保存的浏览器本地笔记，不是自动提取、跨设备同步的长期记忆。若要支持个人账号、云端记忆、换设备后继续对话，再增加 PostgreSQL、独立身份和数据迁移。
