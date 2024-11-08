document.addEventListener('DOMContentLoaded', function() {
  const masterSwitch = document.getElementById('masterSwitch');
  const activeRulesList = document.getElementById('activeRules');
  const redirectLogsList = document.getElementById('redirectLogs');
  const clearLogsButton = document.getElementById('clearLogs');
  const openOptionsButton = document.getElementById('openOptions');

  // 加载主开关状态
  chrome.storage.sync.get(['redirectEnabled'], function(data) {
    masterSwitch.checked = data.redirectEnabled || false;
  });

  // 加载活跃规则
  loadActiveRules();

  // 加载重定向日志
  loadRedirectLogs();

  // 监听主开关变化
  masterSwitch.addEventListener('change', function() {
    const enabled = masterSwitch.checked;
    chrome.storage.sync.set({ redirectEnabled: enabled });
    
    // 通知background.js更新规则状态
    chrome.runtime.sendMessage({
      type: 'updateRedirectStatus',
      enabled: enabled
    });
  });

  // 清除日志
  clearLogsButton.addEventListener('click', function() {
    chrome.storage.local.set({ redirectLogs: [] }, function() {
      redirectLogsList.innerHTML = '';
    });
  });

  // 打开选项页
  openOptionsButton.addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });

  // 监听来自background的日志更新
  chrome.runtime.onMessage.addListener(function(message) {
    if (message.type === 'newRedirectLog') {
      addLogToList(message.log);
    }
  });

  function loadActiveRules() {
    chrome.storage.sync.get(['filters'], function(data) {
      const filters = data.filters || [];
      activeRulesList.innerHTML = '';
      
      filters.filter(filter => filter.enabled).forEach(filter => {
        const li = document.createElement('li');
        li.className = 'rule-item';
        li.innerHTML = `
          <div class="rule-content">
            <span class="pattern">${filter.pattern}</span>
            <span class="arrow">➔</span>
            <span class="destination">${filter.destination}</span>
          </div>
        `;
        activeRulesList.appendChild(li);
      });

      if (filters.filter(f => f.enabled).length === 0) {
        const li = document.createElement('li');
        li.className = 'rule-item';
        li.textContent = 'no active rules';
        activeRulesList.appendChild(li);
      }
    });
  }

  function loadRedirectLogs() {
    chrome.storage.local.get(['redirectLogs'], function(data) {
      const logs = data.redirectLogs || [];
      redirectLogsList.innerHTML = '';
      
      logs.slice(-50).forEach(addLogToList); // 只显示最近50条记录
    });
  }

  function addLogToList(log) {
    const li = document.createElement('li');
    li.className = 'log-item';
    li.innerHTML = `
      <span class="timestamp">${new Date(log.timestamp).toLocaleTimeString()}</span>
      <span class="rule-name">${log.ruleName}</span>
      <span class="url">${log.url}</span>
    `;
    redirectLogsList.insertBefore(li, redirectLogsList.firstChild);

    // 保持列表不要太长
    if (redirectLogsList.children.length > 50) {
      redirectLogsList.lastChild.remove();
    }
  }
}); 