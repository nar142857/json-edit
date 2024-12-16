import React, { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';

const DiffEditor = ({ 
  originalValue, 
  modifiedValue, 
  language = 'json', 
  theme = 'vs-dark', 
  height = '600px', 
  onOriginalValueChange,
  onModifiedValueChange 
}) => {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const originalModelRef = useRef(null);
  const modifiedModelRef = useRef(null);
  const disposablesRef = useRef([]);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [activeEditor, setActiveEditor] = useState(null);
  const [lastPosition, setLastPosition] = useState(null);

  // 清理所有资源
  const disposeAll = () => {
    disposablesRef.current.forEach(disposable => {
      try {
        disposable?.dispose();
      } catch (error) {
        console.error('Error disposing listener:', error);
      }
    });
    disposablesRef.current = [];

    try {
      originalModelRef.current?.dispose();
      modifiedModelRef.current?.dispose();
      editorRef.current?.dispose();
    } catch (error) {
      console.error('Error disposing editor:', error);
    }

    originalModelRef.current = null;
    modifiedModelRef.current = null;
    editorRef.current = null;
  };

  // 更新差异对比
  const updateDiffContent = (original, modified) => {
    if (!isEditorReady || !editorRef.current) return;

    try {
      const originalEditor = editorRef.current.getOriginalEditor();
      const modifiedEditor = editorRef.current.getModifiedEditor();
      
      if (!originalEditor || !modifiedEditor) return;

      // 尝试格式化内容
      const formatJsonContent = (content) => {
        try {
          // 检查是否为标准JSON
          const trimmedContent = content.trim();
          if (
            (trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) ||
            (trimmedContent.startsWith('[') && trimmedContent.endsWith(']'))
          ) {
            try {
              // 尝试解析和格式化JSON
              const parsed = JSON.parse(trimmedContent);
              return JSON.stringify(parsed, null, 2);
            } catch (e) {
              // 解析失败，返回原内容
              return content;
            }
          }
          return content;
        } catch (e) {
          return content;
        }
      };

      // 格式化原始内容和修改后的内容
      const formattedOriginal = formatJsonContent(original || '');
      const formattedModified = formatJsonContent(modified || '');

      // 创建新的模型
      const newOriginalModel = monaco.editor.createModel(formattedOriginal, language);
      const newModifiedModel = monaco.editor.createModel(formattedModified, language);

      // 清理旧的监听器和模型
      disposablesRef.current.forEach(d => d?.dispose());
      disposablesRef.current = [];
      originalModelRef.current?.dispose();
      modifiedModelRef.current?.dispose();

      // 更新模型引用
      originalModelRef.current = newOriginalModel;
      modifiedModelRef.current = newModifiedModel;

      // 设置新模型
      editorRef.current.setModel({
        original: newOriginalModel,
        modified: newModifiedModel
      });

      // 恢复光标位置和焦点
      if (lastPosition && activeEditor) {
        const editor = activeEditor === 'original' ? originalEditor : modifiedEditor;
        editor.setPosition(lastPosition);
        editor.revealPositionInCenter(lastPosition);
        editor.focus();
      }

      // 添加内容变化监听器
      disposablesRef.current.push(
        newOriginalModel.onDidChangeContent((e) => {
          if (onOriginalValueChange) {
            const content = newOriginalModel.getValue();
            // 尝试格式化新内容
            const formattedContent = formatJsonContent(content);
            
            // 如果内容相同，不进行更新避免无限循环
            if (formattedContent === content) {
              const changes = e.changes[0];
              updateCursorPosition(changes, 'original');
              onOriginalValueChange(content);
              return;
            }

            // 使用 setTimeout 延迟更新，避免差异计算时的竞态条件
            setTimeout(() => {
              try {
                // 如果编辑器已经被销毁，直接返回
                if (!editorRef.current) return;
                
                const currentContent = newOriginalModel.getValue();
                // 再次检查内容是否已经改变，避免重复更新
                if (currentContent !== formattedContent) {
                  newOriginalModel.setValue(formattedContent);
                  // 更新后重新设置光标位置
                  const editor = editorRef.current.getOriginalEditor();
                  if (editor && lastPosition) {
                    editor.setPosition(lastPosition);
                    editor.revealPositionInCenter(lastPosition);
                  }
                }
                onOriginalValueChange(formattedContent);
              } catch (error) {
                console.error('Error updating original content:', error);
              }
            }, 0);
          }
        })
      );

      disposablesRef.current.push(
        newModifiedModel.onDidChangeContent((e) => {
          if (onModifiedValueChange) {
            const content = newModifiedModel.getValue();
            // 尝试格式化新内容
            const formattedContent = formatJsonContent(content);
            
            // 如果内容相同，不进行更新避免无限循环
            if (formattedContent === content) {
              const changes = e.changes[0];
              updateCursorPosition(changes, 'modified');
              onModifiedValueChange(content);
              return;
            }

            // 使用 setTimeout 延迟更新，避免差异计算时的竞态条件
            setTimeout(() => {
              try {
                // 如果编辑器已经被销毁，直接返回
                if (!editorRef.current) return;
                
                const currentContent = newModifiedModel.getValue();
                // 再次检查内容是否已经改变，避免重复更新
                if (currentContent !== formattedContent) {
                  newModifiedModel.setValue(formattedContent);
                  // 更新后重新设置光标位置
                  const editor = editorRef.current.getModifiedEditor();
                  if (editor && lastPosition) {
                    editor.setPosition(lastPosition);
                    editor.revealPositionInCenter(lastPosition);
                  }
                }
                onModifiedValueChange(formattedContent);
              } catch (error) {
                console.error('Error updating modified content:', error);
              }
            }, 0);
          }
        })
      );

      // 辅助函数：更新光标位置
      const updateCursorPosition = (changes, editorType) => {
        const text = changes.text;
        const isNewLine = text.includes('\n') || text.includes('\r\n');
        
        let position;
        if (isNewLine) {
          position = {
            lineNumber: changes.range.endLineNumber + 1,
            column: 1
          };
        } else if (text === '') {
          position = {
            lineNumber: changes.range.startLineNumber,
            column: changes.range.startColumn
          };
        } else {
          position = {
            lineNumber: changes.range.endLineNumber,
            column: changes.range.endColumn + text.length
          };
        }
        
        setLastPosition(position);
        setActiveEditor(editorType);
      };

      // 添加焦点监听器
      disposablesRef.current.push(
        originalEditor.onDidFocusEditorText(() => {
          setActiveEditor('original');
          const position = originalEditor.getPosition();
          if (position) {
            setLastPosition(position);
          }
        })
      );

      disposablesRef.current.push(
        modifiedEditor.onDidFocusEditorText(() => {
          setActiveEditor('modified');
          const position = modifiedEditor.getPosition();
          if (position) {
            setLastPosition(position);
          }
        })
      );
    } catch (error) {
      console.error('Error updating diff content:', error);
    }
  };

  // 初始化编辑器
  const initializeEditor = () => {
    if (!containerRef.current || editorRef.current) return;

    try {
      editorRef.current = monaco.editor.createDiffEditor(containerRef.current, {
        theme,
        automaticLayout: true,
        readOnly: false,
        renderSideBySide: true,
        enableSplitViewResizing: true,
        originalEditable: true,
        modifiedEditable: true,
        scrollBeyondLastLine: false,
        minimap: { enabled: false },
        renderOverviewRuler: true,
        renderIndicators: true,
        ignoreTrimWhitespace: false,
        diffWordWrap: 'on'
      });

      // 设置两侧编辑器的内容和语言
      originalModelRef.current = monaco.editor.createModel(originalValue || '', language);
      modifiedModelRef.current = monaco.editor.createModel(modifiedValue || '', language);
      
      editorRef.current.setModel({
        original: originalModelRef.current,
        modified: modifiedModelRef.current
      });

      // 配置编辑器选项
      const editorOptions = {
        readOnly: false,
        contextmenu: true,
        lineNumbers: 'on',
        folding: true,
        formatOnPaste: true,
        formatOnType: true,
        preserveViewState: true,
        renderWhitespace: 'all',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        fontSize: 14,
        tabSize: 2,
        diffWordWrap: 'on'
      };

      const originalEditor = editorRef.current.getOriginalEditor();
      const modifiedEditor = editorRef.current.getModifiedEditor();

      if (originalEditor && modifiedEditor) {
        originalEditor.updateOptions(editorOptions);
        modifiedEditor.updateOptions(editorOptions);
      }

      setIsEditorReady(true);
    } catch (error) {
      console.error('Error initializing editor:', error);
      setIsEditorReady(false);
    }
  };

  // 初始化编辑器
  useEffect(() => {
    const initTimer = setTimeout(initializeEditor, 0);
    return () => {
      clearTimeout(initTimer);
      disposeAll();
      setIsEditorReady(false);
    };
  }, []);

  // 当内容变化时更新编辑器
  useEffect(() => {
    if (isEditorReady) {
      const updateTimer = setTimeout(() => {
        updateDiffContent(originalValue, modifiedValue);
      }, 0);
      return () => clearTimeout(updateTimer);
    }
  }, [originalValue, modifiedValue, isEditorReady]);

  // 当活动编辑器或光标位置变化时更新
  useEffect(() => {
    if (isEditorReady && activeEditor && lastPosition) {
      const editor = activeEditor === 'original' 
        ? editorRef.current?.getOriginalEditor() 
        : editorRef.current?.getModifiedEditor();

      if (editor) {
        editor.setPosition(lastPosition);
        editor.revealPositionInCenter(lastPosition);
        editor.focus();
      }
    }
  }, [activeEditor, lastPosition, isEditorReady]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: height,
        opacity: isEditorReady ? 1 : 0
      }}
    />
  );
};

export default DiffEditor; 