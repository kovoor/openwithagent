// open.js — tool picker logic for OpenWithAI
(function () {
  let promptContent = '';
  let repoName = '';

  const params = new URLSearchParams(location.search);
  const promptParam = params.get('prompt');
  const repoParam = params.get('repo');

  if (promptParam) {
    // Instructions encoded directly in URL (base64)
    try {
      promptContent = decodeURIComponent(escape(atob(promptParam)));
      showReady();
    } catch (e) {
      showError('Invalid prompt encoding. The link may be malformed.');
    }
  } else if (repoParam) {
    // Fetch .openwithai.md from GitHub
    repoName = repoParam;
    fetchFromRepo(repoParam);
  } else {
    showError('No instructions provided. Use ?prompt=... or ?repo=owner/name');
  }

  async function fetchFromRepo(repo) {
    const branches = ['main', 'master'];
    let fetched = false;

    for (const branch of branches) {
      try {
        const url = `https://raw.githubusercontent.com/${repo}/${branch}/.openwithai.md`;
        const res = await fetch(url);
        if (res.ok) {
          promptContent = await res.text();
          fetched = true;
          break;
        }
      } catch (e) {
        // try next branch
      }
    }

    if (fetched) {
      showReady();
    } else {
      showError(
        `Could not find .openwithai.md in ${repo}. ` +
        'Make sure the file exists on the main or master branch.'
      );
    }
  }

  function showReady() {
    document.getElementById('status').style.display = 'none';
    document.getElementById('main').style.display = '';

    if (repoName) {
      document.getElementById('repo-info').style.display = '';
      document.getElementById('repo-name').textContent = repoName;
    }

    document.getElementById('prompt-content').textContent = promptContent;
  }

  function showError(msg) {
    document.getElementById('status').style.display = 'none';
    document.getElementById('error-state').style.display = '';
    document.getElementById('error-detail').textContent = msg;
  }

  // Escape prompt for shell usage — wrap in heredoc to avoid escaping issues
  function shellEscape(text) {
    // Using heredoc with a unique delimiter avoids all escaping
    return text;
  }

  function generateCommand(tool) {
    const escaped = promptContent.replace(/'/g, "'\\''");

    switch (tool) {
      case 'claude':
        return `claude -p '${escaped}'`;
      case 'cursor':
        return `cursor --prompt '${escaped}'`;
      case 'codex':
        return `codex '${escaped}'`;
      case 'raw':
        return promptContent;
      default:
        return promptContent;
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

  // Expose to global scope for onclick handlers
  window.copyForTool = function (tool) {
    const cmd = generateCommand(tool);
    const section = document.getElementById('command-section');
    section.style.display = '';
    document.getElementById('command-label').textContent = getLabel(tool);
    document.getElementById('command-output').textContent = cmd;

    navigator.clipboard.writeText(cmd);
    showToast('Copied to clipboard');

    // Highlight selected tool
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.style.borderColor = '';
    });
    event.currentTarget.style.borderColor = 'var(--accent)';
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
