/**
 * 导入所需的React和其他依赖
 */
import React, { Component, useState } from 'react'
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
  Code as CodeIcon,
  Description as XmlIcon,
  Code as TypeScriptIcon,
  Label as LabelIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  SaveAlt as SaveAltIcon,
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  History as HistoryIcon,
  CompareArrows as CompareIcon,
  Filter as FilterIcon,
  TextFields as TextFieldsIcon,
  Translate as TranslateIcon,
  Build as BuildIcon,
  SortByAlpha as SortIcon,
  Delete as DeleteIcon
} from '@mui/icons-material'
import { JsonService, FileService, EditorStateService } from '../services'
import MessageSnackbar from './MessageSnackbar'
import './JsonEditor.css'
import { debounce } from 'lodash'
import DiffEditor from './DiffEditor'
import JsonFilter from './JsonFilter'
import JsonFixer from './JsonFixer'

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
    
    // 初始化 ref
    this.editorRef = React.createRef();
    
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
      isEditorMounted: false, // 添加编辑器准备状态
      loading: false, // 添加加载状态
      error: null,
      isDiffMode: false,
      originalValue: '',
      modifiedValue: '',
      filterDrawerOpen: false,
      isExpanded: true, // 添加展开/折叠
      isEscaped: false, // 添加转义状态
    }

    // 编辑器实例
    this.inputEditor = null;
    
    // 存储输入的JSON对象
    this.inputContentObject = null;
    
    // JS过滤器延时处理定时器
    this.jsFilterInputDelayTimer = null;
    this.hasUnsavedChanges = false;

    // 初始化标签输入框的ref
    this.labelInputRef = React.createRef();

    // 绑定方法到实例
    this.listenPaste = this.listenPaste.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  /**
   * 初始化 Monaco Editor
   */
  initMonacoEditor = () => {
    const { theme } = this.state;
    
    if (!this.editorRef.current) {
      console.warn('Editor element not ready for initialization');
      return;
    }

    try {
      // 如果已经有编辑器实例，先销毁
      if (this.inputEditor) {
        this.inputEditor.dispose();
        this.inputEditor = null;
      }

      // 基础编辑器配置
      const editorConfig = {
        value: '',
        language: 'json',
        theme: theme === 'dark' ? 'vs-dark' : 'vs-light',
        automaticLayout: true,
        minimap: { enabled: false },
        lineNumbers: 'on',
        folding: true,
        formatOnPaste: true,
        formatOnType: true,
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        fontSize: 14,
        tabSize: 2
      };

      // 创建编辑器实例
      this.inputEditor = monaco.editor.create(this.editorRef.current, editorConfig);

      // 添加内容变化监听器
      if (this.inputEditor) {
        this.inputEditor.onDidChangeModelContent(this.handleEditorChange);
        
        // 初始化时设置占位符状态
        this.setState({ 
          isEditorMounted: true,
          placeholder: true
        });

        // 监听折叠状态变化
        const model = this.inputEditor.getModel();
        if (model) {
          // 记录上一次的折叠状态
          let lastDecorations = new Set();
          
          model.onDidChangeDecorations(() => {
            // 获取当前的折叠装饰器
            const currentDecorations = new Set(
              model.getAllDecorations()
                .filter(d => d.options.description === 'folding-collapsed-highlighted-visual-decoration')
                .map(d => `${d.range.startLineNumber}-${d.range.endLineNumber}`)
            );

            // 检查是否有新的折叠发生
            const hasNewFolds = Array.from(currentDecorations).some(id => !lastDecorations.has(id));
            
            // 检查是否有展开发生
            const hasUnfolds = Array.from(lastDecorations).some(id => !currentDecorations.has(id));

            if (hasNewFolds) {
              console.log('检测到新的折叠操作');
              requestAnimationFrame(() => {
                this.updateFoldingCounts();
              });
            } else if (hasUnfolds) {
              console.log('检测到展开操作');
              // 清除已展开区域的计数装饰器
              const unfoldedDecorations = Array.from(lastDecorations)
                .filter(id => !currentDecorations.has(id))
                .map(id => {
                  const [startLine] = id.split('-').map(Number);
                  return startLine;
                });

              this.clearFoldingCountDecorations(unfoldedDecorations);
            }

            // 更新上一次的状态
            lastDecorations = currentDecorations;
          });
        }
      }
    } catch (error) {
      console.error('Error initializing editor:', error);
    }
  };

  /**
   * 清除指定行的计数装饰器
   */
  clearFoldingCountDecorations = (lineNumbers) => {
    if (!this.inputEditor) return;
    const model = this.inputEditor.getModel();
    if (!model) return;

    // 获取所有计数装饰器
    const oldDecorations = model.getAllDecorations()
      .filter(d => {
        // 检查是否是计数装饰器，且在指定的行号上
        return d.options.after?.inlineClassName === 'folding-count-text' &&
               lineNumbers.includes(d.range.startLineNumber);
      })
      .map(d => d.id);

    if (oldDecorations.length > 0) {
      model.deltaDecorations(oldDecorations, []);
    }
  };

  /**
   * 更新折叠区域的计数信息
   */
  updateFoldingCounts = () => {
    console.log('开始更新折叠计数');
    if (!this.inputEditor) {
      console.log('编辑器实例不存在');
      return;
    }

    const model = this.inputEditor.getModel();
    if (!model) {
      console.log('编辑器模型不存在');
      return;
    }

    try {
      // 获取所有装饰器
      const decorations = model.getAllDecorations();
      console.log('所有装饰器:', decorations);
      
      // 找出所有折叠的区域
      const foldedRegions = decorations
        .filter(d => {
          // 只处理折叠装饰器
          return d.options.description === 'folding-collapsed-highlighted-visual-decoration';
        })
        // 去重，避免重复处理相同的区域
        .filter((d, index, self) => 
          index === self.findIndex(t => (
            t.range.startLineNumber === d.range.startLineNumber &&
            t.range.endLineNumber === d.range.endLineNumber
          ))
        );

      console.log('找到的折叠区域:', foldedRegions);

      // 清除之前的计数装饰器
      const oldDecorations = model.getAllDecorations()
        .filter(d => d.options.after?.inlineClassName === 'folding-count-text')
        .map(d => d.id);
      
      console.log('要清除的旧装饰器:', oldDecorations);
      
      if (oldDecorations.length > 0) {
        model.deltaDecorations(oldDecorations, []);
      }

      // 为每个折叠区域计算并添加计数信息
      const newDecorations = foldedRegions.map(region => {
        try {
          const startLineNumber = region.range.startLineNumber;
          const endLineNumber = region.range.endLineNumber;
          
          // 获取完整的折叠内容
          const content = model.getValueInRange({
            startLineNumber,
            startColumn: 1,
            endLineNumber,
            endColumn: model.getLineMaxColumn(endLineNumber)
          });
          
          console.log('处理折叠区域:', {
            startLine: startLineNumber,
            endLine: endLineNumber,
            content
          });

          // 尝试提取并解析JSON
          try {
            // 确保内容是完整的JSON
            let jsonContent = content;
            // 如果内容不是以 { 或 [ 开头，尝试找到第一个 { 或 [
            const objectStart = content.indexOf('{');
            const arrayStart = content.indexOf('[');
            const start = objectStart >= 0 && arrayStart >= 0 
              ? Math.min(objectStart, arrayStart)
              : Math.max(objectStart, arrayStart);
            
            if (start >= 0) {
              jsonContent = content.substring(start);
              // 确保JSON内容是完整的
              let bracketCount = 0;
              let i = 0;
              const openBracket = jsonContent[0];
              const closeBracket = openBracket === '{' ? '}' : ']';
              
              while (i < jsonContent.length) {
                if (jsonContent[i] === openBracket) bracketCount++;
                if (jsonContent[i] === closeBracket) bracketCount--;
                if (bracketCount === 0) {
                  jsonContent = jsonContent.substring(0, i + 1);
                  break;
                }
                i++;
              }

              console.log('提取的JSON内容:', jsonContent);
              
              // 确保JSON内容完整
              if (!jsonContent.endsWith(closeBracket)) {
                jsonContent += closeBracket;
              }

              const parsedContent = JSON.parse(jsonContent);
              let count;
              
              if (openBracket === '[') {
                // 如果是数组，计算元素数量
                count = parsedContent.length;
              } else {
                // 如果是对象，只计算第一层的键数量
                count = Object.keys(parsedContent).length;
              }
              console.log('计算得到的数量:', count);

              return {
                range: {
                  startLineNumber,
                  startColumn: 1,
                  endLineNumber: startLineNumber,
                  endColumn: model.getLineMaxColumn(startLineNumber)
                },
                options: {
                  after: {
                    content: ` (${count})`,
                    inlineClassName: 'folding-count-text'
                  }
                }
              };
            }
          } catch (e) {
            console.log('JSON解析失败，尝试手动计算:', e);
            // 如果解析失败，尝试手动计算
            const hasObject = content.includes('{');
            const hasArray = content.includes('[');
            let count = 0;

            if (hasObject) {
              // 只匹配第一层的键值对
              // 使用正则表达式匹配第一层的键值对
              // 1. 从第一个 { 开始
              // 2. 匹配不在嵌套对象或数组中的键值对
              const firstBraceIndex = content.indexOf('{');
              if (firstBraceIndex >= 0) {
                let searchContent = content.substring(firstBraceIndex);
                let level = 0;
                let currentPos = 0;
                let inString = false;
                let keyCount = 0;
                let foundColon = false;

                while (currentPos < searchContent.length) {
                  const char = searchContent[currentPos];
                  
                  if (char === '"' && searchContent[currentPos - 1] !== '\\') {
                    inString = !inString;
                  } else if (!inString) {
                    if (char === '{' || char === '[') {
                      level++;
                    } else if (char === '}' || char === ']') {
                      level--;
                    } else if (char === ':' && level === 1) {
                      foundColon = true;
                    } else if (char === ',' && level === 1) {
                      if (foundColon) {
                        keyCount++;
                        foundColon = false;
                      }
                    }
                  }
                  currentPos++;
                }
                
                // 如果最后一个键值对后没有逗号，也要计数
                if (foundColon) {
                  keyCount++;
                }
                
                count = keyCount;
              }
            } else if (hasArray) {
              // 如果是数组，计算第一层的逗号数量加1
              let level = 0;
              let commaCount = 0;
              let inString = false;
              
              for (let i = 0; i < content.length; i++) {
                const char = content[i];
                if (char === '"' && content[i - 1] !== '\\') {
                  inString = !inString;
                } else if (!inString) {
                  if (char === '[' || char === '{') {
                    level++;
                  } else if (char === ']' || char === '}') {
                    level--;
                  } else if (char === ',' && level === 1) {
                    commaCount++;
                  }
                }
              }
              count = commaCount + 1;
            }
            
            if (count > 0) {
              console.log('手动计算得到的数量:', count);
              return {
                range: {
                  startLineNumber,
                  startColumn: 1,
                  endLineNumber: startLineNumber,
                  endColumn: model.getLineMaxColumn(startLineNumber)
                },
                options: {
                  after: {
                    content: ` (${count})`,
                    inlineClassName: 'folding-count-text'
                  }
                }
              };
            }
          }
        } catch (e) {
          console.error('计算折叠计数时出错:', e);
        }
        return null;
      }).filter(Boolean);

      console.log('新创建的装饰器:', newDecorations);

      // 应用新的装饰器
      if (newDecorations.length > 0) {
        const result = model.deltaDecorations([], newDecorations);
        console.log('应用装饰器结果:', result);
      } else {
        console.log('没有新的装饰器需要应用');
      }
    } catch (e) {
      console.error('更新折叠计数时出错:', e);
    }
  };

  /**
   * 处理编辑器内容变化
   */
  handleEditorChange = (e) => {
    try {
      console.log('Editor content changed');
      const content = this.inputEditor.getValue();
      
      // 更新占位符状态
      this.setState({ 
        placeholder: !content.trim()
      });
      
      // 只标记内容变化，不触发保存
      if (content.trim() !== this.state.lastSavedContent) {
        console.log('Content changed, marking as unsaved');
        this.hasUnsavedChanges = true;
      }
    } catch (error) {
      console.error('Error handling editor change:', error);
    }
  };

  /**
   * 组件挂载后初始化编辑器
   */
  componentDidMount() {
    // 使用 Promise 确保编辑器初始化完成
    const initEditor = () => {
      return new Promise((resolve) => {
        const checkEditor = () => {
          if (this.editorRef.current) {
            this.initMonacoEditor();
            resolve();
          } else {
            requestAnimationFrame(checkEditor);
          }
        };
        checkEditor();
      });
    };

    // 初始化编辑器并添加事件监听
    initEditor().then(() => {
      this.listenPaste();
      window.addEventListener('keydown', this.handleKeyDown);
      this.listenPluginEnter();
      // 添加插件离开事件监听
      window.utools.onPluginOut(() => {
        console.log('Plugin out, saving state...');
        if (this.hasUnsavedChanges && this.inputEditor) {
          this.saveEditorState(true); // 关闭时检查内容变化
        }
      });
      console.log('Editor initialized and events bound');
    });
  }

  /**
   * 组件更新后检查是否需要初始化编辑器
   */
  componentDidUpdate(prevProps, prevState) {
    if (!this.state.isEditorMounted && this.editorRef.current) {
      this.initMonacoEditor();
      this.listenPaste();
    }
  }

  /**
   * 组件卸载前清理资源
   */
  componentWillUnmount() {
    // 移除事件监听器
    window.removeEventListener('keydown', this.handleKeyDown);
    
    // 清理编辑器实例
    if (this.inputEditor) {
      try {
        this.inputEditor.dispose();
        this.inputEditor = null;
      } catch (error) {
        console.error('Error disposing editor:', error);
      }
    }

    // 重置状态
    this.setState({ isEditorMounted: false });
  }

  /**
   * 监听粘贴事件
   */
  listenPaste = () => {
    if (!this.editorRef.current) {
      console.warn('Editor element not ready for paste listener');
      return;
    }

    const pasteHandler = (e) => {
      const text = e.clipboardData.getData('text');
      if (!text || !this.inputEditor) return;

      // 编辑器为空时的处理
      if (!this.inputEditor.getValue()) {
        e.stopPropagation();
        e.preventDefault();
        this.inputEditor.setValue(text);
        // 使用 requestAnimationFrame 确保在下一帧执行格式化
        requestAnimationFrame(() => this.handleReFormat());
        return;
      }

      // 检查是否全选状态
      const selection = this.inputEditor.getSelection();
      if (
        selection.startLineNumber === 1 && 
        selection.startColumn === 1 &&
        (
          selection.startLineNumber !== selection.endLineNumber ||
          selection.startColumn !== selection.endColumn
        )
      ) {
        const model = this.inputEditor.getModel();
        const lastLine = model.getLineCount();
        const lastColumn = model.getLineContent(lastLine).length + 1;
        
        // 全选态下的粘贴处理
        if (
          selection.endLineNumber === lastLine && 
          selection.endColumn === lastColumn
        ) {
          e.stopPropagation();
          e.preventDefault();
          this.inputEditor.setValue(text);
          // 使用 requestAnimationFrame 确保在下一帧执行格式化
          requestAnimationFrame(() => this.handleReFormat());
        }
      }
    };

    // 添加粘贴事件监听器
    this.editorRef.current.addEventListener('paste', pasteHandler, true);
    
    // 保存 handler 引用以便后续移除
    this.pasteHandler = pasteHandler;
  };

  /**
   * 切换差异对比模式
   */
  toggleDiffMode = () => {
    const { isDiffMode, originalValue, modifiedValue } = this.state
    
    if (!isDiffMode) {
      // 进入对比模式，左侧显示当前编辑器内容，右侧为空
      const currentContent = this.inputEditor.getValue()
      this.setState({
        isDiffMode: true,
        originalValue: currentContent,  // 左侧显示当前内容
        modifiedValue: ''  // 右侧初始为空，等待用户输入
      })
    } else {
      // 退出对比模式，使用右侧（修复后）的内容恢复编辑器
      this.setState({
        isDiffMode: false,
        originalValue: '',
        modifiedValue: ''
      }, () => {
        // 重新初始化编辑器
        if (this.editorRef.current) {
          this.initMonacoEditor()
          // 设置编辑器内容为右侧（修复后）的内容
          if (this.inputEditor) {
            // 如果有修复后的内容，使用修复后的内容；否则使用原始内容
            const contentToRestore = modifiedValue || originalValue;
            this.inputEditor.setValue(contentToRestore)
            // 确保编辑器获得焦点
            requestAnimationFrame(() => {
              this.inputEditor.focus()
            })
          }
        }
      })
    }
  }

  /**
   * 处理原始编辑器内容变化
   */
  handleDiffEditorOriginalChange = (value) => {
    this.setState({ originalValue: value })
  }

  /**
   * 处理修改后编辑器内容变化
   */
  handleDiffEditorModifiedChange = (value) => {
    this.setState({ modifiedValue: value })
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

    // 监听窗口关闭事件
    window.addEventListener('beforeunload', this.handleBeforeUnload)

    this.setState({ isEditorReady: true })
  }

  /**
   * 处理输入编辑器内容变化
   * 主要功能：
   * 1. 监听编辑器内容变化
   * 2. 根据内容是否为空设置 placeholder 的显示/隐藏
   * 3. 尝试解析 JSON 内容
   * 4. 如果存在 JS 过滤器则更新输出
   */
  handleEditorContentChange = () => {
    try {
      const currentContent = this.inputEditor.getValue()
      
      // 根据编辑器内容设置 placeholder 状态
      this.setState({ placeholder: !currentContent.trim() })
      
      // 更新输出编辑器
      if (this.state.jsFilter) {
        this.updateOutputWithFilter(currentContent)
      } else {
        this.outputEditor.setValue(currentContent)
      }

      // 只标记内容已更改，不触发保存
      if (currentContent.trim() !== this.state.lastSavedContent) {
        this.hasUnsavedChanges = true
      }
    } catch (e) {
      console.error('处理编辑器内容变化失败:', e)
    }
  }

  /**
   * 处理窗口关闭前保存
   */
  handleBeforeUnload = (event) => {
    // 只在实际关闭窗口且有未保存更改时保存
    if (this.hasUnsavedChanges) {
      // 在关闭前保存到历史记录
      this.saveEditorState(true); // 关闭时检查内容变化
      // 清除未保存标记
      this.hasUnsavedChanges = false
    }
  }

  /**
   * 保存编辑器状态到历史记录
   * @param {boolean} checkChanges - 是否需要检查内容变化，默认为 false
   */
  saveEditorState = (checkChanges = false) => {
    try {
      const content = this.inputEditor.getValue().trim();
      // 如果内容为空，不保存
      if (!content) {
        return;
      }

      // 如果需要检查变化且内容没有变化，不保存
      if (checkChanges && content === this.state.lastSavedContent) {
        return;
      }

      // 使用 EditorStateService 保存到历史记录
      EditorStateService.saveEditorState(content, this.state.label);
      
      // 更新最后保存的内容
      this.setState({ 
        lastSavedContent: content,
        messageData: { 
          type: 'success', 
          message: '已保存到历史记录' 
        } 
      });
      
      // 清除未保存标记
      this.hasUnsavedChanges = false;
    } catch (e) {
      console.error('保存到历史记录失败:', e);
      this.setState({ 
        messageData: { 
          type: 'error', 
          message: '保存到历史记录失败: ' + e.message 
        } 
      });
    }
  };

  /**
   * 加载历史记录
   */
  loadHistory = () => {
    try {
      const { history } = EditorStateService.getEditorHistory();
      this.setState({ history });
    } catch (e) {
      console.error('加载历史记录失败:', e);
      this.setState({ 
        messageData: { 
          type: 'error', 
          message: '加载历史记录失败: ' + e.message 
        } 
      });
    }
  };

  /**
   * 处理历史菜单点击
   */
  handleHistoryMenuClick = (event) => {
    this.setState({ historyMenuAnchor: event.currentTarget });
    this.loadHistory();
  };

  /**
   * 处理历史菜单关闭
   */
  handleHistoryMenuClose = () => {
    this.setState({ historyMenuAnchor: null });
  };

  /**
   * 处理历史记录选择
   */
  handleHistorySelect = (item) => {
    this.inputEditor.setValue(item.content);
    this.setState({ 
      historyMenuAnchor: null,
      label: item.label,
      showLabelInput: true,
      lastSavedContent: item.content,
      messageData: { type: 'success', message: '历史记录加载成功' }
    });
    this.hasUnsavedChanges = false;
  };

  /**
   * 处理历史记录删除
   */
  handleHistoryDelete = (item, event) => {
    event.stopPropagation(); // 阻止事件冒泡，避免触发选择事件
    try {
      // 调用 EditorStateService 删除历史记录
      EditorStateService.deleteEditorState(item.id);
      
      // 更新历史记录列表
      this.loadHistory();
      
      this.setState({ 
        messageData: { 
          type: 'success', 
          message: '历史记录已删除' 
        } 
      });
    } catch (e) {
      console.error('删除历史记录失败:', e);
      this.setState({ 
        messageData: { 
          type: 'error', 
          message: '删除历史记录失败: ' + e.message 
        } 
      });
    }
  };

  /**
   * 处理 JS 过滤器输入变化
   * @param {Event} e - 输入事件对象
   */
  handleJsFilterInputChange = e => {
    const filter = e.target.value;
    console.log('过滤器输变化:', filter);
    
    this.setState({ jsFilter: filter });

    if (!filter) {
      console.log('过滤器为空，保持原始内容');
      return;
    }

    // 使用延时器防抖处理
    if (this.jsFilterInputDelayTimer) {
      clearTimeout(this.jsFilterInputDelayTimer);
      console.log('清除之前的延时器');
    }
    
    console.log('设置新的延时器');
    this.jsFilterInputDelayTimer = setTimeout(() => {
      console.log('延时器触发，开始处理过滤');
      this.jsFilterInputDelayTimer = null;
      
      try {
        const content = this.inputEditor.getValue();
        console.log('当前编辑器内容:', content);
        
        if (!content.trim()) {
          console.log('编辑器内容为空，退出过滤');
          return;
        }

        // 验证当前内容是否为有效的 JSON
        let jsonData;
        try {
          jsonData = JSON.parse(content);
          console.log('JSON 解析成功:', jsonData);
        } catch (error) {
          console.error('JSON 解析失败:', error);
          console.error('无效的 JSON 内容:', content);
          this.setState({
            messageData: {
              message: '请先确保编辑器中的内容是有效的 JSON',
              type: 'error'
            }
          });
          return;
        }

        // 创建过滤函数
        let filterFunction;
        try {
          // 如果过滤表达式以 "json" 开头，直接使用
          // 否则，添加 "json" 前缀
          const processedExpression = filter.trim().startsWith('json') 
            ? filter 
            : `json${filter}`;
          
          console.log('处理后的过滤表达式:', processedExpression);

          filterFunction = new Function('json', `
            try {
              console.log('执行过滤函数，输入数:', json);
              const result = ${processedExpression};
              console.log('过滤结果:', result);
              return result;
            } catch (error) {
              console.error('过滤表达式执行错误:', error);
              throw new Error('过滤表达式错误: ' + error.message);
            }
          `);
        } catch (error) {
          console.error('创建过滤函数失败:', error);
          throw new Error('过滤表达式语法错误: ' + error.message);
        }

        // 应用过滤器
        console.log('开始执行过滤函数');
        const filteredResult = filterFunction(jsonData);
        console.log('过滤执行完成，结果:', filteredResult);

        // 将结果转换回 JSON 字符串并格式化
        const formattedResult = typeof filteredResult === 'string' 
          ? filteredResult 
          : JSON.stringify(filteredResult, null, 2);
        
        console.log('格式化后的结果:', formattedResult);

        // 更新编辑器内容
        this.inputEditor.setValue(formattedResult);
        console.log('更新编辑器内容');

        // 清除错误消息
        this.setState({ messageData: null });

      } catch (error) {
        console.error('JSON 过滤过程中发生错误:', error);
        console.error('错误堆栈:', error.stack);
        this.setState({
          messageData: {
            message: error.message,
            type: 'error'
          }
        });
      }
    }, 300);
  };

  /**
   * 处理工具栏过滤按钮点击
   */
  handleFilterClick = () => {
    try {
      console.log('过滤按钮被点击');
      const filterExpression = prompt('请输入过滤表达式 (例如: .field1 或 .array.filter(item => item.id > 10))');
      console.log('用户输入的过滤表达式:', filterExpression);
      
      if (filterExpression) {
        this.handleJsonFilter(filterExpression);
      } else {
        console.log('用户取消了输入');
      }
    } catch (error) {
      console.error('处理过滤按钮点击失败:', error);
      console.error('错误堆栈:', error.stack);
      this.setState({
        messageData: {
          message: '过滤操作失败: ' + error.message,
          type: 'error'
        }
      });
    }
  };

  /**
   * 重新格式化
   */
  handleReFormat = () => {
    try {
      const value = this.inputEditor.getValue();
      
      // 使用与 listenPluginEnter 相关的理逻辑
      const formattedContent = this.formatJsonInText(value);
      
      // 更新编辑器内容
      this.inputEditor.setValue(formattedContent);
      
      // 清除错误消息
      this.setState({ messageData: null });
    } catch (e) {
      console.error('格式化失败:', e);
      this.setState({ 
        messageData: { 
          type: 'error', 
          message: '格式化失败: ' + e.message 
        } 
      });
    }
  }

  /**
   * 在文本中查找并格式化JSON部分，留其他文本
   * @param {string} text - 输入文本
   * @returns {string} - 处理后的文本
   */
  formatJsonInText = (text) => {
    try {
      // 1. 首先尝试判断是否为标准JSON
      const trimmedText = text.trim();
      if (
        (trimmedText.startsWith('{') && trimmedText.endsWith('}')) ||
        (trimmedText.startsWith('[') && trimmedText.endsWith(']'))
      ) {
        try {
          // 使用JsonService处理大数值问题
          return JsonService._handleBigNumbers(trimmedText);
        } catch (e) {
          // 解析失败,说明不是标准JSON,继续使用混合内容处理方式
          console.log('Not standard JSON, using mixed content handler');
        }
      }

      // 2. 处理混合内容
      // 匹配可能的JSON结构（更宽松的模式）
      const jsonRegex = /({[\s\S]*?}|\[[\s\S]*?\])/g;
      let lastIndex = 0;
      let result = '';
      let match;

      while ((match = jsonRegex.exec(text)) !== null) {
        // 添加JSON之前的文本（保持原样）
        const prefix = text.slice(lastIndex, match.index);
        
        // 处理前缀文本，保留其格式但去除多余空行
        if (prefix) {
          const trimmedPrefix = prefix.replace(/\n{2,}/g, '\n').trimEnd();
          result += trimmedPrefix;
          // 如果前缀不是以换行结尾添加一个换行
          if (!trimmedPrefix.endsWith('\n')) {
            result += '\n';
          }
        }
        
        try {
          // 尝试解析和格式化JSON部分
          let jsonPart = match[0];
          
          // 使用JsonService处理大数值问题
          jsonPart = JsonService._handleBigNumbers(jsonPart);
          
          result += jsonPart;
          
          // 在JSON块后添加一个换行（如果后面还有内容）
          if (match.index + match[0].length < text.length) {
            result += '\n';
          }
        } catch (e) {
          // 如果处理失败，保持原样
          result += match[0];
        }
        
        lastIndex = match.index + match[0].length;
      }

      // 添加剩余的非JSON文本（保持原样）
      const remaining = text.slice(lastIndex);
      if (remaining) {
        // 处理剩余本，保留格式但去除多余空行
        const trimmedRemaining = remaining.replace(/\n{2,}/g, '\n').trimStart();
        // 如果前面有内容且不是以换行结尾，先添加换行
        if (result && !result.endsWith('\n') && trimmedRemaining) {
          result += '\n';
        }
        result += trimmedRemaining;
      }
      
      // 确保最终结果不会有多余的空行，并保持适当的缩进
      return result.replace(/\n{3,}/g, '\n\n').trim() || text;
    } catch (e) {
      console.error('格式化JSON文本失败:', e);
      return text;
    }
  }

  /**
   * 自定义JSON格式化
   * @param {Object} obj - 要格式化的JSON对象
   * @param {number} level - 当前缩进级别
   * @returns {string} - 格式化后的JSON字符串
   */
  customFormatJson = (obj, level = 0) => {
    console.log('customFormatJson=====')
    const indent = '  '.repeat(level);
    const nextIndent = '  '.repeat(level + 1);
    
    if (typeof obj !== 'object' || obj === null) {
      return JSON.stringify(obj);
    }
    
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      
      const items = obj.map(item => nextIndent + this.customFormatJson(item, level + 1));
      return '[\n' + items.join(',\n') + '\n' + indent + ']';
    }
    
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    
    // 对键进行分组
    const groups = {
      meta: ['name', 'version', 'description', 'author', 'license', 'main', 'private', 'type'],
      scripts: ['scripts'],
      dependencies: ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'],
      config: ['config', 'settings', 'options'],
      other: []
    };
    
    // 对键进行分类
    const groupedKeys = {};
    keys.forEach(key => {
      let found = false;
      for (const [group, groupKeys] of Object.entries(groups)) {
        if (groupKeys.includes(key)) {
          groupedKeys[group] = groupedKeys[group] || [];
          groupedKeys[group].push(key);
          found = true;
          break;
        }
      }
      if (!found) {
        groupedKeys.other = groupedKeys.other || [];
        groupedKeys.other.push(key);
      }
    });
    
    // 按顺序处理每个组
    const result = [];
    const groupOrder = ['meta', 'scripts', 'dependencies', 'config', 'other'];
    
    groupOrder.forEach((group, groupIndex) => {
      if (groupedKeys[group] && groupedKeys[group].length > 0) {
        // 只在组之间添加空行，不在开头和结尾添加
        if (groupIndex > 0 && result.length > 0) {
          result.push('');
        }
        
        groupedKeys[group].forEach((key, index) => {
          const value = obj[key];
          const formattedValue = this.customFormatJson(value, level + 1);
          const line = nextIndent + JSON.stringify(key) + ': ' + formattedValue;
          result.push(line + (index < groupedKeys[group].length - 1 ? ',' : ''));
        });
      }
    });
    
    return '{\n' + result.join('\n') + '\n' + indent + '}';
  }

  /**
   * 全部展开
   */
  handleExpandAll = () => {
    try {
      const editor = this.state.jsFilter ? this.outputEditor : this.inputEditor;
      if (!editor) return;

      // 用编辑器内置命令
      editor.trigger('fold', 'editor.unfoldAll', null);
      editor.focus();

      // 清除所有计数装饰器
      const model = editor.getModel();
      if (model) {
        const oldDecorations = model.getAllDecorations()
          .filter(d => d.options.after?.inlineClassName === 'folding-count-text')
          .map(d => d.id);
        
        if (oldDecorations.length > 0) {
          model.deltaDecorations(oldDecorations, []);
        }
      }
    } catch (e) {
      console.error('展开失败:', e);
      this.setState({ messageData: { type: 'error', message: '展开失败' } });
    }
  };

  /**
   * 全部折叠
   */
  handleCollapseAll = () => {
    try {
      console.log('开始执行全部折叠');
      const editor = this.state.jsFilter ? this.outputEditor : this.inputEditor;
      if (!editor) {
        console.log('编辑器实例不存在');
        return;
      }

      // 使用编辑器内置命令
      editor.trigger('fold', 'editor.foldAll', null);
      editor.focus();

      // 等待折叠动作完成后更新计数
      setTimeout(() => {
        this.updateFoldingCounts();
      }, 100);
    } catch (e) {
      console.error('折叠失败:', e);
      this.setState({ messageData: { type: 'error', message: '折叠失败' } });
    }
  };

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
   * 压缩转义复制
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
    }), () => {
      if (this.state.showLabelInput && this.labelInputRef.current) {
        this.labelInputRef.current.focus()
      }
    })
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
   * 处理键盘快捷键
   */
  handleKeyDown = (e) => {
    // 获取操作系统信息
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0

    // Ctrl/Command + S: 保存到历史记录
    if ((isMac ? e.metaKey : e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      this.saveEditorState()
      return
    }

    // Ctrl/Command + T: 切换标签输入框显示状态
    if ((isMac ? e.metaKey : e.ctrlKey) && e.key === 't') {
      e.preventDefault()
      this.handleLabelClick()
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

    // Alt + X: 增加转义
    if (e.altKey && e.key === 'x') {
      e.preventDefault()
      this.handleAddEscape()
      return
    }

    // Alt + U: 去除转义
    if (e.altKey && e.key === 'u') {
      e.preventDefault()
      this.handleRemoveEscape()
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
   * 处理选抽屉的开关
   */
  handleFilterDrawerToggle = () => {
    this.setState(prevState => ({
      filterDrawerOpen: !prevState.filterDrawerOpen
    }));
  }

  /**
   * 高亮显示选中的内容
   */
  handleHighlight = (path) => {
    try {
      const content = this.inputEditor.getValue();
      const jsonData = JSON.parse(content);
      
      // 根据径查找置
      const pathParts = path.split('.');
      let currentObj = jsonData;
      let found = true;
      
      for (const part of pathParts) {
        if (currentObj.hasOwnProperty(part)) {
          currentObj = currentObj[part];
        } else {
          found = false;
          break;
        }
      }
      
      if (found) {
        // 获取标文本在编辑器中的位置
        const model = this.inputEditor.getModel();
        const text = model.getValue();
        const lines = text.split('\n');
        let lineNumber = 1;
        let found = false;
        
        for (const line of lines) {
          if (line.includes(path.split('.').pop())) {
            found = true;
            break;
          }
          lineNumber++;
        }
        
        if (found) {
          // 滚动到目标位置并高亮
          this.inputEditor.revealLineInCenter(lineNumber);
          this.inputEditor.setPosition({
            lineNumber: lineNumber,
            column: 1
          });
          
          // 创建一个临时的装饰
          const decorations = [{
            range: new monaco.Range(lineNumber, 1, lineNumber, 1000),
            options: {
              isWholeLine: true,
              className: 'highlightLine',
              glyphMarginClassName: 'highlightGlyph'
            }
          }];
          
          // 添加装饰效果
          const oldDecorations = this.inputEditor.getModel().getAllDecorations();
          this.inputEditor.deltaDecorations(oldDecorations, decorations);
          
          // 3秒后移除高亮
          setTimeout(() => {
            this.inputEditor.deltaDecorations(decorations, []);
          }, 3000);
        }
      }
    } catch (error) {
      console.error('Error highlighting in editor:', error);
    }
  }

  /**
   * 处理展开/折叠切换
   */
  handleFoldToggle = () => {
    const { isExpanded } = this.state;
    
    if (isExpanded) {
      // 当前是展开状态执行折叠
      this.handleCollapseAll();
    } else {
      // 当前是折叠态，执行展开
      this.handleExpandAll();
    }
    
    // 更新状态
    this.setState(prevState => ({
      isExpanded: !prevState.isExpanded
    }));
  };

  /**
   * 处理增加转义
   */
  handleAddEscape = () => {
    try {
      const value = this.inputEditor.getValue();
      if (!value.trim()) {
        return;
      }

      // 执行增加转义
      let escaped = value;
      
      // 先处理反斜杠，再处理其他字符
      escaped = escaped
        .replace(/\\/g, '\\\\')    // 处理反斜杠（必须先处理）
        .replace(/"/g, '\\"')      // 处理引号
        .replace(/\n/g, '\\n')     // 处理换行
        .replace(/\r/g, '\\r')     // 处理回车
        .replace(/\t/g, '\\t')     // 处理制表符
        .replace(/[\b]/g, '\\b')   // 处理退格符
        .replace(/\f/g, '\\f');    // 处理换页符

      this.inputEditor.setValue(escaped);
      
      this.setState({ 
        messageData: { 
          type: 'success', 
          message: '增加转义成功' 
        } 
      });
    } catch (e) {
      console.error('增加转义失败:', e);
      this.setState({ 
        messageData: { 
          type: 'error', 
          message: '增加转义失败: ' + e.message 
        } 
      });
    }
  }

  /**
   * 处理去除转义
   */
  handleRemoveEscape = () => {
    try {
      const value = this.inputEditor.getValue();
      if (!value.trim()) {
        return;
      }

      // 执行去除转义
      const unescaped = value
        .replace(/\\\\"/g, '\\"')  // 处理双重转义的引号
        .replace(/\\"/g, '"')      // 处理转义的引号
        .replace(/\\\\/g, '\\')    // 处理转义的反斜杠
        .replace(/\\n/g, '\n')     // 处理换行转义
        .replace(/\\r/g, '\r')     // 处理回车转义
        .replace(/\\t/g, '\t')     // 处理制表符转义
        .replace(/\\b/g, '\b')     // 处理退格符转义
        .replace(/\\f/g, '\f');    // 处理换页符转义

      this.inputEditor.setValue(unescaped);
      
      this.setState({ 
        messageData: { 
          type: 'success', 
          message: '去除转义成功' 
        } 
      });
    } catch (e) {
      console.error('去除转义失败:', e);
      this.setState({ 
        messageData: { 
          type: 'error', 
          message: '去除转义失败: ' + e.message 
        } 
      });
    }
  }

  /**
   * 处理修复JSON按钮点击事件
   */
  handleFixJson = async () => {
    try {
      const currentValue = this.inputEditor?.getValue() || '';
      const result = await JsonFixer.fixJsonString(currentValue);

      if (result.success) {
        // 保存原始和修复后的内容
        this.setState({
          originalValue: currentValue,
          modifiedValue: result.result,
          isDiffMode: result.isDiffMode,
          messageData: {
            type: result.isDiffMode ? 'success' : 'info',
            message: result.isDiffMode ? 'JSON修复成功，请在对比视图中查看修复结果' : '标准JSON，无需修复'
          }
        });
      } else {
        // 显示错误提示
        this.setState({
          messageData: {
            type: 'error',
            message: result.error || '修复失败，请检查JSON格式'
          }
        });
      }
    } catch (error) {
      console.error('修复JSON时出错:', error);
      this.setState({
        messageData: {
          type: 'error',
          message: '修复过程出错: ' + error.message
        }
      });
    }
  };

  /**
   * 对JSON对象按key进行升序排序
   * @param {object} obj - 要排序的对象
   * @returns {object} - 排序后的对象
   */
  sortJsonByKey = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(item => {
        if (typeof item === 'object' && item !== null) {
          return this.sortJsonByKey(item);
        }
        return item;
      });
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const sortedKeys = Object.keys(obj).sort();
      const sortedObj = {};
      
      sortedKeys.forEach(key => {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          sortedObj[key] = this.sortJsonByKey(obj[key]);
        } else {
          sortedObj[key] = obj[key];
        }
      });
      
      return sortedObj;
    }
    
    return obj;
  }

  /**
   * 处理排序按钮点击事件
   */
  handleSort = () => {
    try {
      const content = this.inputEditor.getValue();
      if (!content.trim()) {
        return;
      }

      const jsonObj = JSON.parse(content);
      const sortedObj = this.sortJsonByKey(jsonObj);
      const sortedContent = JSON.stringify(sortedObj, null, 2);
      
      this.inputEditor.setValue(sortedContent);
      this.showMessage('JSON已按key值升序排列');
    } catch (error) {
      this.showMessage('排序失败：' + error.message, 'error');
    }
  }

  /**
   * 处理保存文件
   */
  handleSaveFile = async () => {
    try {
      const content = this.inputEditor.getValue();
      if (!content.trim()) {
        this.setState({ 
          messageData: { 
            type: 'warning', 
            message: '内容为空，无需保存' 
          } 
        });
        return;
      }

      const timestamp = this.getLocalTimestamp();
      const fileName = `${this.state.label || 'json'}_${timestamp}.json`;
      
      // 使用 uTools API 保存文件
      const filePath = window.utools.showSaveDialog({
        title: '保存 JSON 文件',
        defaultPath: fileName,
        filters: [
          { name: 'JSON', extensions: ['json'] }
        ]
      });

      if (!filePath) {
        // 用户取消了保存
        return;
      }

      let contentToSave;
      try {
        // 尝试格式化 JSON
        contentToSave = JSON.stringify(JSON.parse(content), null, 2);
      } catch (e) {
        // 如果不是有效的 JSON，保存原始内容
        contentToSave = content;
      }

      // 使用 window.services 保存文件
      await window.services.writeFile(filePath, contentToSave);
      
      this.setState({ 
        messageData: { 
          type: 'success', 
          message: '文件保存成功' 
        } 
      });
    } catch (e) {
      console.error('保存文件失败:', e);
      this.setState({ 
        messageData: { 
          type: 'error', 
          message: '保存文件失败: ' + e.message 
        } 
      });
    }
  };

  /**
   * 加载文件列表
   */
  loadJsonFiles = async () => {
    try {
      // 获取保存文件的路径
      const filePath = window.utools.getPath('downloads');
      
      // 使用 FileService 打开文件选择对话框
      const result = await FileService.readOpenFileText(['json'], 'JSON', '选择JSON文件');
      
      // 如果用户选择了文件，添加到列表中
      if (result) {
        const jsonFiles = [{
          name: result.name,
          path: result.path,
          modifiedTime: new Date().getTime()
        }];
        
        this.setState({ jsonFiles });
      }
    } catch (e) {
      // 如果用户取消选择，不显示错误
      if (e === '未发现合法文件') {
        return;
      }
      
      console.error('加载文件列表失败:', e);
      this.setState({ 
        messageData: { 
          type: 'error', 
          message: '加载文件列表失败: ' + e.message 
        } 
      });
    }
  };

  /**
   * 处理文件菜单点击
   */
  handleFileMenuClick = (event) => {
    this.setState({ fileMenuAnchor: event.currentTarget });
    this.loadJsonFiles();
  };

  /**
   * 处理文件菜单关闭
   */
  handleFileMenuClose = () => {
    this.setState({ fileMenuAnchor: null });
  };

  /**
   * 处理文件选择
   */
  handleFileSelect = async (filePath) => {
    try {
      // 读取文件内容
      const text = await window.services.readFile(filePath);
      
      // 设置编辑器内容
      this.inputEditor.setValue(text);

      // 从文件路径中提取标签（去除日期部分）
      const fileName = filePath.split(/[/\\]/).pop() // 同时处理正斜杠和反斜杠
        .replace(/\.json$/, '') // 去掉扩展名
        .replace(/_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/, ''); // 去掉时间

      this.setState({ 
        fileMenuAnchor: null,
        messageData: { type: 'success', message: '文件加载成功' },
        label: fileName,
        showLabelInput: true
      });
    } catch (e) {
      console.error('读取文件失败:', e);
      this.setState({ 
        messageData: { 
          type: 'error', 
          message: '读取文件失败: ' + e.message 
        } 
      });
    }
  };

  /**
   * 渲染组件
   * @returns {JSX.Element} 渲染的React组件
   */
  render() {
    const { 
      theme, filterDrawerOpen, isDiffMode, showLabelInput, label,
      fileMenuAnchor, jsonFiles, historyMenuAnchor, history, messageData,
      placeholder, error, isExpanded, originalValue, modifiedValue
    } = this.state;
    
    return (
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme === 'dark' ? darkTheme : lightTheme}>
          <div className="json-editor-container">
            {/* 标签输入框 */}
            {showLabelInput && (
              <div className="label-input">
                <input
                  ref={this.labelInputRef}
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

            {isDiffMode ? (
              <DiffEditor
                originalValue={originalValue}
                modifiedValue={modifiedValue}
                language="json"
                theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
                height="100%"
                renderSideBySide={true}  // 使用并排显示模式
                onOriginalValueChange={this.handleDiffEditorOriginalChange}
                onModifiedValueChange={this.handleDiffEditorModifiedChange}
              />
            ) : (
              <div className={`editor-wrapper ${filterDrawerOpen ? 'with-drawer' : ''}`} ref={this.editorRef} />
            )}
            
            {placeholder && (
              <div className="placeholder">
                URL Params、XML、YAML 粘贴自动转为 JSON
              </div>
            )}
            
            <JsonFilter
              open={filterDrawerOpen}
              onClose={this.handleFilterDrawerToggle}
              theme={theme}
              jsonContent={this.inputEditor ? this.inputEditor.getValue() : ''}
              onHighlight={this.handleHighlight}
            />
            
            <div className="bottom-toolbar">
              <Tooltip title="重新格式化「Alt + F」">
                <IconButton onClick={this.handleReFormat}>
                  <FormatIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="修复JSON">
                <IconButton onClick={this.handleFixJson}>
                  <BuildIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title={isExpanded ? "全部折叠「Alt + .」" : "全部展开「Alt + . + Shift」"}>
                <IconButton 
                  onClick={this.handleFoldToggle}
                  className={isExpanded ? '' : 'active'}
                >
                  {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
                </IconButton>
              </Tooltip>

              <Tooltip title="按key值升序排列">
                <IconButton onClick={this.handleSort}>
                  <SortIcon />
                </IconButton>
              </Tooltip>

              <Divider orientation="vertical" flexItem />

              <Tooltip title="添加标签「Ctrl/⌘ + T」">
                <IconButton 
                  onClick={this.handleLabelClick}
                  className={showLabelInput ? 'active' : ''}
                >
                  <LabelIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="保存到文件">
                <IconButton onClick={this.handleSaveFile}>
                  <SaveIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="文件列表">
                <IconButton 
                  onClick={this.handleFileMenuClick}
                  className={Boolean(fileMenuAnchor) ? 'active' : ''}
                >
                  <FolderIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="保存到历史记录「Ctrl/⌘ + S」">
                <IconButton onClick={() => this.saveEditorState(false)}>
                  <SaveAltIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="历史记录">
                <IconButton 
                  onClick={this.handleHistoryMenuClick}
                  className={Boolean(historyMenuAnchor) ? 'active' : ''}
                >
                  <HistoryIcon />
                </IconButton>
              </Tooltip>

              <Divider orientation="vertical" flexItem />

              <Tooltip title={isDiffMode ? "退出对比" : "差异对比"}>
                <IconButton 
                  onClick={this.toggleDiffMode}
                  className={isDiffMode ? 'active' : ''}
                >
                  <CompareIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="筛选">
                <IconButton
                  onClick={this.handleFilterDrawerToggle}
                  className={filterDrawerOpen ? 'active' : ''}
                >
                  <FilterIcon />
                </IconButton>
              </Tooltip>

              <Divider orientation="vertical" flexItem />

              <Tooltip title="压缩复制「Alt + C」">
                <IconButton onClick={this.handleCompressCopy}>
                  <CompressIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="压缩转义复制「Alt + \」">
                <IconButton onClick={this.handleCompressQuoteCopy}>
                  <CodeIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="增加转义「Alt + X」">
                <IconButton onClick={this.handleAddEscape}>
                  <TranslateIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="去除转义「Alt + U」">
                <IconButton onClick={this.handleRemoveEscape}>
                  <TextFieldsIcon />
                </IconButton>
              </Tooltip>
            </div>

            {/* 文件菜单 */}
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

            {/* 历史记录菜单 */}
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
                  <MenuItem 
                    key={item.id} 
                    onClick={() => this.handleHistorySelect(item)}
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      minWidth: '300px' // 设置最小宽度
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <ListItemIcon>
                        <HistoryIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={item.label || '未命名'} 
                        secondary={new Date(item.timestamp).toLocaleString()}
                      />
                    </div>
                    <IconButton 
                      size="small" 
                      onClick={(e) => this.handleHistoryDelete(item, e)}
                      sx={{ ml: 1 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </MenuItem>
                ))
              )}
            </Menu>

            {/* 消息提示 */}
            <MessageSnackbar messageData={messageData} />
          </div>
        </ThemeProvider>
      </StyledEngineProvider>
    );
  }

  // 添加错误处理方法
  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      messageData: { 
        type: 'error', 
        message: `发生误: ${error.message}` 
      }
    })
    console.error('Error:', error, errorInfo)
  }
}

export default JsonEditor 