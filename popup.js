document.addEventListener('DOMContentLoaded', function() {
  const masterSwitch = document.getElementById('masterSwitch');
  const activeRulesList = document.getElementById('activeRules');
  const openOptionsButton = document.getElementById('openOptions');
  let refreshInterval;

  // 加载主开关状态和活跃规则
  async function initialize() {
    try {
      // 加载主开关状态
      const switchData = await chrome.storage.sync.get(['redirectEnabled']);
      masterSwitch.checked = switchData.redirectEnabled || false;

      // 加载活跃规则
      await loadActiveRules();

      // 设置定时刷新
      startAutoRefresh();
    } catch (error) {
      console.error('Error initializing popup:', error);
    }
  }

  // 开始自动刷新
  function startAutoRefresh() {
    // 清除可能存在的旧定时器
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
    // 每秒刷新一次规则列表
    refreshInterval = setInterval(loadActiveRules, 1000);
  }

  // 停止自动刷新
  function stopAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  // 当popup关闭时停止刷新
  window.addEventListener('unload', stopAutoRefresh);

  // 立即执行初始化
  initialize();

  // 监听主开关变化
  masterSwitch.addEventListener('change', async function() {
    const enabled = masterSwitch.checked;
    try {
      await chrome.storage.sync.set({ redirectEnabled: enabled });
      // 通知background.js更新规则状态
      await chrome.runtime.sendMessage({
        type: 'updateRedirectStatus',
        enabled: enabled
      });
      // 重新加载规则列表
      await loadActiveRules();
    } catch (error) {
      console.error('Error updating redirect status:', error);
    }
  });

  // 打开选项页
  openOptionsButton.addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });
});

// 加载活跃规则
async function loadActiveRules() {
  try {
    const data = await chrome.storage.sync.get(['filters', 'ruleHits']);
    const filters = data.filters || [];
    const ruleHits = data.ruleHits || {};
    const activeRulesList = document.getElementById('activeRules');
    
    // 清空现有规则列表
    activeRulesList.innerHTML = '';
    
    // 过滤出启用的规则并显示
    const enabledFilters = filters.filter(filter => filter.enabled);
    
    if (enabledFilters.length === 0) {
      const li = document.createElement('li');
      li.className = 'rule-item';
      li.textContent = 'no active rules';
      activeRulesList.appendChild(li);
      return;
    }

    enabledFilters.forEach((filter, index) => {
      const li = document.createElement('li');
      li.className = 'rule-item';
      
      const ruleContent = document.createElement('div');
      ruleContent.className = 'rule-content';
      
      const urlBlock = document.createElement('div');
      urlBlock.className = 'url-block';
      
      const sourceUrl = document.createElement('div');
      sourceUrl.className = 'source-url';
      sourceUrl.textContent = filter.pattern;
      
      const arrow = document.createElement('div');
      arrow.className = 'arrow';
      arrow.textContent = '➔';
      
      const targetUrl = document.createElement('div');
      targetUrl.className = 'target-url';
      targetUrl.textContent = filter.destination;
      
      const hitCount = document.createElement('span');
      hitCount.className = 'hit-count';
      hitCount.textContent = ruleHits[index + 1] || 0;
      
      urlBlock.appendChild(sourceUrl);
      urlBlock.appendChild(arrow);
      urlBlock.appendChild(targetUrl);
      ruleContent.appendChild(urlBlock);
      ruleContent.appendChild(hitCount);
      li.appendChild(ruleContent);
      
      activeRulesList.appendChild(li);
    });
  } catch (error) {
    console.error('Error loading active rules:', error);
  }
} 