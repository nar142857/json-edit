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
- 智能占位提示 (当编辑器为空时显示功能提示，输入内容时自动隐藏)

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

### 技术栈

- Monaco Editor
- Electron
- Web Workers
- uTools API

### 项目结构说明
[项目结构说明...]
/
├── index.html              # 主入口HTML
├── index.js               # 主入口JS
├── preload.js            # uTools预加载脚本
├── plugin.json           # 插件配置文件
├── src/
│   ├── workers/          # Web Worker
│   │   ├── json.worker.js     # JSON语言服务Worker
│   │   └── editor.worker.js   # 编辑器Worker
│   ├── services/         # 核心服务
│   │   ├── JsonService.js     # JSON处理服务
│   │   └── FileService.js     # 文件处理服务
│   └── components/       # UI组件
└── README.md            # 项目说明文档
