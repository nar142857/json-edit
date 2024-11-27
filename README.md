# JSON编辑器

一个功能强大的JSON编辑器uTools插件,提供JSON格式化、验证、转换等功能。

## 功能特性

- JSON格式化与验证
- 语法高亮
- 代码折叠
- 错误提示
- 智能格式转换
  - 自动识别并格式化日志中的所有 JSON 内容
  - URL参数自动转JSON
  - XML自动转JSON
  - YAML自动转JSON
- 文件导入导出
  - 支持拖拽导入 JSON 文件
  - 支持保存为本地文件，文件名自动包含标签和时间戳
- 智能占位提示 (当编辑器为空时显示功能提示，输入内容时自动隐藏)
- 标签功能 (可为编辑器内容添加描述性标签)
- 自动消失的错误提示 (3秒后自动消失)
- 固定底部工具栏 (浅灰色背景)

## 使用方法

1. JSON格式化:
   - 复制JSON文本,呼出uTools,输入"json"
   - 或直接拖拽JSON文件到输入框
   - 支持自动识别并格式化日志中的JSON内容

2. URL参数转JSON:
   - 复制URL参数字符串,呼出uTools,输入参数将自动转换

3. 日志内容格式化:
   - 支持识别并格式化日志中的 JSON 内容
   - 自动处理 body、headers 等字段中的 JSON
   - 保持非 JSON 内容的原始格式

4. 标签功能:
   - 点击底部工具栏的标签按钮或使用快捷键 Ctrl/⌘ + T
   - 在顶部输入框中输入描述性文字
   - 点击关闭按钮可隐藏标签输入框

5. 保存功能:
   - 点击底部工具栏的保存按钮或使用快捷键 Ctrl/⌘ + S
   - 自动生成文件名：标签名_时间戳.json
   - 支持选择保存位置
   - 自动格式化后保存

## 快捷键

- `Alt + F`: 重新格式化
- `Alt + C`: 压缩复制
- `Alt + \`: 压缩引号复制
- `Alt + .`: 全部折叠
- `Alt + . + Shift`: 全部展开
- `Ctrl/⌘ + T`: 显示/隐藏标签输入框
- `Ctrl/⌘ + S`: 保存文件

## 界面特性

- 固定底部工具栏
  - 浅灰色背景设计
  - 始终保持在底部
  - 包含所有常用工具按钮
- 智能输入框
  - JS过滤器输入框使用白色背景
  - 标签输入框使用白色背景
  - 深色主题下保持良好可读性
- 消息提示
  - 错误提示3秒后自动消失
  - 顶部居中显示
  - 支持手动关闭

## 开发说明

本项目使用Monaco Editor作为编辑器核心,采用Web Worker处理重任务,保证编辑器性能。

### 技术特性

- Monaco Editor集成
  - 使用Monaco Editor提供的强大编辑功能
  - 支持语法高亮和错误提示
  - 自定义主题适配
- 智能占位提示
  - 编辑器为空时自动显示功能提示
  - 输入内容时自动隐藏提示
  - 支持深色模式自适应
  - 使用CSS绝对定位实现居中显示
- 智能日志处理
  - 自动识别日志中的 JSON 内容
  - 支持多个 JSON 块同时格式化
  - 保持日志结构完整性
- UI优化
  - 固定底部工具栏
  - 自适应布局
  - 深浅色主题支持
  - 统一的输入框样式

### 技术栈

- Monaco Editor
- React
- Material-UI
- Electron
- Web Workers
- uTools API

### 项目结构说明
/
├── public/                # 静态资源目录
│   ├── index.html        # 主页面
│   └── logo.png          # 插件图标
├── plugin/               # uTools 插件目录
│   ├── dist/            # 打包输出目录
│   ├── plugin.json      # 插件配置文件
│   └── preload.js       # 预加载脚本
├── src/                 # 源代码目录
│   ├── components/      # React 组件
│   │   ├── JsonEditor.jsx     # 主编辑器组件
│   │   ├── JsonEditor.css     # 编辑器样式
│   │   ├── MessageSnackbar.jsx # 消息提示组件
│   │   └── ErrorBoundary.jsx  # 错误边界组件
│   ├── services/        # 服务层
│   │   └── JsonService.js     # JSON 处理服务
│   └── index.js         # 入口文件
├── package.json         # 项目配置文件
└── webpack.config.js    # Webpack 配置文件
