# 部署文档（DEPLOY.md）

JupyterLite 三级练习站点接入现有 Vue + Express 学习平台。

## 0. 架构与隔离原则

- 三级站点 = **纯静态文件**（`_output/`），零数据库、零 `/api` 调用、零共享 session。
- Python 由浏览器内 Pyodide (WASM) 执行，**服务器零计算负载**。
- 仅在 `/jupyter/` 子路径设置 COOP/COEP 跨域隔离头与 CSP 豁免，**绝不全局设置**，避免破坏现有 Vue 功能（AC7/AC8）。
- `base_url` / Express 挂载点 / 前端跳转 URL 三者一致为 `/jupyter/`（AC1）。

## 1. 服务器安装 Python 3.12

```bash
# Ubuntu/Debian (deadsnakes)
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt-get update
sudo apt-get install -y python3.12 python3.12-venv

# 或源码编译见 https://www.python.org/downloads/
python3.12 --version   # 验证
```

Python 3.12 装在独立 venv，不影响 Node 服务进程（AC15）。

## 2. 构建站点

```bash
# 上传两个三级 zip 到 ~/Desktop/线下实操练习/三级/  （或用 SRC_DIR 覆盖）
cd ~/学习平台/jupyterlite        # 站点目录位于学习平台项目内
bash build.sh
```

产物：`_output/`（纯静态）。重复执行幂等，不产生冲突（AC13）。

## 3. 接入 Express（程序员 B 产出）

在 `学习平台/server/src/index.js` 中：

1. **必须在 SPA fallback / `notFound` 之前**注册 `/jupyter`（T10/边界 2.3.6）。
2. 仅 `/jupyter/` 设置 COOP + COEP（AC7）。
3. 对 `/jupyter/` 跳过 / 覆盖 helmet CSP，允许 `'wasm-unsafe-eval'` 与 `cdn.jsdelivr.net`（AC9/T16）。

关键代码片段（详见 server/src/index.js 改动）：

```js
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const JUPYTER_OUTPUT = path.resolve(__dirname, '../../jupyterlite/_output')

// 1. COOP/COEP 中间件：仅 /jupyter/
app.use('/jupyter', (req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
  next()
})
// 2. helmet 对 /jupyter/ 跳过（放最上面 helmet 之前用条件中间件，或在 helmet 之后再 set）
//    简单做法：在 /jupyter 路径上覆盖 CSP
app.use('/jupyter', (req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net; "
    + "worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; "
    + "font-src 'self' data:; connect-src 'self' https://cdn.jsdelivr.net https://files.pythonhosted.org;"
  )
  next()
})
// 3. 静态托管（必须在 notFound 之前）
app.use('/jupyter', express.static(JUPYTER_OUTPUT, {
  setHeaders: (res, fpath) => {
    if (fpath.endsWith('.wasm')) res.setHeader('Content-Type', 'application/wasm')
  }
}))
```

注意：现有 `helmet` 全局挂载后会对所有响应加头；上面的 CSP `setHeader` 在 helmet 之后执行会覆盖 `/jupyter/` 的 CSP，达到豁免效果。同时根路径的 COOP 已通过 `helmet({ crossOriginOpenerPolicy: false })` 关闭，满足 AC8（根无 COOP/COEP）。

## 4. 验证（按 AC 逐项核对）

```bash
# AC7: /jupyter/ 有 COOP + COEP
curl -I http://localhost:3000/jupyter/ | grep -iE 'cross-origin'

# AC8: 根路径无 COOP/COEP
curl -I http://localhost:3000/ | grep -iE 'cross-origin'   # 应为空

# AC1: 前端跳转 / 后端挂载 / output 目录三者 = /jupyter/
grep -rn "jupyter" src/views/Home.vue server/src/index.js
```

浏览器验证（Chrome/Edge）：
- AC9/T3：打开 `/jupyter/` → `三级/实操练习1/q3_1.ipynb` → Run 顶部 cell → 1-2 分钟后见 "PyTorch 已就绪"。
- T6：q3_4.ipynb Run All 不阻塞（input 已改写为固定输入）。
- T7：q2.ipynb / q3_4.ipynb 顶部无 `micropip.install`。
- T10：浏览器直接访问 `/jupyter/lab/` 进 Jupyter，不回退到 Vue SPA。
- T11：访问首页 / 登录 / admin / 各 API 全部正常。

## 5. 前端入口（程序员 C 产出）

`src/views/Home.vue` 新增 entry-card，**不加 Vue route**（AC5）：

```html
<a href="/jupyter/" target="_blank" class="entry-card" rel="noopener">
  <span class="entry-icon">🐍</span>
  <h3>Python 练习环境</h3>
  <p>浏览器内运行 PyTorch 实操</p>
</a>
```

## 6. 100 并发压测（AC17）

```bash
ab -n 10000 -c 100 http://localhost:3000/jupyter/
# 服务器 CPU 不应飙升（纯静态）
```

## 7. 常见问题

| 现象 | 原因 | 处理 |
|---|---|---|
| `/jupyter/` 404 被 Vue 接管 | Express `/jupyter` 注册在 SPA fallback 之后 | 移到 `notFound` 之前 |
| Pyodide 控制台 CSP 报错 | helmet 阻止 WASM | 确认 `/jupyter/` CSP 覆盖含 `'wasm-unsafe-eval'` |
| torch 加载失败 | 断网 / CDN 故障 | 见首页"网络要求"提示；重试 |
| q3_4 运行卡住 | 旧产物未改写 input | 重新跑 build.sh |
| 中文乱码 | 用 unzip 解压 | 本项目用 ditto，服务器 Linux 走 fallback 也已 UTF-8 |
