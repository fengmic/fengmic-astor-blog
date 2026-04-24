# Fengmic Blog - Astro 重构版

这是对 `fengmic-blog`（Next.js）项目的 Astro 重构版本。

## 重构目标

- 保留原项目的核心内容结构：文章、分类、相册、侧边栏信息
- 保留原有视觉方向：二次元粉色系 + 玻璃态卡片 + 背景氛围
- 将页面渲染切换为 Astro 的静态优先方案，减少客户端 JS 负担

## 已迁移能力

- 启动页：`/`（星空欢迎页，自动跳转到 `/home`）
- 博客首页：`/home`
  - 文章列表
  - 搜索过滤（标题/摘要/标签）
  - 标签过滤
  - 轮播图、日历、随机语录
- 分类页：`/category`
- 相册页：`/album`（含图片预览弹窗）
- 文章详情页：`/post/[id]`
- Markdown 文章系统：Astro Content Collections

## 项目结构

```text
src/
  components/
  content/posts/
  data/
  layouts/
  pages/
  styles/
  utils/
fengmic-blog-src/  # 原 Next.js 源项目（保留用于对照）
```

## 开发命令

```bash
npm install
npm run dev
```

构建：

```bash
npm run build
npm run preview
```

## 数据来源

以下内容从原项目直接迁移：

- `fengmic-blog-src/data/*.json` -> `src/data/*.json`
- `fengmic-blog-src/posts/*.md` -> `src/content/posts/*.md`

## 技术说明

- 框架：Astro 5
- Markdown：Astro Content Collections
- 日期格式化：date-fns
- 样式：自定义 CSS（非 Tailwind）

## 迁移取舍

- 原项目中的 Framer Motion 复杂动画未 1:1 迁移，改为 CSS + 轻量脚本方式。
- 页面交互仅在必要区块启用（搜索、筛选、轮播、日历、弹窗）。
- 现阶段保留 `fengmic-blog-src` 目录，方便逐项比对与继续迁移。
