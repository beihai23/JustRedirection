document.addEventListener('DOMContentLoaded', function() {
    console.log('Options page loaded');
    
    // 验证storage API是否可用
    if (!chrome.storage || !chrome.storage.sync) {
        console.error('Chrome storage API not available');
        return;
    }
    
    // 检查页面元素是否存在
    const addRuleForm = document.getElementById('addRuleForm');
    const existingRules = document.getElementById('existingRules');
    
    if (!addRuleForm || !existingRules) {
        console.error('Required DOM elements not found');
        return;
    }
    
    // Load existing rules when page loads
    loadRules();
    
    // Setup form submission handler
    addRuleForm.addEventListener('submit', handleAddRule);
    
    // Setup sortable rules list
    new Sortable(existingRules, {
        animation: 150,
        onEnd: handleRuleReorder
    });
});

function loadRules() {
    console.log('Loading rules...');
    
    // 直接检查所有存储的数据
    chrome.storage.sync.get(null, function(items) {
        console.log('All storage items:', items);
        
        // 使用正确的key: filters而不是rules
        chrome.storage.sync.get(['filters'], function(result) {
            console.log('Retrieved filters:', result.filters);
            
            const filters = result.filters || [];
            const rulesList = document.getElementById('existingRules');
            const noRulesMessage = document.getElementById('noRulesMessage');
            
            if (!rulesList || !noRulesMessage) {
                console.error('Required DOM elements not found');
                return;
            }
            
            // Clear existing rules
            rulesList.innerHTML = '';
            
            if (!Array.isArray(filters) || filters.length === 0) {
                console.log('No filters found or invalid filters data');
                noRulesMessage.style.display = 'block';
                return;
            }
            
            noRulesMessage.style.display = 'none';
            
            // Add each filter to the UI
            filters.forEach((filter, index) => {
                console.log('Adding filter to UI:', filter);
                addRuleToUI(filter, index);
            });
        });
    });
}

function addRuleToUI(rule, index) {
    const template = document.getElementById('ruleTemplate');
    const ruleElement = template.content.cloneNode(true);
    
    // Set rule values
    const sourceInput = ruleElement.querySelector('.source');
    const targetInput = ruleElement.querySelector('.target');
    const toggleInput = ruleElement.querySelector('.rule-toggle');
    
    sourceInput.value = rule.pattern;
    targetInput.value = rule.destination;
    toggleInput.checked = rule.enabled !== false;
    
    // Setup event handlers
    const deleteBtn = ruleElement.querySelector('.delete-btn');
    const editBtn = ruleElement.querySelector('.edit-btn');
    const toggle = ruleElement.querySelector('.rule-toggle');
    
    // 创建确认和取消按钮（初始隐藏）
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'control-btn confirm-btn';
    confirmBtn.title = 'Confirm';
    confirmBtn.innerHTML = '✓';
    confirmBtn.style.display = 'none';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'control-btn cancel-btn';
    cancelBtn.title = 'Cancel';
    cancelBtn.innerHTML = '✕';
    cancelBtn.style.display = 'none';
    
    // 将确认和取消按钮添加到控制按钮组
    const controlsDiv = ruleElement.querySelector('.rule-controls');
    controlsDiv.insertBefore(confirmBtn, deleteBtn);
    controlsDiv.insertBefore(cancelBtn, deleteBtn);
    
    // 保存原始值，用于取消编辑时恢复
    let originalPattern = rule.pattern;
    let originalDestination = rule.destination;
    
    // 编辑按钮处理
    editBtn.addEventListener('click', () => {
        // 启用输入框编辑
        sourceInput.disabled = false;
        targetInput.disabled = false;
        
        // 切换按钮显示
        editBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
        confirmBtn.style.display = 'inline-flex';
        cancelBtn.style.display = 'inline-flex';
        
        // 添加输入框样式
        sourceInput.classList.add('editing');
        targetInput.classList.add('editing');
    });
    
    // 确认按钮处理
    confirmBtn.addEventListener('click', () => {
        const newPattern = sourceInput.value.trim();
        const newDestination = targetInput.value.trim();
        
        if (!newPattern || !newDestination) {
            alert('Please fill in both fields');
            return;
        }
        
        // 更新存储中的规则
        chrome.storage.sync.get(['filters'], function(result) {
            const filters = result.filters || [];
            filters[index] = {
                ...filters[index],
                pattern: newPattern,
                destination: newDestination
            };
            
            chrome.storage.sync.set({ filters: filters }, function() {
                // 更新UI状态
                sourceInput.disabled = true;
                targetInput.disabled = true;
                
                // 更新原始值
                originalPattern = newPattern;
                originalDestination = newDestination;
                
                // 切换按钮显示
                editBtn.style.display = 'inline-flex';
                deleteBtn.style.display = 'inline-flex';
                confirmBtn.style.display = 'none';
                cancelBtn.style.display = 'none';
                
                // 移除编辑样式
                sourceInput.classList.remove('editing');
                targetInput.classList.remove('editing');
                
                // 通知background.js更新规则
                chrome.runtime.sendMessage({type: 'updateRedirectStatus'});
            });
        });
    });
    
    // 取消按钮处理
    cancelBtn.addEventListener('click', () => {
        // 恢复原始值
        sourceInput.value = originalPattern;
        targetInput.value = originalDestination;
        
        // 禁用输入框编辑
        sourceInput.disabled = true;
        targetInput.disabled = true;
        
        // 切换按钮显示
        editBtn.style.display = 'inline-flex';
        deleteBtn.style.display = 'inline-flex';
        confirmBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        
        // 移除编辑样式
        sourceInput.classList.remove('editing');
        targetInput.classList.remove('editing');
    });
    
    // 其他事件处理器保持不变...
    deleteBtn.addEventListener('click', (e) => {
        // ... 删除按钮的处理逻辑保持不变
    });
    
    toggle.addEventListener('change', () => toggleRule(index));
    
    // Add to rules list
    document.getElementById('existingRules').appendChild(ruleElement);
}

