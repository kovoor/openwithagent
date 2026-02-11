// open.js — tool picker logic for OpenWithAgent
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
  }

  function showError(msg) {
    document.getElementById('status').style.display = 'none';
    document.getElementById('error-state').style.display = '';
    document.getElementById('error-detail').textContent = msg;
  }

  function generateCommand(tool) {
    const escaped = promptContent.replace(/'/g, "'\\''");
    switch (tool) {
      case 'claude': return `claude -p '${escaped}'`;
      case 'cursor': return `cursor --prompt '${escaped}'`;
      case 'codex': return `codex '${escaped}'`;
      case 'raw': return promptContent;
      default: return promptContent;
    }
  }

  function getLabel(tool) {
    switch (tool) {
      case 'claude': return 'Claude Code command';
      case 'cursor': return 'Cursor command';
      case 'codex': return 'Codex command';
      case 'raw': return 'Raw instructions';
      default: return 'Command';
    }
  }

  // --- Deep link / URL scheme support ---

  // Try to open an app via its registered URL scheme.
  // Uses a hidden iframe so the browser doesn't show an error if the scheme isn't registered.
  function tryDeepLink(url) {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    setTimeout(() => {
      try { document.body.removeChild(iframe); } catch (e) {}
    }, 2000);
  }

  // Build deep link URLs to try for the tool.
  // Hidden iframe approach fails silently if scheme isn't registered — zero downside.
  function getDeepLinks(tool) {
    switch (tool) {
      case 'claude':
        // Try Claude desktop app and Claude Code
        return ['claude://'];
      case 'cursor':
        // Cursor registers cursor:// (VS Code fork)
        return ['cursor://'];
      case 'codex':
        // Try OpenAI ChatGPT desktop app
        return ['chatgpt://'];
      default:
        return [];
    }
  }

  // Download a .command file (macOS: double-click opens Terminal and runs it)
  function downloadCommandFile(tool) {
    const cmd = generateCommand(tool);
    const names = {
      claude: 'run-with-claude.command',
      cursor: 'run-with-cursor.command',
      codex: 'run-with-codex.command',
    };
    const filename = names[tool];
    if (!filename) return;

    const script = '#!/bin/bash\n' + cmd + '\n';
    const blob = new Blob([script], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- Main handler ---

  window.copyForTool = function (tool) {
    const cmd = generateCommand(tool);

    // Always show command preview
    const section = document.getElementById('command-section');
    section.style.display = '';
    document.getElementById('command-label').textContent = getLabel(tool);
    document.getElementById('command-output').textContent = cmd;

    // Always copy to clipboard
    navigator.clipboard.writeText(cmd);

    // Highlight selected tool
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('selected'));
    event.currentTarget.classList.add('selected');

    if (tool === 'raw') {
      document.getElementById('run-hint').style.display = 'none';
      showToast('Copied to clipboard');
      return;
    }

    // Try deep links (opens the app if installed, fails silently if not)
    const deepLinks = getDeepLinks(tool);
    deepLinks.forEach(link => tryDeepLink(link));

    // Download .command file for terminal-based tools
    downloadCommandFile(tool);

    // Show next-step hint
    document.getElementById('run-hint').style.display = '';

    if (deepLinks.length > 0) {
      showToast('Opening app — command also copied');
    } else {
      showToast('Downloaded & copied to clipboard');
    }
  };

  window.copyCommand = function () {
    const text = document.getElementById('command-output').textContent;
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard');
  };

  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
  }
})();
