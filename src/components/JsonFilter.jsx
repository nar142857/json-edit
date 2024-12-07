import React, { useState, useEffect } from 'react';
import {
  Drawer,
  TextField,
  Paper,
  Typography,
  IconButton,
  Tab,
  Tabs,
  Box
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Code as CodeIcon
} from '@mui/icons-material';

/**
 * JSON筛选器组件
 * @param {Object} props
 * @param {boolean} props.open - 抽屉是否打开
 * @param {function} props.onClose - 关闭抽屉的回调函数
 * @param {string} props.theme - 当前主题 ('dark' | 'light')
 * @param {string} props.jsonContent - 要筛选的JSON内容
 * @param {function} props.onHighlight - 高亮选中内容的回调函数
 */
const JsonFilter = ({ open, onClose, theme, jsonContent, onHighlight }) => {
  // 状态管理
  const [filterMode, setFilterMode] = useState('text'); // 'text' | 'js'
  const [filterQuery, setFilterQuery] = useState('');
  const [filterResults, setFilterResults] = useState([]);
  const [filterError, setFilterError] = useState(null);
  const [jsFilterDelayTimer, setJsFilterDelayTimer] = useState(null);

  // 处理筛选模式切换
  const handleFilterModeChange = (event, newValue) => {
    setFilterMode(newValue);
    setFilterQuery('');
    setFilterResults([]);
    setFilterError(null);
  };

  // 处理筛选查询变化
  const handleFilterQueryChange = (e) => {
    const query = e.target.value;
    setFilterQuery(query);

    // 如果是JS模式，添加延时处理
    if (filterMode === 'js') {
      if (jsFilterDelayTimer) {
        clearTimeout(jsFilterDelayTimer);
      }
      const timer = setTimeout(() => {
        executeJsFilter(query);
      }, 500);
      setJsFilterDelayTimer(timer);
    }
  };

  // 执行JS筛选
  const executeJsFilter = (jsFilter) => {
    if (!jsFilter) {
      setFilterResults([]);
      setFilterError(null);
      return;
    }

    try {
      const jsonData = JSON.parse(jsonContent);
      let result;

      // 支持两种JS筛选语法
      if (jsFilter.startsWith('.')) {
        // 对象路径语法: .key.subkey
        const path = jsFilter.split('.');
        path.shift(); // 移除第一个空元素
        result = path.reduce((obj, key) => obj?.[key], jsonData);
      } else {
        // JavaScript表达式
        const fn = new Function('data', `try { return data${jsFilter}; } catch(e) { throw e; }`);
        result = fn(jsonData);
      }

      // 格式化结果
      if (result !== undefined) {
        setFilterResults([{
          path: jsFilter,
          key: 'Result',
          value: typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)
        }]);
        setFilterError(null);
      } else {
        setFilterResults([]);
        setFilterError('未找到匹配结果');
      }
    } catch (error) {
      setFilterError(error.message);
      setFilterResults([]);
    }
  };

  // 执行文本筛选
  useEffect(() => {
    if (filterMode !== 'text' || !filterQuery) {
      return;
    }

    try {
      const jsonData = JSON.parse(jsonContent);
      const results = filterJsonData(jsonData, filterQuery);
      setFilterResults(results);
      setFilterError(null);
    } catch (error) {
      setFilterError(error.message);
      setFilterResults([]);
    }
  }, [filterQuery, jsonContent, filterMode]);

  // 递归筛选JSON数据
  const filterJsonData = (data, query) => {
    if (!query) return [];
    
    const results = [];
    const search = (obj, path = '') => {
      if (typeof obj === 'object' && obj !== null) {
        Object.entries(obj).forEach(([key, value]) => {
          const currentPath = path ? `${path}.${key}` : key;
          
          // 检查键名是否匹配
          if (key.toLowerCase().includes(query.toLowerCase())) {
            results.push({
              path: currentPath,
              key,
              value: JSON.stringify(value)
            });
          }
          
          // 检查值是否匹配
          if (typeof value === 'string' && value.toLowerCase().includes(query.toLowerCase())) {
            results.push({
              path: currentPath,
              key,
              value
            });
          }
          
          // 递归搜索嵌套对象
          if (typeof value === 'object' && value !== null) {
            search(value, currentPath);
          }
        });
      }
    };
    
    search(data);
    return results;
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      variant="persistent"
      sx={{
        width: 300,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 300,
          boxSizing: 'border-box',
          backgroundColor: theme === 'dark' ? '#1e1e1e' : '#f5f5f5',
          color: theme === 'dark' ? '#ffffff' : '#000000',
        },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 2,
          backgroundColor: 'transparent',
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: 8,
          justifyContent: 'space-between'
        }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            筛选器
          </Typography>
          <IconButton 
            onClick={onClose}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </div>

        <Tabs
          value={filterMode}
          onChange={handleFilterModeChange}
          sx={{ mb: 2 }}
        >
          <Tab 
            icon={<SearchIcon />} 
            value="text" 
            label="文本" 
            sx={{ minWidth: 140 }}
          />
          <Tab 
            icon={<CodeIcon />} 
            value="js" 
            label="JS语法" 
            sx={{ minWidth: 140 }}
          />
        </Tabs>

        <TextField
          fullWidth
          size="small"
          value={filterQuery}
          onChange={handleFilterQueryChange}
          placeholder={filterMode === 'text' ? 
            "输入关键字..." : 
            "JS语法，如: .key.subkey 或 .filter(x => x > 0)"
          }
          variant="outlined"
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
            }
          }}
        />
        
        {filterError ? (
          <Typography color="error" variant="body2" sx={{ p: 2 }}>
            {filterError}
          </Typography>
        ) : (
          <div style={{ flex: 1, overflow: 'auto' }}>
            {filterResults.map((result, index) => (
              <Paper
                key={index}
                elevation={1}
                sx={{
                  p: 1,
                  mb: 1,
                  backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: theme === 'dark' ? '#3d3d3d' : '#f0f0f0',
                  }
                }}
                onClick={() => onHighlight(result.path)}
              >
                <Typography variant="caption" color="primary" sx={{ display: 'block' }}>
                  {result.path}
                </Typography>
                <Typography variant="body2" sx={{ 
                  wordBreak: 'break-all',
                  color: theme === 'dark' ? '#cccccc' : '#666666',
                  whiteSpace: 'pre-wrap'
                }}>
                  {result.value}
                </Typography>
              </Paper>
            ))}
          </div>
        )}
      </Paper>
    </Drawer>
  );
};

export default JsonFilter; 