// Add other necessary functions (handleAddRule, deleteRule, editRule, toggleRule, handleRuleReorder)
// Make sure to implement proper error handling and storage updates

function handleAddRule(event) {
    event.preventDefault();
    
    const pattern = document.getElementById('matchPattern').value.trim();
    const destination = document.getElementById('redirectTarget').value.trim();
    
    if (!pattern || !destination) {
        alert('Please fill in both fields');
        return;
    }
    
    // Create new filter object
    const newFilter = {
        pattern: pattern,
        destination: destination,
        enabled: true
    };
    
    // Add to storage using 'filters' key
    chrome.storage.sync.get(['filters'], function(result) {
        const filters = result.filters || [];
        filters.push(newFilter);
        
        chrome.storage.sync.set({ filters: filters }, function() {
            document.getElementById('addRuleForm').reset();
            loadRules();
            // 通知background.js更新规则
            chrome.runtime.sendMessage({type: 'updateRedirectStatus'});
        });
    });
}

function deleteRule(index) {
    chrome.storage.sync.get(['filters'], function(result) {
        const filters = result.filters || [];
        filters.splice(index, 1);
        
        chrome.storage.sync.set({ filters: filters }, function() {
            loadRules();
            // 通知background.js更新规则
            chrome.runtime.sendMessage({type: 'updateRedirectStatus'});
        });
    });
}

function editRule(index) {
    chrome.storage.sync.get(['filters'], function(result) {
        const filters = result.filters || [];
        const filter = filters[index];
        
        document.getElementById('matchPattern').value = filter.pattern;
        document.getElementById('redirectTarget').value = filter.destination;
        
        filters.splice(index, 1);
        
        chrome.storage.sync.set({ filters: filters }, function() {
            loadRules();
            // 通知background.js更新规则
            chrome.runtime.sendMessage({type: 'updateRedirectStatus'});
        });
    });
}

function toggleRule(index) {
    chrome.storage.sync.get(['filters'], function(result) {
        const filters = result.filters || [];
        filters[index].enabled = !filters[index].enabled;
        
        chrome.storage.sync.set({ filters: filters }, function() {
            // 通知background.js更新规则
            chrome.runtime.sendMessage({type: 'updateRedirectStatus'});
        });
    });
}

function handleRuleReorder(event) {
    chrome.storage.sync.get(['filters'], function(result) {
        const filters = result.filters || [];
        const filter = filters.splice(event.oldIndex, 1)[0];
        filters.splice(event.newIndex, 0, filter);
        
        chrome.storage.sync.set({ filters: filters }, function() {
            // 通知background.js更新规则
            chrome.runtime.sendMessage({type: 'updateRedirectStatus'});
        });
    });
}