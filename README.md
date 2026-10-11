# AIF-C01 刷题 PWA

AWS Certified AI Practitioner (AIF-C01) 考试刷题移动端 PWA。

## 部署到 GitHub Pages

### 1. 创建 GitHub 仓库
```bash
# 在 pwa 文件夹中
cd pwa
git init
git add .
git commit -m "AIF-C01 exam prep PWA"
```

### 2. 推到 GitHub
```bash
# 在 GitHub 上创建一个新仓库（比如叫 aif-c01-app）
git remote add origin https://github.com/你的用户名/aif-c01-app.git
git branch -M main
git push -u origin main
```

### 3. 开启 GitHub Pages
1. 进入仓库 Settings → Pages
2. Source 选 **Deploy from a branch**
3. Branch 选 **main**，目录选 **/ (root)**
4. 点 Save

### 4. 访问
几分钟后即可通过 `https://你的用户名.github.io/aif-c01-app/` 访问。

### 5. 安装到手机桌面
- **iPhone**: Safari 打开 → 点底部分享按钮 → "添加到主屏幕"
- **Android**: Chrome 打开 → 地址栏会提示"安装应用" → 点击安装

## 功能

| 功能 | 说明 |
|---|---|
| 📋 按顺序刷题 | Q1→Q504，自动保存进度 |
| 🏷️ 按知识点刷题 | 13 个分类，每类有进度条 |
| 📖 背题模式 | 逐题浏览题干+答案+解析 |
| ✏️ 测试模式 | 互动答题，即时反馈 |
| ⚠️ 错题本 | 自动收录答错题目 |
| 🔗 匹配题 | 选择匹配 UI |
| 📋 排序题 | 拖拽排序 UI |
| 💾 离线可用 | Service Worker 缓存 |
| 📱 手机安装 | PWA 支持添加到桌面 |
| Aa 字体大小 | 5 级可调 |
| 👆 手势翻页 | 左右滑动切换题目 |

## 文件结构

```
pwa/
├── index.html          入口页
├── app.js              主逻辑 (~57KB)
├── style.css           样式 (~24KB)
├── questions-data.js   504 题数据 (~515KB)
├── manifest.json       PWA 配置
├── sw.js               Service Worker
├── icon-192.png        桌面图标 (192x192)
└── icon-512.png        桌面图标 (512x512)
```

## 题库

504 道 AIF-C01 考试题，每题包含：
- 🧠 一句话记忆点（考前速记）
- 完整解析
- 支持单选/多选/匹配/排序 4 种题型
