// 用于将存储的过滤器规则转换为 declarativeNetRequest 规则
function convertFilterToRule(filter, id) {
  // 对于前缀匹配，我们需要构造一个替换规则
  // 例如：
  // pattern: https://testtaskonbackend.taskon.xyz
  // destination: http://127.0.0.1:8080
  // 当URL为 https://testtaskonbackend.taskon.xyz/boost/v1/submitBoostQuest
  // 应该替换为 http://127.0.0.1:8080/boost/v1/submitBoostQuest
  return {
    id: id,
    priority: 1,
    action: {
      type: "redirect",
      redirect: {
        // 使用 regexSubstitution 来实现部分替换
        // $1 会被替换为正则表达式第一个捕获组匹配的内容
        regexSubstitution: filter.destination + "\\1"
      }
    },
    condition: {
      // 将前缀匹配转换为正则表达式
      // 例如 "https://testtaskonbackend.taskon.xyz" 
      // 转换为 "^https://testtaskonbackend\.taskon\.xyz(.*)"
      regexFilter: "^" + escapeRegExp(filter.pattern) + "(.*)",
      resourceTypes: ["xmlhttprequest", "main_frame", "sub_frame", "script", "stylesheet", "image"]
    }
  };
}

// 用于转义正则表达式中的特殊字符
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 更新动态规则
async function updateDynamicRules() {
  try {
    const data = await chrome.storage.sync.get(['redirectEnabled', 'filters']);
    const enabled = data.redirectEnabled || false;
    const filters = data.filters || [];
    
    // 如果总开关关闭，清除所有规则
    if (!enabled) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: (await chrome.declarativeNetRequest.getDynamicRules()).map(rule => rule.id)
      });
      return;
    }

    // 获取当前的规则
    const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
    const currentRuleIds = currentRules.map(rule => rule.id);

    // 创建新规则
    const newRules = filters
      .filter(filter => filter.enabled)
      .map((filter, index) => convertFilterToRule(filter, index + 1));

    // 更新规则
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: currentRuleIds,
      addRules: newRules
    });
  } catch (error) {
    console.error('Error updating dynamic rules:', error);
  }
}

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'updateRedirectStatus') {
    updateDynamicRules();
  }
});

// 监听存储变化
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && (changes.filters || changes.redirectEnabled)) {
    updateDynamicRules();
  }
});

// 初始化时更新规则
updateDynamicRules();

// 监听重定向完成的事件
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
  const { request, rule } = info;
  
  chrome.storage.sync.get(['filters'], (data) => {
    const filters = data.filters || [];
    const matchedFilter = filters[rule.id - 1];
    
    if (matchedFilter) {
      const log = {
        timestamp: Date.now(),
        ruleName: matchedFilter.name || `Rule ${rule.id}`,
        url: request.url
      };

      // 保存日志
      chrome.storage.local.get(['redirectLogs'], (data) => {
        const logs = data.redirectLogs || [];
        logs.unshift(log);
        // 只保留最近 100 条记录
        if (logs.length > 100) {
          logs.length = 100;
        }
        chrome.storage.local.set({ redirectLogs: logs });
      });

      // 通知 popup 更新日志
      chrome.runtime.sendMessage({
        type: 'newRedirectLog',
        log: log
      });
    }
  });
});