(function () {
  const toggle = document.getElementById('toggle');
  const status = document.getElementById('status');

  function render(on) {
    toggle.checked = !!on;
    status.textContent = on ? 'Enabled' : 'Disabled';
    status.classList.toggle('off', !on);
  }

  function load() {
    chrome.storage.sync.get({ enabled: true }, (data) => {
      if (chrome.runtime.lastError) {
        chrome.storage.local.get({ enabled: true }, (d2) => render(d2.enabled !== false));
        return;
      }
      render(data.enabled !== false);
    });
  }

  toggle.addEventListener('change', () => {
    const on = toggle.checked;
    chrome.storage.sync.set({ enabled: on }, () => {
      if (chrome.runtime.lastError) {
        chrome.storage.local.set({ enabled: on });
      }
      render(on);
    });
  });

  load();
})();
