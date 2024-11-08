let rulesContainer;
let addRuleForm;

document.addEventListener('DOMContentLoaded', function() {
    rulesContainer = document.getElementById('existingRules');
    addRuleForm = document.getElementById('addRuleForm');
    
    if (!rulesContainer || !addRuleForm) {
        console.error('Required DOM elements not found:', {
            rulesContainer: !!rulesContainer,
            addRuleForm: !!addRuleForm
        });
        return;
    }

    console.log('DOM elements initialized successfully');
    
    initializeSortable();
    
    loadConfiguration();
    
    addRuleForm.addEventListener('submit', function(e) {
        console.log('Form submitted');
        handleAddRule(e);
    });
});

function initializeSortable() {
    console.log('Initializing Sortable...');
    new Sortable(rulesContainer, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: function() {
            updateFiltersInStorage();
        }
    });
}

function addRuleToUI(filter) {
    console.log('Adding rule to UI:', filter);
    const ruleElement = document.createElement('li');
    ruleElement.className = `rule-item ${filter.enabled ? '' : 'disabled'}`;
    ruleElement.dataset.id = filter.id;
    
    ruleElement.innerHTML = `
        <div class="drag-handle">⋮⋮</div>
        <div class="rule-content">
            <input type="text" class="url-box source" value="${filter.pattern}" disabled>
            <span class="arrow">➔</span>
            <input type="text" class="url-box destination" value="${filter.destination}" disabled>
            <div class="rule-controls">
                <label class="switch">
                    <input type="checkbox" class="rule-toggle" ${filter.enabled ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
                <button class="edit-btn" title="Edit Rule">✎</button>
                <button class="delete-btn" title="Delete Rule">×</button>
            </div>
        </div>
    `;

    attachRuleEventListeners(ruleElement, filter);
    
    rulesContainer.appendChild(ruleElement);
}

function attachRuleEventListeners(ruleElement, filter) {
    const toggle = ruleElement.querySelector('.rule-toggle');
    const deleteBtn = ruleElement.querySelector('.delete-btn');
    const editBtn = ruleElement.querySelector('.edit-btn');
    const sourceInput = ruleElement.querySelector('.source');
    const destinationInput = ruleElement.querySelector('.destination');
    
    toggle.addEventListener('change', () => {
        filter.enabled = toggle.checked;
        ruleElement.classList.toggle('disabled', !filter.enabled);
        updateFiltersInStorage();
    });
    
    deleteBtn.addEventListener('click', () => {
        showDeleteConfirmation(ruleElement, filter);
    });
    
    editBtn.addEventListener('click', () => {
        const isEditing = editBtn.textContent === '✓';
        if (isEditing) {
            filter.pattern = sourceInput.value.trim();
            filter.destination = destinationInput.value.trim();
            sourceInput.value = filter.pattern;
            destinationInput.value = filter.destination;
            sourceInput.disabled = true;
            destinationInput.disabled = true;
            editBtn.textContent = '✎';
            editBtn.title = 'Edit Rule';
            updateFiltersInStorage();
        } else {
            sourceInput.disabled = false;
            destinationInput.disabled = false;
            editBtn.textContent = '✓';
            editBtn.title = 'Save Rule';
        }
    });
}

function showDeleteConfirmation(ruleElement, filter) {
    const bubble = document.createElement('div');
    bubble.className = 'confirmation-bubble';
    bubble.innerHTML = `
        <p>Are you sure you want to delete this rule?</p>
        <button class="confirm-yes">Yes</button>
        <button class="confirm-no">No</button>
    `;
    
    ruleElement.appendChild(bubble);
    
    bubble.querySelector('.confirm-yes').addEventListener('click', () => {
        ruleElement.remove();
        updateFiltersInStorage();
    });
    
    bubble.querySelector('.confirm-no').addEventListener('click', () => {
        bubble.remove();
    });
}

function updateFiltersInStorage() {
    const filters = Array.from(rulesContainer.children).map((li, index) => ({
        id: li.dataset.id,
        pattern: li.querySelector('.source').value.trim(),
        destination: li.querySelector('.destination').value.trim(),
        type: 'prefix',
        enabled: li.querySelector('.rule-toggle').checked,
        order: index,
        priority: index + 1
    }));
    
    console.log('Updating filters in storage:', filters);
    
    chrome.storage.sync.set({ filters: filters }, function() {
        if (chrome.runtime.lastError) {
            console.error('Error saving filters:', chrome.runtime.lastError);
            return;
        }
        
        chrome.runtime.sendMessage({ type: 'updateRedirectStatus' });
    });
}

function getNextOrder() {
    return rulesContainer.children.length;
}

function handleAddRule(e) {
    e.preventDefault();
    console.log('Handling add rule...');
    
    if (!addRuleForm) {
        console.error('Form element not found');
        return;
    }

    const formData = new FormData(e.target);
    const newFilter = {
        id: Date.now().toString(),
        pattern: formData.get('pattern').trim(),
        destination: formData.get('destination').trim(),
        type: 'prefix',
        enabled: true,
        order: getNextOrder(),
        priority: getNextOrder() + 1
    };
    
    console.log('New filter created:', newFilter);

    chrome.storage.sync.get(['filters'], function(data) {
        console.log('Current filters:', data.filters);
        const filters = data.filters || [];
        filters.push(newFilter);
        
        console.log('Saving filters:', filters);
        
        chrome.storage.sync.set({ filters: filters }, function() {
            if (chrome.runtime.lastError) {
                console.error('Error saving filters:', chrome.runtime.lastError);
                return;
            }
            
            console.log('Filters saved successfully');
            
            e.target.reset();
            
            loadConfiguration();
            
            showSuccessMessage();
            
            chrome.runtime.sendMessage({ type: 'updateRedirectStatus' });
        });
    });
}

function loadConfiguration() {
    console.log('Loading configuration...');
    
    if (!rulesContainer) {
        console.error('Rules container element not found');
        return;
    }

    chrome.storage.sync.get(['filters'], function(data) {
        console.log('Loaded filters:', data.filters);
        
        const filters = data.filters || [];
        
        rulesContainer.innerHTML = '';
        
        if (filters.length === 0) {
            console.log('No filters found');
            rulesContainer.innerHTML = '<li class="no-rules">No rules yet</li>';
            return;
        }
        
        filters.sort((a, b) => a.order - b.order)
              .forEach(filter => {
                  console.log('Adding filter to UI:', filter);
                  addRuleToUI(filter);
              });
              
        console.log('UI updated with filters');
    });
}

function showSuccessMessage() {
    const successMsg = document.createElement('div');
    successMsg.className = 'success-message';
    successMsg.textContent = 'Rule added successfully!';
    addRuleForm.appendChild(successMsg);
    setTimeout(() => successMsg.remove(), 2000);
}

// ... 其他代码保持不变 ...