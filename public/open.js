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

  // --- Tool definitions ---

  const TOOLS = {
    'claude-code': {
      label: 'Claude Code command',
      type: 'cli',
      command: () => {
        const escaped = promptContent.replace(/'/g, "'\\''");
        return `claude -p '${escaped}'`;
      },
      filename: 'run-with-claude-code.command',
    },
    'claude-app': {
      label: 'Claude App',
      type: 'app',
      url: 'https://claude.ai/new',
    },
    'cursor': {
      label: 'Cursor command',
      type: 'cli',
      command: () => {
        const escaped = promptContent.replace(/'/g, "'\\''");
        return `cursor --prompt '${escaped}'`;
      },
      filename: 'run-with-cursor.command',
      deepLink: 'cursor://',
    },
    'chatgpt': {
      label: 'ChatGPT',
      type: 'app',
      url: 'https://chatgpt.com',
    },
    'codex': {
      label: 'Codex command',
      type: 'cli',
      command: () => {
        const escaped = promptContent.replace(/'/g, "'\\''");
        return `codex '${escaped}'`;
      },
      filename: 'run-with-codex.command',
    },
    'raw': {
      label: 'Raw instructions',
      type: 'copy',
    },
  };

  // Download a .command file (macOS: double-click opens Terminal)
  function downloadCommandFile(cmd, filename) {
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

  // Try to open an app via URL scheme (hidden iframe, fails silently)
  function tryDeepLink(url) {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    setTimeout(() => {
      try { document.body.removeChild(iframe); } catch (e) {}
    }, 2000);
  }

  // --- Main handler ---

  window.copyForTool = function (toolId) {
    const tool = TOOLS[toolId];
    if (!tool) return;

    // Determine what to copy
    const copyText = tool.type === 'cli' ? tool.command() : promptContent;

    // Always copy to clipboard
    navigator.clipboard.writeText(copyText);

    // Show command preview
    const section = document.getElementById('command-section');
    section.style.display = '';
    document.getElementById('command-label').textContent = tool.label;
    document.getElementById('command-output').textContent = copyText;

    // Highlight selected tool
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('selected'));
    event.currentTarget.classList.add('selected');

    const hint = document.getElementById('run-hint');

    if (tool.type === 'app') {
      // Open the web app in a new tab — prompt is in clipboard
      window.open(tool.url, '_blank');
      hint.innerHTML = '<strong style="color:var(--fg)">Prompt copied!</strong> Paste (<kbd style="background:var(--bg-hover);border:1px solid var(--border);border-radius:3px;padding:1px 5px;font-size:.75rem">&#8984;V</kbd>) into the chat and send.';
      hint.style.display = '';
      showToast('Opening app — prompt copied');
    } else if (tool.type === 'cli') {
      // Download .command file + try deep link if available
      if (tool.deepLink) {
        tryDeepLink(tool.deepLink);
      }
      downloadCommandFile(copyText, tool.filename);
      hint.innerHTML = '<strong style="color:var(--fg)">Next:</strong> Open the downloaded <code>.command</code> file to run in Terminal. Or paste (<kbd style="background:var(--bg-hover);border:1px solid var(--border);border-radius:3px;padding:1px 5px;font-size:.75rem">&#8984;V</kbd>) the command into your terminal.';
      hint.style.display = '';
      showToast('Downloaded & copied to clipboard');
    } else {
      // Raw copy
      hint.style.display = 'none';
      showToast('Copied to clipboard');
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
