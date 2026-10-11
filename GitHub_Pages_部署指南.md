# 🚀 AIF-C01 刷题 PWA — GitHub Pages 部署指南

## 前置准备

- 一个 GitHub 账号（没有的话去 [github.com](https://github.com) 注册）
- 电脑上装好 Git（[下载地址](https://git-scm.com/downloads)）
- PWA 文件包（`pwa/` 文件夹，共 8 个文件）

---

## Step 1：创建 GitHub 仓库

1. 打开 [github.com/new](https://github.com/new)
2. **Repository name** 填：`aif-c01-quiz`（或你喜欢的名字）
3. 选 **Public**（GitHub Pages 免费版需要公开仓库）
4. **不要**勾选 "Add a README file"
5. 点 **Create repository**

---

## Step 2：上传文件到仓库

### 方法 A：网页上传（最简单）

1. 在刚创建的空仓库页面，点 **"uploading an existing file"** 链接
2. 把 `pwa/` 文件夹里的**所有 8 个文件**拖进去：
   ```
   index.html
   app.js
   style.css
   questions-data.js
   manifest.json
   sw.js
   icon-192.png
   icon-512.png
   ```
3. 在下方 "Commit changes" 填写 `Initial commit`
4. 点 **Commit changes**

### 方法 B：命令行（更快、适合后续更新）

```bash
# 1. 克隆仓库
git clone https://github.com/你的用户名/aif-c01-quiz.git
cd aif-c01-quiz

# 2. 把 pwa 文件夹里的所有文件复制到这里
#    Windows: 打开 pwa 文件夹，Ctrl+A 全选，复制到 aif-c01-quiz 文件夹

# 3. 提交并推送
git add .
git commit -m "Initial commit"
git push origin main
```

---

## Step 3：开启 GitHub Pages

1. 进入仓库页面 → 点顶部 **Settings** 标签
2. 左侧菜单找到 **Pages**
3. 在 "Source" 下拉框选择 **Deploy from a branch**
4. Branch 选 **main**，文件夹选 **/ (root)**
5. 点 **Save**
6. 等 1-2 分钟，页面顶部会出现：
   > Your site is live at `https://你的用户名.github.io/aif-c01-quiz/`

---

## Step 4：手机安装 PWA

### iPhone (Safari)

1. 用 Safari 打开 `https://你的用户名.github.io/aif-c01-quiz/`
2. 点底部 **分享按钮** (↑)
3. 向下滑找到 **"添加到主屏幕"**
4. 点 **添加** → 图标出现在桌面上
5. 打开后就是全屏 App 体验，可离线使用！

### Android (Chrome)

1. 用 Chrome 打开网址
2. 点右上角 **三个点** → **"安装应用"** 或 **"添加到主屏幕"**
3. 确认安装 → 桌面出现 App 图标

### 电脑 (Chrome/Edge)

1. 打开网址后地址栏右侧会出现一个 **安装图标** (⊕)
2. 点击安装 → 变成独立窗口 App

---

## Step 5：跨设备同步进度

由于不同设备的浏览器数据是分开的，我内置了 **导出/导入** 功能：

1. **设备 A**（比如电脑）：首页 → 滑到底部 → **「导出进度」** → 下载一个 JSON 文件
2. 把 JSON 文件传到**设备 B**（微信/AirDrop/邮件都行）
3. **设备 B**（比如手机）：首页 → **「导入进度」** → 选择 JSON 文件
4. 错题本、答题记录、顺序刷题进度等全部恢复 ✅

---

## 后续更新题库

如果以后题库有更新：

```bash
cd aif-c01-quiz

# 替换 questions-data.js（新版题库）
# 可选：更新 app.js（新功能）

git add .
git commit -m "Update question bank"
git push origin main
```

GitHub Pages 会自动重新部署（1-2 分钟生效）。  
手机打开 App 时会自动检测更新，提示"有新版本可用"→ 点击更新即可。

---

## 文件清单

| 文件 | 大小 | 说明 |
|---|---|---|
| `index.html` | ~3KB | 入口页 |
| `app.js` | ~56KB | 主逻辑（所有功能） |
| `style.css` | ~23KB | 样式 |
| `questions-data.js` | ~290KB | 504 题数据（含 🧠 记忆点） |
| `manifest.json` | ~0.6KB | PWA 配置 |
| `sw.js` | ~1.3KB | Service Worker（离线缓存） |
| `icon-192.png` | ~1KB | 小图标 |
| `icon-512.png` | ~3KB | 大图标 |

**总计约 380KB**，首次加载后完全可离线使用。

---

## 常见问题

**Q: 手机添加到桌面后打不开？**  
A: 确保用 Safari (iPhone) 或 Chrome (Android) 打开，不要用微信内置浏览器。

**Q: 更新后手机还是旧版本？**  
A: 关闭 App 重新打开，会弹出"有新版本可用"提示。如果还没有，等 1-2 分钟再试。

**Q: 能不能用私有仓库？**  
A: 可以，但需要 GitHub Pro（付费）才能用私有仓库的 GitHub Pages。免费方案只支持公开仓库。
