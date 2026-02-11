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

  function showStatus(html, type) {
    const el = document.getElementById('launch-status');
    el.innerHTML = html;
    el.style.display = '';
    el.style.background = type === 'success' ? 'rgba(34,197,94,.08)' : 'var(--bg-muted)';
    el.style.border = type === 'success' ? '1px solid rgba(34,197,94,.2)' : '1px solid var(--border)';
    el.style.color = type === 'success' ? '#16a34a' : 'var(--fg-muted)';
  }

  // --- Launch handlers ---

  window.launchTool = function (toolId) {
    // Always copy prompt to clipboard
    navigator.clipboard.writeText(promptContent);

    // Highlight selected button
    document.querySelectorAll('.launch-btn, .tool-btn').forEach(btn => btn.classList.remove('selected'));
    event.currentTarget.classList.add('selected');

    switch (toolId) {
      case 'chatgpt':
        // ChatGPT supports ?q= — prompt is pre-filled automatically
        window.open('https://chatgpt.com/?q=' + encodeURIComponent(promptContent), '_blank');
        showStatus('&#10003; ChatGPT opened with your prompt pre-filled. Check the new tab.', 'success');
        showToast('Prompt sent to ChatGPT');
        break;

      case 'claude-app':
        // Claude.ai doesn't support URL params — open + clipboard
        window.open('https://claude.ai/new', '_blank');
        showStatus('&#10003; Claude opened in a new tab. <strong>Paste</strong> (&#8984;V) and <strong>send</strong> — your prompt is ready in the clipboard.', 'info');
        showToast('Claude opened — paste & send');
        break;

      case 'claude-code':
        clipboardCli(`claude -p '${esc(promptContent)}'`);
        break;

      case 'cursor':
        clipboardCli(`cursor --prompt '${esc(promptContent)}'`);
        break;

      case 'codex':
        clipboardCli(`codex '${esc(promptContent)}'`);
        break;

      case 'raw':
        showStatus('&#10003; Prompt copied to clipboard. Paste it into any AI tool.', 'success');
        showToast('Copied to clipboard');
        break;
    }
  };

  function esc(text) {
    return text.replace(/'/g, "'\\''");
  }

  function clipboardCli(cmd) {
    navigator.clipboard.writeText(cmd);
    showStatus('&#10003; Command copied. Open your terminal and <strong>paste</strong> (&#8984;V) to run it.', 'info');
    showToast('Command copied');
  }

  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
  }
})();
