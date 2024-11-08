document.addEventListener('DOMContentLoaded', function() {
  const masterSwitch = document.getElementById('masterSwitch');
  const activeRulesList = document.getElementById('activeRules');
  const settingsIcon = document.querySelector('.settings-icon');

  // 加载主开关状态和活跃规则
  async function initialize() {
    try {
      const switchData = await chrome.storage.sync.get(['redirectEnabled']);
      masterSwitch.checked = switchData.redirectEnabled || false;
      await loadActiveRules();
    } catch (error) {
      console.error('Error initializing popup:', error);
    }
  }

  initialize();

  masterSwitch.addEventListener('change', async function() {
    try {
      const enabled = masterSwitch.checked;
      await chrome.storage.sync.set({ redirectEnabled: enabled });
      await chrome.runtime.sendMessage({ type: 'updateRedirectStatus' });
      await loadActiveRules();
    } catch (error) {
      console.error('Error updating redirect status:', error);
    }
  });

  settingsIcon.addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });
});

async function loadActiveRules() {
  try {
    const data = await chrome.storage.sync.get(['filters']);
    const activeRulesList = document.getElementById('activeRules');
    activeRulesList.innerHTML = '';
    
    const filters = data.filters || [];
    const activeFilters = filters.filter(filter => filter.enabled);
    
    if (activeFilters.length === 0) {
      activeRulesList.innerHTML = '<li class="rule-item no-rules">No active rules</li>';
      return;
    }

    activeFilters.forEach(filter => {
      const li = document.createElement('li');
      li.className = 'rule-item';
      li.innerHTML = `
        <div class="url-block">
          <div class="source-url">${filter.pattern}</div>
          <div class="arrow">➔</div>
          <div class="target-url">${filter.destination}</div>
        </div>
      `;
      activeRulesList.appendChild(li);
    });
  } catch (error) {
    console.error('Error loading active rules:', error);
  }
}

// 监听存储变化
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && (changes.filters || changes.redirectEnabled)) {
    loadActiveRules();
  }
}); 