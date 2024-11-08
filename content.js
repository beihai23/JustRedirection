document.addEventListener('DOMContentLoaded', function() {
  const toggleRedirectButton = document.getElementById('toggleRedirect');
  const filterList = document.getElementById('filterList');
  const addFilterButton = document.getElementById('addFilter');
  const redirectedRequestsList = document.getElementById('redirectedRequests');

  // Load initial state from storage
  chrome.storage.sync.get(['filters', 'redirectEnabled'], function(data) {
    const filters = data.filters || [];
    const redirectEnabled = data.redirectEnabled || false;
    toggleRedirectButton.textContent = redirectEnabled ? 'Disable Redirect' : 'Enable Redirect';
    filters.forEach(addFilterToUI);
  });

  toggleRedirectButton.addEventListener('click', function() {
    chrome.storage.sync.get('redirectEnabled', function(data) {
      const newStatus = !data.redirectEnabled;
      chrome.storage.sync.set({redirectEnabled: newStatus});
      toggleRedirectButton.textContent = newStatus ? 'Disable Redirect' : 'Enable Redirect';
    });
  });

  addFilterButton.addEventListener('click', function() {
    const newFilter = { pattern: '', destination: '' }; // Start with empty filter and destination
    addFilterToUI(newFilter);
    updateFiltersInStorage();
  });

  function addFilterToUI(filter) {
    const filterItem = document.createElement('div');
    filterItem.className = 'filter-item';
    filterItem.draggable = true;

    const patternInput = document.createElement('input');
    patternInput.type = 'text';
    patternInput.value = filter.pattern;
    patternInput.placeholder = 'Enter filter pattern';
    filterItem.appendChild(patternInput);

    const destinationInput = document.createElement('input');
    destinationInput.type = 'text';
    destinationInput.value = filter.destination;
    destinationInput.placeholder = 'Enter redirect destination';
    filterItem.appendChild(destinationInput);

    const removeButton = document.createElement('button');
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', function() {
      filterItem.remove();
      updateFiltersInStorage();
    });
    filterItem.appendChild(removeButton);

    filterList.appendChild(filterItem);
  }

  function updateFiltersInStorage() {
    const filters = Array.from(filterList.querySelectorAll('.filter-item')).map(item => {
      return {
        pattern: item.querySelector('input[type="text"]:nth-child(1)').value,
        destination: item.querySelector('input[type="text"]:nth-child(2)').value
      };
    });
    chrome.storage.sync.set({filters: filters});
  }

  // Implement drag-and-drop logic for filter priority
  // Implement logic to list redirected requests
});
