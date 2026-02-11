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

  // --- Script generators ---
  // Each tool gets a .command script that auto-launches and sends the prompt.
  // macOS: .command files open in Terminal when double-clicked.

  function escapeShellArg(text) {
    // Escape single quotes for shell
    return text.replace(/'/g, "'\\''");
  }

  function escapeAppleScript(text) {
    // Escape backslashes and double quotes for AppleScript strings
    return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  function generateScript(toolId) {
    const escaped = escapeShellArg(promptContent);
    const asEscaped = escapeAppleScript(promptContent);

    switch (toolId) {
      case 'claude-code':
        // Runs claude CLI directly in Terminal
        return `#!/bin/bash\nclaude -p '${escaped}'\n`;

      case 'claude-app':
        // Opens Claude desktop app, pastes prompt via AppleScript, sends it
        return [
          '#!/bin/bash',
          '# Put prompt in clipboard',
          `printf '%s' '${escaped}' | pbcopy`,
          '# Open Claude app',
          'open -a "Claude" 2>/dev/null || open "https://claude.ai/new"',
          '# Wait for app to activate, then paste and send',
          'sleep 2',
          'osascript -e \'tell application "System Events" to keystroke "v" using command down\'',
          'sleep 0.3',
          'osascript -e \'tell application "System Events" to keystroke return\'',
          '',
        ].join('\n');

      case 'cursor':
        // Runs cursor CLI
        return `#!/bin/bash\ncursor --prompt '${escaped}'\n`;

      case 'chatgpt':
        // Opens ChatGPT with ?q= pre-filled (no paste needed)
        return [
          '#!/bin/bash',
          `open "https://chatgpt.com/?q=${encodeURIComponent(promptContent)}"`,
          '',
        ].join('\n');

      case 'codex':
        // Runs codex CLI
        return `#!/bin/bash\ncodex '${escaped}'\n`;

      default:
        return null;
    }
  }

  function getFilename(toolId) {
    const names = {
      'claude-code': 'run-with-claude-code.command',
      'claude-app': 'run-with-claude-app.command',
      'cursor': 'run-with-cursor.command',
      'chatgpt': 'run-with-chatgpt.command',
      'codex': 'run-with-codex.command',
    };
    return names[toolId] || null;
  }

  function getLabel(toolId) {
    const labels = {
      'claude-code': 'Claude Code command',
      'claude-app': 'Claude App script',
      'cursor': 'Cursor command',
      'chatgpt': 'ChatGPT',
      'codex': 'Codex command',
      'raw': 'Raw instructions',
    };
    return labels[toolId] || 'Command';
  }

  // Download a file as blob
  function downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'application/octet-stream' });
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

  window.copyForTool = function (toolId) {
    // Always copy prompt to clipboard
    const escaped = escapeShellArg(promptContent);
    let displayCmd;

    switch (toolId) {
      case 'claude-code': displayCmd = `claude -p '${escaped}'`; break;
      case 'cursor': displayCmd = `cursor --prompt '${escaped}'`; break;
      case 'codex': displayCmd = `codex '${escaped}'`; break;
      default: displayCmd = promptContent;
    }

    navigator.clipboard.writeText(toolId === 'raw' ? promptContent : displayCmd);

    // Show command preview
    const section = document.getElementById('command-section');
    section.style.display = '';
    document.getElementById('command-label').textContent = getLabel(toolId);
    document.getElementById('command-output').textContent = toolId === 'raw' ? promptContent : displayCmd;

    // Highlight selected
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('selected'));
    event.currentTarget.classList.add('selected');

    const hint = document.getElementById('run-hint');

    if (toolId === 'raw') {
      hint.style.display = 'none';
      showToast('Copied to clipboard');
      return;
    }

    if (toolId === 'chatgpt') {
      // ChatGPT supports ?q= — open directly with prompt pre-filled
      window.open('https://chatgpt.com/?q=' + encodeURIComponent(promptContent), '_blank');
      hint.innerHTML = '<strong style="color:var(--fg)">Done!</strong> ChatGPT opened with your prompt pre-filled.';
      hint.style.display = '';
      showToast('Prompt sent to ChatGPT');
      return;
    }

    // For all other tools: download a .command script
    const script = generateScript(toolId);
    const filename = getFilename(toolId);

    if (script && filename) {
      downloadFile(script, filename);
    }

    // Tool-specific hints
    if (toolId === 'claude-app') {
      hint.innerHTML = '<strong style="color:var(--fg)">Downloaded!</strong> Open <code>run-with-claude-app.command</code> — it will launch Claude, paste the prompt, and send it automatically.';
    } else {
      hint.innerHTML = '<strong style="color:var(--fg)">Downloaded!</strong> Open the <code>.command</code> file to run in Terminal.';
    }
    hint.style.display = '';
    showToast('Downloaded — open to run');
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
