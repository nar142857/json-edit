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
  StyledEngineProvider
} from '@mui/material'
import {
  FormatAlignLeft as FormatIcon,
  UnfoldMore as ExpandIcon,
  UnfoldLess as CollapseIcon,
  Delete as StripCommentsIcon,
  Compress as CompressIcon,
  Code as EscapeIcon,
  Description as XmlIcon,
  Code as TypeScriptIcon
} from '@mui/icons-material'
import { JsonService, FileService } from '../services'
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
      messageData: null
    }

    // 编辑器实例
    this.inputEditor = null  // 输入编辑器
    this.outputEditor = null // 输出编辑器
    
    // 存储输入的JSON对象
    this.inputContentObject = null
    
    // JS过滤器延时处理定时器
    this.jsFilterInputDelayTimer = null
  }

  /**
   * 组件挂载后的生命周期钩子
   */
  componentDidMount() {
    // 先设置主题
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    this.setState({ theme: isDark ? 'dark' : 'light' }, () => {
      // 在主题设置完成后初始化编辑器
      this.initInputEditor()
      this.initOutputEditor()
      
      // 监听插件进入
      this.listenPluginEnter()
      
      // 监听粘贴事件
      this.listenPaste()
      
      // 监听快捷键
      window.addEventListener('keydown', this.keyDownAction, true)
      
      // 监听主题变化
      this.listenThemeChange()
    })
  }

  /**
   * 初始化输入编辑器
   */
  initInputEditor = () => {
    // 创建Monaco编辑器实例
    this.inputEditor = monaco.editor.create(document.querySelector('#inputEditor'), {
      language: 'json',
      theme: this.state.theme === 'dark' ? 'vs-dark' : 'vs',
      formatOnPaste: true,
      formatOnType: true,
      automaticLayout: true,
      minimap: { enabled: false },
      contextmenu: false,
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
      wordWrap: 'on'
    })

    // 监听编辑器内容变化
    this.inputEditor.onDidChangeModelContent(this.inputEditorChange)
  }

  /**
   * 初始化输出编辑器
   */
  initOutputEditor = () => {
    this.outputEditor = monaco.editor.create(document.querySelector('#outputEditor'), {
      language: 'json',
      theme: this.state.theme === 'dark' ? 'vs-dark' : 'vs',
      readOnly: true,
      automaticLayout: true,
      minimap: { enabled: false },
      contextmenu: false,
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
      wordWrap: 'on'
    })
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
        
        // 全选状态下的粘贴处理
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
   * 监听系统主题变化
   */
  listenThemeChange = () => {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      const isDark = e.matches
      this.setState({ theme: isDark ? 'dark' : 'light' })
      monaco.editor.setTheme(isDark ? 'vs-dark' : 'vs')
    })
  }

  /**
   * 处理输入编辑器内容变化
   * 主要功能：
   * 1. 监听编辑器内容变化
   * 2. 根据内容是否为空控制 placeholder 的显示/隐藏
   * 3. 尝试解析 JSON 内容
   * 4. 如果存在 JS 过滤器则更新输出
   */
  inputEditorChange = () => {
    try {
      const value = this.inputEditor.getValue()
      // 根据编辑器内容设置 placeholder 状态
      this.setState({ placeholder: !value })
      
      this.inputContentObject = JSON.parse(value)
      
      // 存在JS过滤器时更新输出
      if (this.state.jsFilter) {
        this.jsFilterOutput()
      }
    } catch (e) {
      this.inputContentObject = e
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
   * 渲染组件
   * @returns {JSX.Element} 渲染的React组件
   */
  render() {
    const { theme, jsFilter, placeholder, messageData } = this.state
    const currentTheme = theme === 'dark' ? darkTheme : lightTheme

    return (
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={currentTheme}>
          <div className="content">
            <div 
              id="inputEditor"
              style={{ width: jsFilter ? '50%' : '100%' }}
            />
            <div
              id="outputEditor"
              style={{ display: jsFilter ? 'block' : 'none' }}
            />
          </div>

          {/* 显示占位符提示 */}
          {placeholder && (
            <div className="placeholder">
              URL Params、XML、YAML 粘贴自动转为 JSON
            </div>
          )}

          <div className="footer">
            <div className="left">this</div>
            
            {/* JS过滤器输入框 */}
            <div className="right">
              <input
                onChange={this.handleJsFilterInputChange}
                placeholder=' JS 过滤; 示例 ".key.subkey"、"[0][1]"、".map(x=>x.val)"'
                value={jsFilter}
                type="text"
              />
            </div>

            {/* 工具按钮区域 */}
            <div className="handle">
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
            </div>
          </div>

          {/* 消息提示组件 */}
          <MessageSnackbar messageData={messageData} />
        </ThemeProvider>
      </StyledEngineProvider>
    )
  }
}

export default JsonEditor 