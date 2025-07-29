/**
 * Git功能统一主题颜色配置
 * 确保整个项目中Git相关功能的颜色保持一致
 */

export const gitTheme = {
  // 主要操作按钮颜色
  primary: {
    bg: 'bg-blue-600',
    bgHover: 'hover:bg-blue-700',
    bgDark: 'dark:bg-blue-600',
    bgDarkHover: 'dark:hover:bg-blue-700',
    text: 'text-white',
    border: 'border-blue-500',
    ring: 'focus:ring-blue-500',
    // 完整的按钮样式
    button: 'bg-blue-600 hover:bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
  },

  // 次要操作按钮颜色
  secondary: {
    bg: 'bg-gray-600',
    bgHover: 'hover:bg-gray-700',
    text: 'text-white',
    ring: 'focus:ring-gray-500',
    button: 'bg-gray-600 hover:bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-gray-500'
  },

  // 危险操作按钮颜色
  danger: {
    bg: 'bg-red-600',
    bgHover: 'hover:bg-red-700',
    text: 'text-white',
    ring: 'focus:ring-red-500',
    button: 'bg-red-600 hover:bg-red-700 text-white focus:outline-none focus:ring-2 focus:ring-red-500'
  },

  // 警告操作按钮颜色
  warning: {
    bg: 'bg-orange-600',
    bgHover: 'hover:bg-orange-700',
    text: 'text-white',
    ring: 'focus:ring-orange-500',
    button: 'bg-orange-600 hover:bg-orange-700 text-white focus:outline-none focus:ring-2 focus:ring-orange-500'
  },

  // 成功操作按钮颜色
  success: {
    bg: 'bg-green-600',
    bgHover: 'hover:bg-green-700',
    text: 'text-white',
    ring: 'focus:ring-green-500',
    button: 'bg-green-600 hover:bg-green-700 text-white focus:outline-none focus:ring-2 focus:ring-green-500'
  },

  // 信息操作按钮颜色
  info: {
    bg: 'bg-blue-500',
    bgHover: 'hover:bg-blue-600',
    text: 'text-white',
    ring: 'focus:ring-blue-400',
    button: 'bg-blue-500 hover:bg-blue-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-400'
  },

  // Git文件状态颜色
  status: {
    modified: {
      bg: 'bg-yellow-100 dark:bg-yellow-900',
      text: 'text-yellow-700 dark:text-yellow-300',
      border: 'border-yellow-200 dark:border-yellow-800',
      full: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
    },
    added: {
      bg: 'bg-green-100 dark:bg-green-900',
      text: 'text-green-700 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800',
      full: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-800'
    },
    deleted: {
      bg: 'bg-red-100 dark:bg-red-900',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800',
      full: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-200 dark:border-red-800'
    },
    untracked: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-700 dark:text-gray-300',
      border: 'border-gray-300 dark:border-gray-600',
      full: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600'
    }
  },

  // 链接和交互元素颜色
  interactive: {
    link: 'text-blue-600 dark:text-blue-400',
    linkHover: 'hover:text-blue-700 dark:hover:text-blue-300',
    icon: 'text-gray-600 dark:text-gray-400',
    iconHover: 'hover:text-blue-600 dark:hover:text-blue-400',
    hover: 'hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20',
    full: 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300'
  },

  // 信息提示框颜色
  alert: {
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
      full: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
    },
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-700 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800',
      full: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
      full: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800',
      full: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
    }
  },

  // Tab导航颜色
  tab: {
    active: {
      border: 'border-blue-500',
      text: 'text-blue-600 dark:text-blue-400',
      full: 'border-blue-500 text-blue-600 dark:text-blue-400'
    },
    inactive: {
      border: 'border-transparent',
      text: 'text-gray-500 dark:text-gray-400',
      textHover: 'hover:text-gray-700 dark:hover:text-gray-300',
      full: 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
    }
  },

  // 表单输入框颜色
  input: {
    border: 'border-gray-300 dark:border-gray-600',
    bg: 'bg-white dark:bg-gray-700',
    text: 'text-gray-900 dark:text-white',
    focus: 'focus:outline-none focus:ring-blue-500 focus:border-blue-500',
    disabled: 'disabled:bg-gray-100 dark:disabled:bg-gray-700',
    full: 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500'
  },

  // 平台类型标签颜色
  platformTag: {
    bg: 'bg-blue-100 dark:bg-blue-900',
    text: 'text-blue-800 dark:text-blue-200',
    full: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  },

  // 加载状态颜色
  loading: {
    spinner: 'border-blue-500',
    text: 'text-gray-400'
  }
};

/**
 * 获取Git文件状态的完整样式类名
 * @param {string} status - 文件状态 ('M', 'A', 'D', 'U')
 * @returns {string} 完整的CSS类名
 */
export const getGitStatusStyle = (status) => {
  switch (status) {
    case 'M':
      return gitTheme.status.modified.full;
    case 'A':
      return gitTheme.status.added.full;
    case 'D':
      return gitTheme.status.deleted.full;
    case 'U':
    default:
      return gitTheme.status.untracked.full;
  }
};

/**
 * 获取按钮样式类名
 * @param {string} type - 按钮类型 ('primary', 'secondary', 'danger', 'warning', 'success')
 * @returns {string} 完整的CSS类名
 */
export const getButtonStyle = (type = 'primary') => {
  return gitTheme[type]?.button || gitTheme.primary.button;
};

/**
 * 获取提示框样式类名
 * @param {string} type - 提示框类型 ('info', 'success', 'warning', 'error')
 * @returns {string} 完整的CSS类名
 */
export const getAlertStyle = (type = 'info') => {
  return gitTheme.alert[type]?.full || gitTheme.alert.info.full;
};