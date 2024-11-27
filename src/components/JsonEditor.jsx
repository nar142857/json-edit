/**
 * 导入所需的React和其他依赖
 */
import React, { Component } from 'react'
import * as monaco from 'monaco-editor'
import { 
  Button, 
  Tooltip, 
  Divider,
  ThemeProvider,
  createTheme,
  StyledEngineProvider,
  IconButton,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon
} from '@mui/material'
import {
  FormatAlignLeft as FormatIcon,
  UnfoldMore as ExpandIcon,
  UnfoldLess as CollapseIcon,
  Delete as StripCommentsIcon,
  Compress as CompressIcon,
  Code as EscapeIcon,
  Description as XmlIcon,
  Code as TypeScriptIcon,
  Label as LabelIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  History as HistoryIcon
} from '@mui/icons-material'
import { JsonService, FileService, EditorStateService } from '../services'
import MessageSnackbar from './MessageSnackbar'
import './JsonEditor.css'

// 创建暗色主题
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9'
    }
  }
})

// 创建亮色主题
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2'
    }
  }
})

/**
 * JSON编辑器组件
 * 提供JSON格式化、压缩、展开/折叠等功能
 */
class JsonEditor extends Component {
  /**
   * 构造函数
   * @param {object} props - 组件属性
   */
  constructor(props) {
    super(props)
    
    // 初始化状态
    this.state = {
      // 主题状态,根据系统主题自动切换
      theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      // 占位符状态
      placeholder: '',
      // JS过滤器内容
      jsFilter: '',
      // 消息提示数据
      messageData: null,
      showLabelInput: false,
      label: '',
      fileMenuAnchor: null,
      jsonFiles: [],
      historyMenuAnchor: null,
      history: [],
      lastSavedContent: '', // 添加最后保存的内容状态
      isEditorReady: false // 添加编辑器准备状态
    }

    // 编辑器实例
    this.inputEditor = null  // 输入编辑器
    this.outputEditor = null // 输出编辑器
    
    // 存储输入的JSON对象
    this.inputContentObject = null
    
    // JS过滤器延时处理定时器
    this.jsFilterInputDelayTimer = null
    this.autoSaveTimer = null
    this.needsSave = false
  }

  /**
   * 初始化编辑器
   */
  initializeEditor = () => {
    if (!this.inputEditor) return

    // 监听编辑器内容变化
    this.inputEditor.onDidChangeModelContent(() => {
      this.handleEditorContentChange()
    })

    // 启动自动保存
    this.startAutoSave()

    // 监听窗口关闭事件
    window.addEventListener('beforeunload', this.handleBeforeUnload)

    this.setState({ isEditorReady: true })
  }

