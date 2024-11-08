document.addEventListener('DOMContentLoaded', function() {
  const masterSwitch = document.getElementById('masterSwitch');
  const activeRulesList = document.getElementById('activeRules');
  const openOptionsButton = document.getElementById('openOptions');

  // 加载主开关状态和活跃规则
  async function initialize() {
    try {
      // 加载主开关状态
      const switchData = await chrome.storage.sync.get(['redirectEnabled']);
      masterSwitch.checked = switchData.redirectEnabled || false;

      // 加载活跃规则
      await loadActiveRules(activeRulesList);
    } catch (error) {
      console.error('Error initializing popup:', error);
    }
  }

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
      await loadActiveRules(activeRulesList);
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
async function loadActiveRules(activeRulesList) {
  try {
    const data = await chrome.storage.sync.get(['filters']);
    const filters = data.filters || [];
    
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
      
      urlBlock.appendChild(sourceUrl);
      urlBlock.appendChild(arrow);
      urlBlock.appendChild(targetUrl);
      ruleContent.appendChild(urlBlock);
      li.appendChild(ruleContent);
      
      activeRulesList.appendChild(li);
    });
  } catch (error) {
    console.error('Error loading active rules:', error);
  }
} 