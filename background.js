// 用于将存储的过滤器规则转换为 declarativeNetRequest 规则
function convertFilterToRule(filter, index) {
  // 使用一个足够大的基数来确保 ID 唯一，同时保持为整数
  const uniqueId = (index + 1) * 100000 + Math.floor(Math.random() * 99999);
  
  return {
    id: uniqueId,
    priority: 1,
    action: {
      type: "redirect",
      redirect: {
        regexSubstitution: filter.destination + "\\1"
      }
    },
    condition: {
      regexFilter: "^" + escapeRegExp(filter.pattern) + "(.*)",
      resourceTypes: ["xmlhttprequest", "main_frame", "sub_frame", "script", "stylesheet", "image"]
    }
  };
}

// 用于转义正则表达式中的特殊字符
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 更新插件图标
async function updateExtensionIcon(enabled) {
  console.log('Updating icon to:', enabled ? 'enabled' : 'disabled');
  try {
    // 使用完整的图标集合
    await chrome.action.setIcon({
      path: enabled ? {
        "16": "images/icon16.png",
        "48": "images/icon48.png",
        "128": "images/icon128.png"
      } : {
        "16": "images/icon16off.png",
        "48": "images/icon48.png",
        "128": "images/icon128.png"
      }
    });
    
    // 更新图标的标题
    await chrome.action.setTitle({
      title: enabled ? "Redirect Enabled" : "Redirect Disabled"
    });
    
    // 更新图标的徽章
    await chrome.action.setBadgeText({
      text: enabled ? "ON" : "OFF"
    });
    
    // 设置徽章的背景色
    await chrome.action.setBadgeBackgroundColor({
      color: enabled ? "#4CAF50" : "#999999"
    });
    
    console.log('Icon update completed');
  } catch (error) {
    console.error('Error updating extension icon:', error);
  }
}

// 更新动态规则
async function updateDynamicRules() {
  try {
    const data = await chrome.storage.sync.get(['redirectEnabled', 'filters']);
    const enabled = data.redirectEnabled || false;
    const filters = data.filters || [];
    
    // 更新图标状态
    await updateExtensionIcon(enabled);
    console.log('Icon updated:', enabled ? 'enabled' : 'disabled'); // 添加调试日志
    
    // 如果总开关关闭，清除所有规则和命中计数
    if (!enabled) {
      const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: currentRules.map(rule => rule.id)
      });
      await chrome.storage.sync.set({ ruleHits: {} });
      return;
    }

    // 获取当前的规则
    const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
    
    // 创建新规则
    const newRules = filters
      .filter(filter => filter.enabled)
      .map((filter, index) => convertFilterToRule(filter, index));

    console.log('New rules:', newRules); // 调试日志

    // 更新规则
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: currentRules.map(rule => rule.id),
      addRules: newRules
    });

    // 更新规则 ID 映射
    const ruleIdMap = {};
    newRules.forEach((rule, index) => {
      ruleIdMap[index + 1] = rule.id;
    });
    await chrome.storage.sync.set({ ruleIdMap: ruleIdMap });
  } catch (error) {
    console.error('Error updating dynamic rules:', error);
    // 打印更详细的错误信息
    if (error.message) {
      console.error('Error message:', error.message);
    }
    if (error.stack) {
      console.error('Error stack:', error.stack);
    }
  }
}

// 确保在插件启动时更新图标
chrome.runtime.onStartup.addListener(async () => {
  console.log('Browser started'); // 调试日志
  const data = await chrome.storage.sync.get(['redirectEnabled']);
  const enabled = data.redirectEnabled || false;
  console.log('Initial redirect status:', enabled); // 调试日志
  await updateExtensionIcon(enabled);
});

// 在插件安装或更新时更新图标
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension installed/updated'); // 调试日志
  const data = await chrome.storage.sync.get(['redirectEnabled']);
  const enabled = data.redirectEnabled || false;
  console.log('Initial redirect status:', enabled); // 调试日志
  await updateExtensionIcon(enabled);
});

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'updateRedirectStatus') {
    updateDynamicRules();
  }
});

// 监听存储变化，专门处理开关状态的变化
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.redirectEnabled) {
    console.log('Redirect status changed:', changes.redirectEnabled.newValue); // 调试日志
    updateExtensionIcon(changes.redirectEnabled.newValue);
  }
});

// 初始化时更新规则
updateDynamicRules();

// 监听重定向完成的事件
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(async (info) => {
  const { request, rule } = info;
  
  try {
    // 获取规则 ID 映射和当前计数
    const data = await chrome.storage.sync.get(['ruleHits', 'ruleIdMap']);
    const ruleHits = data.ruleHits || {};
    const ruleIdMap = data.ruleIdMap || {};
    
    // 找到原始的规则索引
    const originalIndex = Object.entries(ruleIdMap)
      .find(([index, id]) => id === rule.id)?.[0];
    
    if (originalIndex) {
      ruleHits[originalIndex] = (ruleHits[originalIndex] || 0) + 1;
      await chrome.storage.sync.set({ ruleHits: ruleHits });
      console.log('Hit count saved for rule index:', originalIndex);
    }
  } catch (error) {
    console.error('Error updating hit count:', error);
  }
});