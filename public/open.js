// open.js — tool picker logic for OpenWithAgent
// Web app buttons are direct links. Terminal buttons copy the command.
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

  // --- Web-based AI platforms (universal link support) ---

  const AI_PLATFORMS = [
    {
      id: 'chatgpt',
      name: 'ChatGPT',
      desc: 'by OpenAI',
      logo: '/logo-chatgpt.png',
      buildUrl: (prompt) => 'https://chatgpt.com/?q=' + encodeURIComponent(prompt),
    },
    {
      id: 'claude',
      name: 'Claude',
      desc: 'by Anthropic',
      logo: '/logo-claude.png',
      buildUrl: (prompt) => 'https://claude.ai/new?q=' + encodeURIComponent(prompt),
    },
  ];

  // --- Terminal-based agents (copy command to clipboard) ---

  const TERMINAL_AGENTS = [
    {
      id: 'claude-code',
      name: 'Claude Code',
      desc: 'Anthropic CLI',
      icon: '>_',
      buildCommand: (prompt) =>
        `claude -p <<'PROMPT'\n${prompt}\nPROMPT\n`,
    },
    {
      id: 'codex',
      name: 'Codex CLI',
      desc: 'OpenAI CLI',
      icon: '>_',
      buildCommand: (prompt) =>
        `codex <<'PROMPT'\n${prompt}\nPROMPT\n`,
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

    // Build web app buttons as direct links
    const webContainer = document.getElementById('ai-buttons');
    webContainer.innerHTML = '';

    AI_PLATFORMS.forEach(platform => {
      const url = platform.buildUrl(promptContent);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.className = 'ai-btn';
      a.innerHTML = `
        <div class="ai-icon"><img src="${platform.logo}" alt="${platform.name}"></div>
        <div>
          <div class="ai-name">${platform.name}</div>
          <div class="ai-desc">${platform.desc}</div>
        </div>
        <span class="ai-arrow">&#8250;</span>
      `;
      webContainer.appendChild(a);
    });

    // Build terminal agent buttons (copy command on click)
    const termContainer = document.getElementById('terminal-buttons');
    termContainer.innerHTML = '';

    TERMINAL_AGENTS.forEach(agent => {
      const btn = document.createElement('button');
      btn.className = 'terminal-btn';
      const command = agent.buildCommand(promptContent);
      btn.innerHTML = `
        <div class="term-icon">${agent.icon}</div>
        <div>
          <div class="ai-name">${agent.name}</div>
          <div class="ai-desc">${agent.desc}</div>
        </div>
        <span class="copy-label">copy command</span>
      `;
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(command);
        btn.classList.add('copied');
        btn.querySelector('.copy-label').textContent = 'copied!';
        showToast('Command copied — paste in your terminal');
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.querySelector('.copy-label').textContent = 'copy command';
        }, 2500);
      });
      termContainer.appendChild(btn);
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
