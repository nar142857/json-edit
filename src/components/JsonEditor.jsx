import React, { Component } from 'react'
import * as monaco from 'monaco-editor'
import { 
  Button, 
  Tooltip, 
  Divider,
  ThemeProvider 
} from '@material-ui/core'
import {
  FormatIcon,
  ExpandIcon,
  CollapseIcon,
  StripCommentsIcon,
  CompressIcon,
  EscapeIcon,
  XmlIcon,
  TypeScriptIcon
} from './icons'
import { JsonService, FileService } from '../services'
import { darkTheme, lightTheme } from '../themes'
import MessageSnackbar from './MessageSnackbar'

/**
 * JSON编辑器组件
 */
class JsonEditor extends Component {
  constructor(props) {
    super(props)
    
    this.state = {
      theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      placeholder: '',
      jsFilter: '',
      messageData: null
    }

    // 编辑器实例
    this.inputEditor = null
    this.outputEditor = null
    
    // 输入内容对象
    this.inputContentObject = null
    
    // JS过滤延时器
    this.jsFilterInputDelayTimer = null
  }

  componentDidMount() {
    // 初始化输入编辑器
    this.initInputEditor()
    
    // 初始化输出编辑器
    this.outputEditor = monaco.editor.create(document.querySelector('#outputEditor'), {
      language: 'json',
      theme: this.state.theme === 'dark' ? 'vs-dark' : 'vs',
      readOnly: true,
      automaticLayout: true,
      minimap: { enabled: false },
      contextmenu: false,
      scrollBeyondLastLine: false,
      showFoldingControls: 'always',
      links: false
    })
    
    // 监听插件进入
    this.listenPluginEnter()
    
    // 监听粘贴事件
    this.listenPaste()
    
    // 监听快捷键
    window.addEventListener('keydown', this.keyDownAction, true)
    
    // 监听主题变化
    this.listenThemeChange()
  }

  /**
   * 初始化输入编辑器
   */
  initInputEditor = () => {
    this.inputEditor = monaco.editor.create(document.querySelector('#inputEditor'), {
      language: 'json',
      theme: this.state.theme === 'dark' ? 'vs-dark' : 'vs',
      formatOnPaste: true,
      formatOnType: true,
      automaticLayout: true,
      minimap: { enabled: false },
      contextmenu: false,
      scrollBeyondLastLine: false,
      showFoldingControls: 'always',
      links: false
    })

    this.inputEditor.onDidChangeModelContent(this.inputEditorChange)
  }

  /**
   * 监听插件进入
   */
  listenPluginEnter = () => {
    window.utools.onPluginEnter(({ type, payload }) => {
      if (type === 'regex') {
        // 正则匹配进入
        this.setState({ placeholder: false, jsFilter: '' })
        this.inputContentObject = null
        this.setEditorFormatValue(payload)
      } else if (type === 'files') {
        // 文件进入
        this.setState({ placeholder: false, jsFilter: '' })
        this.inputContentObject = null
        this.setEditorFormatValue(window.services.readFileContent(payload[0].path))
      } else if (this.state.placeholder === '') {
        this.setState({ placeholder: true })
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

      if (!this.inputEditor.getValue()) {
        // 编辑器为空时直接格式化粘贴内容
        e.stopPropagation()
        e.preventDefault()
        this.setEditorFormatValue(text)
        return
      }

      // 检查是否全选
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
        
        if (
          selection.endLineNumber === lastLine && 
          selection.endColumn === lastColumn
        ) {
          // 全选状态下格式化粘贴内容
          e.stopPropagation()
          e.preventDefault() 
          this.setEditorFormatValue(text)
        }
      }
    }, true)
  }

  /**
   * 监听主题变化
   */
  listenThemeChange = () => {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      const isDark = e.matches
      this.setState({ theme: isDark ? 'dark' : 'light' })
      monaco.editor.setTheme(isDark ? 'vs-dark' : 'vs')
    })
  }

  /**
   * 编辑器内容变化处理
   */
  inputEditorChange = () => {
    try {
      const value = this.inputEditor.getValue()
      this.inputContentObject = JSON.parse(value)
      
      if (this.state.jsFilter) {
        // 有JS过滤器时更新输出
        this.jsFilterOutput()
      }
    } catch (e) {
      this.inputContentObject = e
    }
  }

  /**
   * JS过滤器输入变化
   */
  handleJsFilterInputChange = e => {
    const filter = e.target.value
    this.setState({ jsFilter: filter })

    if (!filter) return

    // 延时处理过滤
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

  // 快捷键处理
  keyDownAction = e => {
    if (e.code === 'F1') {
      e.stopPropagation()
      e.preventDefault()
      return
    }

    if (!e.altKey) return
    
    e.stopPropagation()
    e.preventDefault()

    switch (e.code) {
      case 'KeyF':
        this.handleReFormat()
        break
      case 'KeyC': 
        this.handleCompressCopy()
        break
      case 'Backslash':
        this.handleCompressQuoteCopy()
        break
      case 'Period':
        e.shiftKey ? this.handleExpandAll() : this.handleCollapseAll()
        break
    }
  }

  // 其他处理方法...

  setEditorFormatValue = (value) => {
    try {
      const formattedValue = JSON.stringify(JSON.parse(value), null, 2)
      this.inputEditor.setValue(formattedValue)
    } catch (e) {
      this.setState({ messageData: { type: 'error', message: 'Invalid JSON format' } })
    }
  }

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

  render() {
    const { theme, jsFilter, placeholder, messageData } = this.state

    return (
      <ThemeProvider theme={theme === 'dark' ? darkTheme : lightTheme}>
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
            <Tooltip title="重新格式化「Alt + F」" placement="top">
              <Button
                onClick={this.handleReFormat}
                disableFocusRipple
                size="small"
              >
                <FormatIcon />
              </Button>
            </Tooltip>

            {/* 其他工具按钮 */}
          </div>
        </div>

        <MessageSnackbar messageData={messageData} />
      </ThemeProvider>
    )
  }
}

export default JsonEditor 