  componentDidMount() {
    // 创建输入编辑器
    this.inputEditor = monaco.editor.create(document.getElementById('inputEditor'), {
      value: '',
      language: 'json',
      theme: this.state.theme === 'dark' ? 'vs-dark' : 'vs',
      formatOnPaste: true,
      formatOnType: true,
      automaticLayout: true,
      minimap: { enabled: false },
      contextmenu: true,
      scrollBeyondLastLine: false,
      folding: true,
      foldingStrategy: 'auto',
      foldingHighlight: true,
      foldingImportsByDefault: true,
      unfoldOnClickAfterEndOfLine: true,
      showFoldingControls: 'always',
      links: false,
      lineNumbers: 'on',
      renderValidationDecorations: 'on',
      wordWrap: 'on',
      fontSize: 14,
      tabSize: 2
    })

    // 创建输出编辑器
    this.outputEditor = monaco.editor.create(document.getElementById('outputEditor'), {
      value: '',
      language: 'json',
      theme: this.state.theme === 'dark' ? 'vs-dark' : 'vs',
      readOnly: true,
      automaticLayout: true,
      minimap: { enabled: false },
      contextmenu: true,
      scrollBeyondLastLine: false,
      folding: true,
      foldingStrategy: 'auto',
      foldingHighlight: true,
      foldingImportsByDefault: true,
      unfoldOnClickAfterEndOfLine: true,
      showFoldingControls: 'always',
      links: false,
      lineNumbers: 'on',
      renderValidationDecorations: 'on',
      wordWrap: 'on',
      fontSize: 14,
      tabSize: 2
    })

    // 初始化编辑器
    this.initializeEditor()

    // 监听主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const newTheme = e.matches ? 'dark' : 'light'
      this.setState({ theme: newTheme })
      this.updateEditorTheme(newTheme)
    })

    // 监听粘贴事件
    this.listenPaste()

    // 监听插件进入
    this.listenPluginEnter()

    // 监听键盘快捷键
    window.addEventListener('keydown', this.handleKeyDown, true)
  }

  componentWillUnmount() {
    // 清理定时器和事件监听
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
    }
    window.removeEventListener('beforeunload', this.handleBeforeUnload)

    // 销毁编辑器实例
    if (this.inputEditor) {
      this.inputEditor.dispose()
    }
    if (this.outputEditor) {
      this.outputEditor.dispose()
    }

    window.removeEventListener('keydown', this.handleKeyDown, true)
  }

  /**
   * 加载编辑器状态
   */
  loadEditorState = () => {
    try {
      if (!this.inputEditor) return

      const { currentContent, currentLabel } = window.fs.getEditorHistory()
      if (currentContent) {
        this.inputEditor.setValue(currentContent)
        this.setState({ lastSavedContent: currentContent })
      }
      if (currentLabel) {
        this.setState({ label: currentLabel })
      }
    } catch (e) {
      console.error('加载编辑器状态失败:', e)
    }
  }

  /**
   * 启动自动保存
   */
  startAutoSave = () => {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
    }
    this.autoSaveTimer = setInterval(() => {
      if (this.state.isEditorReady) {
        this.saveEditorState()
      }
    }, 30000)
  }

  /**
   * 保存编辑器状态
   */
  saveEditorState = () => {
    try {
      // 只有当内容需要保存时才进行保存
      if (this.needsSave) {
        const content = this.inputEditor.getValue().trim()
        if (content) {
          EditorStateService.saveEditorState(content, this.state.label)
          this.setState({ lastSavedContent: content })
          this.needsSave = false
        }
      }
    } catch (e) {
      console.error('保存编辑器状态失败:', e)
    }
  }

  /**
   * 处理窗口关闭前的保存
   */
  handleBeforeUnload = () => {
    if (this.needsSave) {
      this.saveEditorState()
    }
  }

  /**
   * 加载历史记录
   */
  loadHistory = () => {
    try {
      const { history } = EditorStateService.getEditorHistory()
      this.setState({ history })
    } catch (e) {
      console.error('加载历史记录失败:', e)
      this.setState({ 
        messageData: { 
          type: 'error', 
          message: '加载历史记录失败: ' + e.message 
        } 
      })
    }
  }

  /**
   * 处理历史菜单点击
   */
  handleHistoryMenuClick = (event) => {
    this.setState({ historyMenuAnchor: event.currentTarget })
    this.loadHistory()
  }

  /**
   * 处理历史菜单关闭
   */
  handleHistoryMenuClose = () => {
    this.setState({ historyMenuAnchor: null })
  }

  /**
   * 处理历史记录选择
   */
  handleHistorySelect = (item) => {
    this.inputEditor.setValue(item.content)
    this.setState({ 
      historyMenuAnchor: null,
      label: item.label,
      showLabelInput: true,
      lastSavedContent: item.content,
      messageData: { type: 'success', message: '历史记录加载成功' }
    })
    this.needsSave = false
  }

  /**
   * 处理输入编辑器内容变化
   * 主要功能：
   * 1. 监听编辑器内容变化
   * 2. 根据内容是否为空控制 placeholder 的显示/隐藏
   * 3. 尝解析 JSON 内容
   * 4. 如果存在 JS 过滤器则更新输出
   */
  handleEditorContentChange = () => {
    try {
      const currentContent = this.inputEditor.getValue()
      
      // 更新输出编辑器
      if (this.state.jsFilter) {
        this.updateOutputWithFilter(currentContent)
      } else {
        this.outputEditor.setValue(currentContent)
      }

      // 标记需要保存
      if (currentContent.trim() && currentContent !== this.state.lastSavedContent) {
        this.needsSave = true
      }
    } catch (e) {
      console.error('处理编辑器内容变化失败:', e)
    }
  }

  /**
   * 处理JS过滤器输入变化
   * @param {Event} e - 输入事件对象
   */
  handleJsFilterInputChange = e => {
    const filter = e.target.value
    this.setState({ jsFilter: filter })

    if (!filter) return

    // 使用延时器防抖处理
    if (this.jsFilterInputDelayTimer) {
      clearTimeout(this.jsFilterInputDelayTimer)
    }
    
    this.jsFilterInputDelayTimer = setTimeout(() => {
      this.jsFilterInputDelayTimer = null
      
      if (!this.inputContentObject) {
        this.jsFilterOutput()
        return
      }

      if (this.inputContentObject instanceof Error) return

      if (this.outputEditor) {
        this.outputEditor.setValue(
          JsonService.evalJsInContext(filter, this.inputContentObject)
        )
      } else {
        this.jsFilterOutput()
      }
    }, 50)
  }

  /**
   * 处理快捷键事件
   * @param {KeyboardEvent} e - 键盘事件对象
   */
  keyDownAction = e => {
    // 禁用F1帮助
    if (e.code === 'F1') {
      e.stopPropagation()
      e.preventDefault()
      return
    }

    // Command/Ctrl + S 触发保存功能
    if ((e.metaKey || e.ctrlKey) && e.code === 'KeyS') {
      e.stopPropagation()
      e.preventDefault()
      this.handleSaveFile()
      return
    }

    // Command/Ctrl + T 触发标签功能
    if ((e.metaKey || e.ctrlKey) && e.code === 'KeyT') {
      e.stopPropagation()
      e.preventDefault()
      this.handleLabelClick()
      return
    }

    // 只处理Alt组合键
    if (!e.altKey) return
    
    e.stopPropagation()
    e.preventDefault()

    // 处理不同的快捷键组合
    switch (e.code) {
      case 'KeyF':  // Alt + F: 重新格式化
        this.handleReFormat()
        break
      case 'KeyC':  // Alt + C: 压缩复制
        this.handleCompressCopy()
        break
      case 'Backslash':  // Alt + \: 压缩引号复制
        this.handleCompressQuoteCopy()
        break
      case 'Period':  // Alt + .: 展开/折叠
        e.shiftKey ? this.handleExpandAll() : this.handleCollapseAll()
        break
    }
  }

  /**
   * 设置编辑器格式化的值
   * @param {string} value - 要格式化的字符串
   */
  setEditorFormatValue = (value) => {
    try {
      // 尝试直接解析整个字符串是否为 JSON
      try {
        const jsonObj = JSON.parse(value)
        this.inputEditor.setValue(JSON.stringify(jsonObj, null, 2))
        this.setState({ placeholder: false })
        return
      } catch (e) {
        // 不是完整的 JSON，续下面的处理
      }

      // 匹配所有可能的 JSON 内容
      // 1. body: {...} 格式
      // 2. headers: {...} 格式
      // 3. 独立的 {...} 或 [...] 格式
      const jsonRegex = /(?:body|headers):\s*({[\s\S]*?}|\[[\s\S]*?\])(?=\s*(?:\w+:|\s*$))|({[\s\S]*?}|\[[\s\S]*?\])(?=\s*(?:\w+:|\s*$))/g
      let lastIndex = 0
      let result = ''
      
      // 查找所有可能的 JSON 部分
      let match
      while ((match = jsonRegex.exec(value)) !== null) {
        try {
          // 获取完整匹配和捕获组
          const fullMatch = match[0]
          const prefix = fullMatch.includes(':') ? fullMatch.split(':')[0] + ': ' : ''
          const jsonStr = match[1] || match[2] // 第一个捕获组是带前缀的，第二个是独立的JSON
          
          // 尝试解析并格式化 JSON
          const formattedJson = JSON.stringify(JSON.parse(jsonStr), null, 2)
          
          // 添加 JSON 之前的普通文本
          result += value.slice(lastIndex, match.index)
          // 添加前缀（如果有）和格式化后的 JSON
          result += prefix + formattedJson
          
          lastIndex = match.index + fullMatch.length
        } catch (e) {
          // 如果解析失败，保持原样
          result += value.slice(lastIndex, match.index + match[0].length)
          lastIndex = match.index + match[0].length
        }
      }
      
      // 添加最后一部分普通文本
      result += value.slice(lastIndex)
      
      this.inputEditor.setValue(result)
      this.setState({ placeholder: false })
    } catch (e) {
      // 如果出现错误，直接显示原始内容
      console.error('格式化错误:', e)
      this.inputEditor.setValue(value)
      this.setState({ placeholder: false })
    }
  }

  /**
   * 执行JS过滤器并输出结果
   */
  jsFilterOutput = () => {
    if (!this.inputContentObject || this.inputContentObject instanceof Error) {
      this.setState({ messageData: { type: 'error', message: 'Invalid JSON content' } })
      return
    }

    try {
      const result = JsonService.evalJsInContext(this.state.jsFilter, this.inputContentObject)
      this.outputEditor.setValue(result)
    } catch (e) {
      this.setState({ messageData: { type: 'error', message: 'JS filter error' } })
    }
  }

  /**
   * 重新格式化
   */
  handleReFormat = () => {
    try {
      const value = this.inputEditor.getValue()
      
      // 尝试直接解析整个字符串是否为 JSON
      try {
        const jsonObj = JSON.parse(value)
        this.inputEditor.setValue(JSON.stringify(jsonObj, null, 2))
        return
      } catch (e) {
        // 不是完整的 JSON，继续下面的处理
      }

      // 匹配所有可能的 JSON 内容
      // 1. body: {...} 格式
      // 2. headers: {...} 格式
      // 3. 独立的 {...} 或 [...] 格式
      const jsonRegex = /(?:body|headers):\s*({[\s\S]*?}|\[[\s\S]*?\])(?=\s*(?:\w+:|\s*$))|({[\s\S]*?}|\[[\s\S]*?\])(?=\s*(?:\w+:|\s*$))/g
      let lastIndex = 0
      let result = ''
      
      // 查找所有可能的 JSON 部分
      let match
      while ((match = jsonRegex.exec(value)) !== null) {
        try {
          // 获取完整匹配和捕获组
          const fullMatch = match[0]
          const prefix = fullMatch.includes(':') ? fullMatch.split(':')[0] + ': ' : ''
          const jsonStr = match[1] || match[2] // 第一个捕获组是带前缀的，第二个是独立的JSON
          
          // 尝试解析并格式化 JSON
          const formattedJson = JSON.stringify(JSON.parse(jsonStr), null, 2)
          
          // 添加 JSON 之前的普通文本
          result += value.slice(lastIndex, match.index)
          // 添加前缀（如果有）和格式化后的 JSON
          result += prefix + formattedJson
          
          lastIndex = match.index + fullMatch.length
        } catch (e) {
          // 如果解析失败，保持原样
          result += value.slice(lastIndex, match.index + match[0].length)
          lastIndex = match.index + match[0].length
        }
      }
      
      // 添加最后一部分普通文本
      result += value.slice(lastIndex)
      
      this.inputEditor.setValue(result)
    } catch (e) {
      this.setState({ messageData: { type: 'error', message: '格式化失败' } })
    }
  }

  /**
   * 全部展开
   */
  handleExpandAll = () => {
    try {
      const editor = this.state.jsFilter ? this.outputEditor : this.inputEditor
      if (!editor) return

      // 使用编辑器内置命令
      editor.trigger('fold', 'editor.unfoldAll', null)
      editor.focus()
    } catch (e) {
      console.error('开失败:', e)
      this.setState({ messageData: { type: 'error', message: '展开失败' } })
    }
  }

  /**
   * 全部折叠
   */
  handleCollapseAll = () => {
    try {
      const editor = this.state.jsFilter ? this.outputEditor : this.inputEditor
      if (!editor) return

      // 使用编辑器内置命令
      editor.trigger('fold', 'editor.foldAll', null)
      editor.focus()
    } catch (e) {
      console.error('折叠失败:', e)
      this.setState({ messageData: { type: 'error', message: '折叠失败' } })
    }
  }

  /**
   * 压缩复制
   */
  handleCompressCopy = () => {
    try {
      const value = this.inputEditor.getValue()
      const compressed = JSON.stringify(JSON.parse(value))
      window.utools.copyText(compressed)
      this.setState({ messageData: { type: 'success', message: 'Copied' } })
    } catch (e) {
      this.setState({ messageData: { type: 'error', message: 'Invalid JSON format' } })
    }
  }

  /**
   * 压缩引号复制
   */
  handleCompressQuoteCopy = () => {
    try {
      const value = this.inputEditor.getValue()
      const compressed = JSON.stringify(JSON.parse(value)).replace(/"/g, '\\"')
      window.utools.copyText(compressed)
      this.setState({ messageData: { type: 'success', message: 'Copied' } })
    } catch (e) {
      this.setState({ messageData: { type: 'error', message: 'Invalid JSON format' } })
    }
  }

  /**
   * 处理标签按钮点击
   */
  handleLabelClick = () => {
    this.setState(prevState => ({
      showLabelInput: !prevState.showLabelInput
    }))
  }

  /**
   * 处理标签输入变化
   */
  handleLabelChange = (e) => {
    this.setState({ label: e.target.value })
  }

  /**
   * 处理关闭标签输入框
   */
  handleCloseLabelInput = () => {
    this.setState({ showLabelInput: false })
  }

  /**
   * 生成本地时间戳
   */
  getLocalTimestamp = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}-${minutes}-${seconds}`
  }

  /**
   * 处理保存文件
   */
  handleSaveFile = async () => {
    try {
      const content = this.inputEditor.getValue()
      if (!content.trim()) {
        this.setState({ 
          messageData: { 
            type: 'warning', 
            message: '内容为空，无保存' 
          } 
        })
        return
      }

      const timestamp = this.getLocalTimestamp()
      const fileName = `${this.state.label || 'json'}_${timestamp}.json`
      
      // 使用 uTools API 保存文件
      const filePath = window.utools.showSaveDialog({
        title: '保存 JSON 文件',
        defaultPath: fileName,
        filters: [
          { name: 'JSON', extensions: ['json'] }
        ]
      })

      if (!filePath) {
        // 用户取消了保存
        return
      }

      let contentToSave
      try {
        // 尝试格式化 JSON
        contentToSave = JSON.stringify(JSON.parse(content), null, 2)
      } catch (e) {
        // 如果不是有效的 JSON，保存原始内容
        contentToSave = content
      }

      // 使用 window.services 保存文件
      await window.services.writeFile(filePath, contentToSave)
      this.setState({ 
        messageData: { 
          type: 'success', 
          message: '文件保存成功' 
        } 
      })
    } catch (e) {
      console.error('保存文件失败:', e)
      this.setState({ 
        messageData: { 
          type: 'error', 
          message: '保存文件失败: ' + e.message 
        } 
      })
    }
  }

  /**
   * 加载文件列表
   */
  loadJsonFiles = async () => {
    try {
      const files = await window.fs.getJsonFiles()
      this.setState({ jsonFiles: files })
    } catch (e) {
      console.error('加载文件列表失败:', e)
      this.setState({ 
        messageData: { 
          type: 'error', 
          message: '加载文件列表失败: ' + e.message 
        } 
      })
    }
  }

  /**
   * 处理文件菜单点击
   */
  handleFileMenuClick = (event) => {
    this.setState({ fileMenuAnchor: event.currentTarget })
    this.loadJsonFiles()
  }

  /**
   * 处理文件菜单关闭
   */
  handleFileMenuClose = () => {
    this.setState({ fileMenuAnchor: null })
  }

  /**
   * 处理文件选择
   */
  handleFileSelect = async (filePath) => {
    try {
      const content = await window.services.readFile(filePath)
      this.inputEditor.setValue(content)

      // 从文件路径中提取文件名，去掉时间戳和扩展名
      const fileName = filePath.split('/').pop()
        .replace(/\.json$/, '') // 去掉扩展名
        .replace(/_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/, '') // 去掉时间戳

      this.setState({ 
        fileMenuAnchor: null,
        messageData: { type: 'success', message: '文件加载成功' },
        label: fileName,
        showLabelInput: true
      })
    } catch (e) {
      console.error('读取文件失败:', e)
      this.setState({ 
        messageData: { 
          type: 'error', 
          message: '读取文件失败: ' + e.message 
        } 
      })
    }
  }

  /**
   * 监听粘贴事件
   */
  listenPaste = () => {
    document.querySelector('#inputEditor').addEventListener('paste', e => {
      const text = e.clipboardData.getData('text')
      if (!text) return

      // 编辑器为空时的处理
      if (!this.inputEditor.getValue()) {
        e.stopPropagation()
        e.preventDefault()
        this.inputEditor.setValue(text)
        // 使用 requestAnimationFrame 确保在下一帧执行格式化
        requestAnimationFrame(() => this.handleReFormat())
        return
      }

      // 检查是否全选状态
      const selection = this.inputEditor.getSelection()
      if (
        selection.startLineNumber === 1 && 
        selection.startColumn === 1 &&
        (
          selection.startLineNumber !== selection.endLineNumber ||
          selection.startColumn !== selection.endColumn
        )
      ) {
        const model = this.inputEditor.getModel()
        const lastLine = model.getLineCount()
        const lastColumn = model.getLineContent(lastLine).length + 1
        
        // 全选态下的粘贴处理
        if (
          selection.endLineNumber === lastLine && 
          selection.endColumn === lastColumn
        ) {
          e.stopPropagation()
          e.preventDefault() 
          this.inputEditor.setValue(text)
          // 使用 requestAnimationFrame 确保在下一帧执行格式化
          requestAnimationFrame(() => this.handleReFormat())
        }
      }
    }, true)
  }

  /**
   * 监听插件进入事件
   */
  listenPluginEnter = () => {
    window.utools.onPluginEnter(({ type, payload }) => {
      if (type === 'regex') {
        this.setState({ placeholder: false, jsFilter: '' })
        this.inputContentObject = null
        this.setEditorFormatValue(payload)
      } else if (type === 'files') {
        this.setState({ placeholder: false, jsFilter: '' })
        this.inputContentObject = null
        this.setEditorFormatValue(window.services.readFileContent(payload[0].path))
      } else {
        const hasContent = this.inputEditor && this.inputEditor.getValue()
        this.setState({ placeholder: !hasContent })
      }
      this.inputEditor.focus()
    })
  }

  /**
   * 处理键盘快捷键
   */
  handleKeyDown = (e) => {
    // 获取操作系统信息
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0

    // Ctrl/Command + S: 保存文件
    if ((isMac ? e.metaKey : e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      this.handleSaveFile()
      return
    }

    // Ctrl/Command + T: 切换标签输入框显示状态
    if ((isMac ? e.metaKey : e.ctrlKey) && e.key === 't') {
      e.preventDefault()
      this.setState(prevState => ({ showLabelInput: !prevState.showLabelInput }))
      return
    }

    // Alt + F: 格式化
    if (e.altKey && e.key === 'f') {
      e.preventDefault()
      this.handleReFormat()
      return
    }

    // Alt + C: 压缩
    if (e.altKey && e.key === 'c') {
      e.preventDefault()
      this.handleCompress()
      return
    }

    // Alt + X: 转义
    if (e.altKey && e.key === 'x') {
      e.preventDefault()
      this.handleEscape()
      return
    }

    // Alt + U: 反转义
    if (e.altKey && e.key === 'u') {
      e.preventDefault()
      this.handleUnescape()
      return
    }

    // Alt + S: 去除注释
    if (e.altKey && e.key === 's') {
      e.preventDefault()
      this.handleStripComments()
      return
    }

    // Alt + E: 展开所有
    if (e.altKey && e.key === 'e') {
      e.preventDefault()
      this.handleExpand()
      return
    }

    // Alt + W: 折叠所有
    if (e.altKey && e.key === 'w') {
      e.preventDefault()
      this.handleCollapse()
      return
    }

    // Alt + T: 转为 TypeScript
    if (e.altKey && e.key === 't') {
      e.preventDefault()
      this.handleToTypeScript()
      return
    }

    // Alt + M: 转为 XML
    if (e.altKey && e.key === 'm') {
      e.preventDefault()
      this.handleToXml()
      return
    }
  }

  /**
   * 处理标签输入框关闭
   */
  handleLabelClose = () => {
    this.setState({ showLabelInput: false })
  }

  /**
   * 处理标签输入
   */
  handleLabelChange = (e) => {
    this.setState({ label: e.target.value })
  }

  /**
   * 处理标签输入框按键
   */
  handleLabelKeyDown = (e) => {
    // 按 Enter 或 Escape 关闭标签输入框
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault()
      this.setState({ showLabelInput: false })
    }
  }

  /**
   * 渲染组件
   * @returns {JSX.Element} 渲染的React组件
   */
  render() {
    const { 
      theme, jsFilter, placeholder, messageData, showLabelInput, label, 
      fileMenuAnchor, jsonFiles, historyMenuAnchor, history 
    } = this.state
    const currentTheme = theme === 'dark' ? darkTheme : lightTheme

    return (
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={currentTheme}>
          <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
            <div className="content">
              {showLabelInput && (
                <div className="label-input">
                  <input
                    value={label}
                    onChange={this.handleLabelChange}
                    placeholder="输入标签描述..."
                    type="text"
                  />
                  <IconButton size="small" onClick={this.handleCloseLabelInput}>
                    <CloseIcon />
                  </IconButton>
                </div>
              )}
              <div className="editor-container">
                <div 
                  id="inputEditor"
                  style={{ width: jsFilter ? '50%' : '100%' }}
                />
                <div
                  id="outputEditor"
                  style={{ 
                    width: jsFilter ? '50%' : '0',
                    display: jsFilter ? 'block' : 'none'
                  }}
                />
              </div>
            </div>

            {placeholder && (
              <div className="placeholder">
                URL Params、XML、YAML 粘贴自动转为 JSON
              </div>
            )}

            <div className="footer">
              <div className="left">this</div>
              
              <div className="right">
                <input
                  onChange={this.handleJsFilterInputChange}
                  placeholder=' JS 过滤; 示例 ".key.subkey"、"[0][1]"、".map(x=>x.val)"'
                  value={jsFilter}
                  type="text"
                />
              </div>

              <div className="handle">
                <Tooltip title="文件列表" placement="top">
                  <Button onClick={this.handleFileMenuClick} size="small">
                    <FolderIcon />
                  </Button>
                </Tooltip>

                <Menu
                  anchorEl={fileMenuAnchor}
                  open={Boolean(fileMenuAnchor)}
                  onClose={this.handleFileMenuClose}
                >
                  {jsonFiles.length === 0 ? (
                    <MenuItem disabled>
                      <ListItemText primary="没有保存的文件" />
                    </MenuItem>
                  ) : (
                    jsonFiles.map(file => (
                      <MenuItem key={file.path} onClick={() => this.handleFileSelect(file.path)}>
                        <ListItemIcon>
                          <FileIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={file.name} 
                          secondary={new Date(file.modifiedTime).toLocaleString()}
                        />
                      </MenuItem>
                    ))
                  )}
                </Menu>

                <Tooltip title="历史记录" placement="top">
                  <Button onClick={this.handleHistoryMenuClick} size="small">
                    <HistoryIcon />
                  </Button>
                </Tooltip>

                <Menu
                  anchorEl={historyMenuAnchor}
                  open={Boolean(historyMenuAnchor)}
                  onClose={this.handleHistoryMenuClose}
                >
                  {history.length === 0 ? (
                    <MenuItem disabled>
                      <ListItemText primary="没有历史记录" />
                    </MenuItem>
                  ) : (
                    history.map(item => (
                      <MenuItem key={item.id} onClick={() => this.handleHistorySelect(item)}>
                        <ListItemIcon>
                          <FileIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={item.label || '未命名'}
                          secondary={new Date(item.timestamp).toLocaleString()}
                        />
                      </MenuItem>
                    ))
                  )}
                </Menu>

                <Tooltip title="重新格式化「Alt + F」" placement="top">
                  <Button onClick={this.handleReFormat} size="small">
                    <FormatIcon />
                  </Button>
                </Tooltip>

                <Tooltip title="全部展开「Alt + . + Shift」" placement="top">
                  <Button onClick={this.handleExpandAll} size="small">
                    <ExpandIcon />
                  </Button>
                </Tooltip>

                <Tooltip title="全部折叠「Alt + .」" placement="top">
                  <Button onClick={this.handleCollapseAll} size="small">
                    <CollapseIcon />
                  </Button>
                </Tooltip>

                <Divider orientation="vertical" flexItem />

                <Tooltip title="压缩复制「Alt + C」" placement="top">
                  <Button onClick={this.handleCompressCopy} size="small">
                    <CompressIcon />
                  </Button>
                </Tooltip>

                <Tooltip title="压缩引号复制「Alt + \」" placement="top">
                  <Button onClick={this.handleCompressQuoteCopy} size="small">
                    <EscapeIcon />
                  </Button>
                </Tooltip>

                <Divider orientation="vertical" flexItem />

                <Tooltip title="添加标签「Ctrl/⌘ + T」" placement="top">
                  <Button onClick={this.handleLabelClick} size="small">
                    <LabelIcon />
                  </Button>
                </Tooltip>

                <Tooltip title="保存文件「Ctrl/⌘ + S」" placement="top">
                  <Button onClick={this.handleSaveFile} size="small">
                    <SaveIcon />
                  </Button>
                </Tooltip>
              </div>
            </div>

            <MessageSnackbar messageData={messageData} />
          </div>
        </ThemeProvider>
      </StyledEngineProvider>
    )
  }
}

export default JsonEditor 