// open.js — tool picker logic for OpenWithAgent
// Every button is a direct link. Click → app opens with prompt. No copy-paste.
(function () {
  let promptContent = '';
  let repoName = '';
  let usedFallback = false;

  const params = new URLSearchParams(location.search);
  const promptParam = params.get('prompt');
  const repoParam = params.get('repo');

  if (promptParam) {
    const cleaned = promptParam.replace(/[^A-Za-z0-9+/=]+$/, '');
    try {
      promptContent = decodeURIComponent(escape(atob(cleaned)));
      showReady();
    } catch (e) {
      showError('Invalid prompt encoding. The link may be malformed.');
    }
  } else if (repoParam) {
    repoName = repoParam;
    fetchFromRepo(repoParam);
  } else {
    showError('No instructions provided. Use ?prompt=... or ?repo=owner/name');
  }

  async function fetchFromRepo(repo) {
    const branches = ['main', 'master'];

    for (const branch of branches) {
      try {
        const url = `https://raw.githubusercontent.com/${repo}/${branch}/.openwithagent.md`;
        const res = await fetch(url);
        if (res.ok) {
          promptContent = await res.text();
          showReady();
          return;
        }
      } catch (e) {}
    }

    for (const branch of branches) {
      try {
        const url = `https://raw.githubusercontent.com/${repo}/${branch}/README.md`;
        const res = await fetch(url);
        if (res.ok) {
          const readme = await res.text();
          usedFallback = true;
          promptContent =
            `I want to set up the project "${repo}" on my machine.\n\n` +
            `Here is the project's README:\n\n` +
            `---\n${readme}\n---\n\n` +
            `Based on the README above, please:\n` +
            `1. Clone the repository: git clone https://github.com/${repo}.git\n` +
            `2. Install all dependencies\n` +
            `3. Run any setup or build steps mentioned\n` +
            `4. Verify the installation works\n\n` +
            `If the README doesn't include clear setup instructions, inspect the repo structure (package.json, Makefile, etc.) and figure out the right steps.`;
          showReady();
          return;
        }
      } catch (e) {}
    }

    showError(
      `Could not find .openwithagent.md or README.md in ${repo}. ` +
      'Make sure the repository exists and is public.'
    );
  }

  // --- AI platforms with universal link support ---
  // Each platform gets a URL that opens with the prompt pre-filled via query param.

  const AI_PLATFORMS = [
    {
      id: 'chatgpt',
      name: 'ChatGPT',
      desc: 'by OpenAI',
      iconClass: 'icon-chatgpt',
      icon: 'G',
      buildUrl: (prompt) => 'https://chatgpt.com/?q=' + encodeURIComponent(prompt),
    },
    {
      id: 'claude',
      name: 'Claude',
      desc: 'by Anthropic',
      iconClass: 'icon-claude',
      icon: 'C',
      buildUrl: (prompt) => 'https://claude.ai/new?q=' + encodeURIComponent(prompt),
    },
    {
      id: 'gemini',
      name: 'Gemini',
      desc: 'by Google',
      iconClass: 'icon-gemini',
      icon: 'G',
      buildUrl: (prompt) => 'https://gemini.google.com/app?q=' + encodeURIComponent(prompt),
    },
    {
      id: 'copilot',
      name: 'Copilot',
      desc: 'by Microsoft',
      iconClass: 'icon-copilot',
      icon: 'C',
      buildUrl: (prompt) => 'https://copilot.microsoft.com/?q=' + encodeURIComponent(prompt),
    },
  ];

  function showReady() {
    document.getElementById('status').style.display = 'none';
    document.getElementById('main').style.display = '';

    if (repoName) {
      document.getElementById('repo-info').style.display = '';
      document.getElementById('repo-name').textContent = repoName;
    }

    if (usedFallback) {
      document.getElementById('fallback-notice').style.display = '';
    }

    document.getElementById('prompt-content').textContent = promptContent;

    // Build the AI platform buttons as direct links
    const container = document.getElementById('ai-buttons');
    container.innerHTML = '';

    AI_PLATFORMS.forEach(platform => {
      const url = platform.buildUrl(promptContent);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.className = 'ai-btn';
      a.innerHTML = `
        <div class="ai-icon ${platform.iconClass}">${platform.icon}</div>
        <div>
          <div class="ai-name">${platform.name}</div>
          <div class="ai-desc">${platform.desc}</div>
        </div>
        <span class="ai-arrow">&#8250;</span>
      `;
      container.appendChild(a);
    });
  }

  function showError(msg) {
    document.getElementById('status').style.display = 'none';
    document.getElementById('error-state').style.display = '';
    document.getElementById('error-detail').textContent = msg;
  }

  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
  }
})();
