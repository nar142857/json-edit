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

      // 创建新的模型
      const newOriginalModel = monaco.editor.createModel(original || '', language);
      const newModifiedModel = monaco.editor.createModel(modified || '', language);

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
            const changes = e.changes[0];
            const text = changes.text;
            const isNewLine = text.includes('\n') || text.includes('\r\n');
            
            let position;
            if (isNewLine) {
              position = {
                lineNumber: changes.range.endLineNumber + 1,
                column: 1
              };
            } else if (changes.text === '') {
              // 处理回撤操作
              position = {
                lineNumber: changes.range.startLineNumber,
                column: changes.range.startColumn
              };
            } else {
              position = {
                lineNumber: changes.range.endLineNumber,
                column: changes.range.endColumn + changes.text.length
              };
            }
            
            setLastPosition(position);
            setActiveEditor('original');
            onOriginalValueChange(newOriginalModel.getValue());
          }
        })
      );

      disposablesRef.current.push(
        newModifiedModel.onDidChangeContent((e) => {
          if (onModifiedValueChange) {
            const changes = e.changes[0];
            const text = changes.text;
            const isNewLine = text.includes('\n') || text.includes('\r\n');
            
            let position;
            if (isNewLine) {
              position = {
                lineNumber: changes.range.endLineNumber + 1,
                column: 1
              };
            } else if (changes.text === '') {
              // 处理回撤操作
              position = {
                lineNumber: changes.range.startLineNumber,
                column: changes.range.startColumn
              };
            } else {
              position = {
                lineNumber: changes.range.endLineNumber,
                column: changes.range.endColumn + changes.text.length
              };
            }
            
            setLastPosition(position);
            setActiveEditor('modified');
            onModifiedValueChange(newModifiedModel.getValue());
          }
        })
      );

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