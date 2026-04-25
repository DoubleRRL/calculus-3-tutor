(function () {
  const KATEX_DELIMITERS = [
    {left: '$$', right: '$$', display: true},
    {left: '$', right: '$', display: false},
    {left: '\\\\(', right: '\\\\)', display: false},
    {left: '\\\\[', right: '\\\\]', display: true},
  ];

  const MAX_DEBUG_EVENTS = 180;
  const MAX_PREVIEW_RETRIES = 16;
  const PREVIEW_RETRY_MS = 80;
  const PREVIEW_EMPTY_MARKUP = '<span class="ct-math-preview-empty">Live Math Preview...</span>';

  const previewState = {
    lastValue: '',
    renderAttempts: 0,
    renderedValueLength: 0,
    watchersInstalled: false,
    lastRenderPath: '',
    lastPreviewError: '',
    debugEvents: [],
  };

  let latexRenderScheduled = false;
  let _queuedPreviewValue = null;
  let _renderQueueTimer = null;
  let _previewNodeReady = false;
  let _isSolvingFromModal = false;

  function recordDebugEvent(eventName, details = {}) {
    previewState.debugEvents.push({
      t: Date.now(),
      event: eventName,
      ...details,
    });
    if (previewState.debugEvents.length > MAX_DEBUG_EVENTS) {
      previewState.debugEvents = previewState.debugEvents.slice(-MAX_DEBUG_EVENTS);
    }
  }

  const _aliasMap = {
    theta: "\\\\theta",
    pi: "\\\\pi",
    infinity: "\\\\infty",
    infty: "\\\\infty",
    alpha: "\\\\alpha",
    beta: "\\\\beta",
    gamma: "\\\\gamma",
    delta: "\\\\delta",
    epsilon: "\\\\epsilon",
    zeta: "\\\\zeta",
    eta: "\\\\eta",
    iota: "\\\\iota",
    kappa: "\\\\kappa",
    lambda: "\\\\lambda",
    mu: "\\\\mu",
    nu: "\\\\nu",
    xi: "\\\\xi",
    omicron: "\\\\omicron",
    rho: "\\\\rho",
    sigma: "\\\\sigma",
    tau: "\\\\tau",
    phi: "\\\\phi",
    varphi: "\\\\varphi",
    chi: "\\\\chi",
    psi: "\\\\psi",
    omega: "\\\\omega",
    nabla: "\\\\nabla",
    grad: "\\\\nabla",
    sqrt: "\\\\sqrt",
    sin: "\\\\sin",
    cos: "\\\\cos",
    tan: "\\\\tan",
    ln: "\\\\ln",
    log: "\\\\log",
    exp: "\\\\exp",
    to: "\\\\to",
    rightarrow: "\\\\rightarrow",
    leftarrow: "\\\\leftarrow",
  };

  const _textAliasMap = {
    theta: "θ",
    pi: "π",
    infinity: "∞",
    infty: "∞",
    alpha: "α",
    beta: "β",
    gamma: "γ",
    delta: "δ",
    epsilon: "ε",
    zeta: "ζ",
    eta: "η",
    iota: "ι",
    kappa: "κ",
    lambda: "λ",
    mu: "μ",
    nu: "ν",
    xi: "ξ",
    omicron: "ο",
    rho: "ρ",
    sigma: "σ",
    tau: "τ",
    phi: "ϕ",
    varphi: "φ",
    chi: "χ",
    psi: "ψ",
    omega: "ω",
    nabla: "∇",
    grad: "∇",
    sin: "sin",
    cos: "cos",
    tan: "tan",
    sqrt: "sqrt",
    x: "x",
    y: "y",
    z: "z",
    t: "t",
  };

  function applyAliases(text) {
    return Object.keys(_aliasMap).reduce((out, key) => {
      const safe = key.replace(/[.*+?^${}()|[\]\\]/g, '\\\\$&');
      const re = new RegExp('(^|[^\\\\A-Za-z0-9])(' + safe + ')(?=$|[^A-Za-z0-9])', 'g');
      return out.replace(re, (m, pre, word) => pre + _aliasMap[key]);
    }, String(text || ''));
  }

  function applyTextAliases(text) {
    return Object.keys(_textAliasMap).reduce((out, key) => {
      const safe = key.replace(/[.*+?^${}()|[\]\\]/g, '\\\\$&');
      const re = new RegExp('(^|[^\\\\A-Za-z0-9])(' + safe + ')(?=$|[^A-Za-z0-9])', 'g');
      return out.replace(re, (m, pre) => pre + _textAliasMap[key]);
    }, String(text || ''));
  }

  function preprocessPlainMath(s) {
    const aliased = applyAliases(s);
    return aliased.replace(/(^|\\s)d([xyzt])\\b/g, function (match, lead, letter) {
      return `${lead}\\,\\mathrm{d}` + letter;
    });
  }

  function looksLikeMathExpression(text) {
    const lower = String(text).toLowerCase();
  if (/[-+*\/_{}()[\]0-9^=]/.test(text)) return true;
  if (/\\/.test(text)) return true;
  if (/[+\-]\s*[a-z]/.test(lower)) return true;
  if (/\d/.test(lower) && /[a-z]/.test(lower)) return true;
  if (/[a-z]\^\d/.test(lower)) return true;
  if (/\b(sin|cos|tan|ln|log|exp|sqrt|theta|pi|alpha|beta|gamma|delta|nabla|frac|lim|sum|int)\b/.test(lower)) return true;
  if (/\b(?:d|partial)\//.test(lower)) return true;
  if (/\b(dx|dy|dz|dt|d\w+)\b/.test(lower)) return true;
    return false;
  }

  function hasExplicitMathDelimiters(text) {
    return text.includes('$') || text.includes('\\(') || text.includes('\\[');
  }

  function hasMathRenderers() {
    return Boolean(
      (window.renderMathInElement && typeof window.renderMathInElement === 'function') ||
      (window.katex && typeof window.katex.render === 'function')
    );
  }

  function previewNode() {
    return document.getElementById('ct-math-preview-pane');
  }

  function getProblemInputTextArea(node) {
    if (node && node.tagName && node.tagName.toLowerCase() === 'textarea') {
      const cls = (node.className || '').toLowerCase();
      const id = (node.id || '').toLowerCase();
      const placeholder = (node.getAttribute('placeholder') || '').toLowerCase();
      const label = (node.getAttribute('aria-label') || '').toLowerCase();
      const name = (node.getAttribute('name') || '').toLowerCase();

      const inProblemZone = Boolean(
        node.closest('#ct-problem-input') ||
        node.closest('#ct-solve-panel') ||
        node.closest('.ct-input-zone') ||
        id.includes('problem') ||
        cls.includes('ct-problem')
      );
      const looksLikeProblemField = placeholder.includes('e.g') || placeholder.includes('problem') || label.includes('problem') || name.includes('problem');
      if (inProblemZone || looksLikeProblemField) return node;
      return null;
    }

    const primary = document.querySelector('#ct-problem-input textarea');
    if (primary) return primary;

    const panel = document.getElementById('ct-solve-panel');
    if (panel) {
      const panelTextArea = panel.querySelector('textarea');
      if (panelTextArea) return panelTextArea;
    }

    const secondary = document.querySelector('.ct-input-zone textarea, #ct-solve-panel textarea, #ct-problem-input textarea');
    if (secondary) return secondary;

    const fallback = Array.from(document.querySelectorAll('textarea')).find((textarea) => {
      if (!textarea.offsetParent && textarea !== document.activeElement) return false;
      const cls = (textarea.className || '').toLowerCase();
      if (cls.includes('ct-chat-input') || cls.includes('katex')) return false;
      const name = (textarea.getAttribute('placeholder') || '').toLowerCase();
      const label = (textarea.getAttribute('aria-label') || '').toLowerCase();
      const id = (textarea.getAttribute('id') || '').toLowerCase();
      return name.includes('type') || name.includes('problem') || label.includes('problem') || id.includes('problem');
    });

    return fallback || null;
  }

  function queuePreviewFromValue(value) {
    _queuedPreviewValue = value;
    if (_renderQueueTimer) return;
    _renderQueueTimer = setTimeout(() => {
      _renderQueueTimer = null;
      if (_queuedPreviewValue === null) return;
      renderMathPreview(_queuedPreviewValue);
    }, 16);
  }

  function scheduleRenderRetry(value, reason) {
    if (previewState.renderAttempts >= MAX_PREVIEW_RETRIES) {
      return false;
    }
    previewState.renderAttempts += 1;
    recordDebugEvent('render_preview_retry', {
      reason,
      attempt: previewState.renderAttempts,
      valueLength: String(value || '').length,
    });
    _renderQueueTimer = setTimeout(() => {
      _renderQueueTimer = null;
      renderMathPreview(value);
    }, PREVIEW_RETRY_MS);
    return true;
  }

  function renderMathInSingleNode(node, value) {
    const rawText = String(value || '').trim();
    if (!rawText) {
      node.innerHTML = PREVIEW_EMPTY_MARKUP;
      previewState.lastRenderPath = 'empty';
      previewState.renderAttempts = 0;
      previewState.lastPreviewError = '';
      previewState.renderedValueLength = 0;
      return;
    }
    previewState.renderedValueLength = rawText.length;

    const hasLatexRenderer = Boolean(
      window.renderMathInElement && typeof window.renderMathInElement === 'function'
    );
    const hasKatexRenderer = Boolean(
      window.katex && typeof window.katex.render === 'function'
    );

    if (hasExplicitMathDelimiters(rawText) && !hasLatexRenderer) {
      if (scheduleRenderRetry(rawText, 'missing-auto-renderer')) {
        previewState.lastRenderPath = 'explicit-renderer-not-ready';
        return;
      }
      previewState.lastRenderPath = 'explicit-fallback-plain';
      node.textContent = applyTextAliases(rawText);
      recordDebugEvent('render_plain_text_fallback', {
        reason: 'explicit-math-no-renderer',
        valueLength: rawText.length,
      });
      previewState.lastPreviewError = 'KaTeX auto-render not available';
      return;
    }

    if (hasExplicitMathDelimiters(rawText)) {
      node.textContent = rawText;
      try {
        renderMathInElement(node, {delimiters: KATEX_DELIMITERS});
        previewState.lastRenderPath = 'renderMathInElement-explicit';
        previewState.lastPreviewError = '';
        previewState.renderAttempts = 0;
        return;
      } catch (err) {
        previewState.lastRenderPath = 'fallback-explicit-render-error';
        previewState.lastPreviewError = String(err);
        node.textContent = applyTextAliases(rawText);
        recordDebugEvent('render_plain_text_fallback', {
          reason: 'explicit-render-exception',
          valueLength: rawText.length,
          error: previewState.lastPreviewError,
        });
        return;
      }
    }

    const tex = preprocessPlainMath(rawText);
    const looksLikeMath = looksLikeMathExpression(rawText);
    if (looksLikeMath && !hasKatexRenderer) {
      if (scheduleRenderRetry(rawText, 'missing-katex-renderer')) {
        previewState.lastRenderPath = 'katex-renderer-not-ready';
        return;
      }
      previewState.lastRenderPath = 'plaintext-fallback';
      node.textContent = applyTextAliases(rawText);
      recordDebugEvent('render_plain_text_fallback', {
        reason: 'plain-math-no-renderer',
        valueLength: rawText.length,
      });
      return;
    }

    if (looksLikeMath && hasKatexRenderer) {
      try {
        window.katex.render(tex, node, {
          displayMode: false,
          throwOnError: false,
          trust: true,
          strict: false,
        });
        previewState.lastRenderPath = 'katex-render';
        previewState.lastPreviewError = '';
        previewState.renderAttempts = 0;
        return;
      } catch (err) {
        previewState.lastRenderPath = 'fallback-katex-error';
        previewState.lastPreviewError = String(err);
        node.textContent = applyTextAliases(rawText);
        recordDebugEvent('render_plain_text_fallback', {
          reason: 'plain-render-exception',
          valueLength: rawText.length,
          error: previewState.lastPreviewError,
        });
      }
    }

    node.textContent = applyTextAliases(rawText);
    previewState.lastRenderPath = 'plaintext-fallback';
    recordDebugEvent('render_plain_text_fallback', {
      reason: 'non-math-expression',
      valueLength: rawText.length,
    });
  }

  function renderMathPreview(value) {
    const node = previewNode();
    previewState.lastValue = value ?? '';
    previewState.renderedValueLength = String(value || '').length;
    if (!_previewNodeReady && !node) {
      recordDebugEvent('preview-node-missing', {
        valueLength: previewState.renderedValueLength,
      });
      if (scheduleRenderRetry(String(value || ''), 'preview-node-missing')) {
        previewState.lastRenderPath = 'preview-node-missing';
        return;
      }
    }
    if (_queuedPreviewValue !== null && _queuedPreviewValue !== value) {
      value = _queuedPreviewValue;
      _queuedPreviewValue = null;
    }
    recordDebugEvent('render-call', {
      valueLength: (value || '').length,
      renderReady: hasMathRenderers(),
      queued: Boolean(_queuedPreviewValue),
      attempts: previewState.renderAttempts,
    });
    previewState.lastRenderPath = 'rendering';
    if (_queuedPreviewValue !== null && _queuedPreviewValue !== value) {
      value = _queuedPreviewValue;
      _queuedPreviewValue = null;
    }
    if (!node) {
      previewState.lastRenderPath = 'no-node';
      previewState.lastPreviewError = 'Live math preview container is missing';
      _previewNodeReady = false;
      return;
    }
    _previewNodeReady = true;
    renderMathInSingleNode(node, value);
  }

  function renderLatexInNode(node) {
    if (!node || !window.renderMathInElement) return;
    try {
      renderMathInElement(node, {
        delimiters: KATEX_DELIMITERS,
        strict: false,
        throwOnError: false,
      });
    } catch (err) {
      recordDebugEvent('render-latex-error', {
        target: node.id || node.className,
        message: String(err),
      });
    }
  }

  function scheduleLatexRender() {
    if (latexRenderScheduled) return;
    latexRenderScheduled = true;
    requestAnimationFrame(() => {
      latexRenderScheduled = false;
      if (typeof window.renderMathInElement === 'function') {
        ['ct-step-grid', 'ct-chat-thread', 'ct-problem-modal'].forEach((id) => {
          const node = document.getElementById(id);
          if (node) renderLatexInNode(node);
        });
      }
    });
  }

  function handleProblemInputEvent(e) {
    const area = getProblemInputTextArea(e.target);
    if (!area) return;
    if (area !== e.target) return;
    recordDebugEvent('input-capture', {
      eventTarget: (e.target.id || 'textarea'),
      len: area.value ? area.value.length : 0,
    });

    if (typeof window.ctDebugPreviewEvent === 'function') {
      window.ctDebugPreviewEvent({
        event: 'input',
        len: area.value ? area.value.length : 0,
      });
    }
    queuePreviewFromValue(area.value || '');
  }

  function installLivePreview() {
    if (previewState.watchersInstalled) return;
    previewState.watchersInstalled = true;
    document.addEventListener('input', handleProblemInputEvent);
    scheduleLatexRender();
  }

  function renderLatex() {
    if (typeof window.renderMathInElement === 'function') {
      renderLatexInNode(document.body);
      renderLatexInNode(document.getElementById('ct-problem-modal'));
    } else {
      recordDebugEvent('render-latex-skipped', { reason: 'katex-not-ready' });
    }
  }

  function dispatchFrontendAction(payloadJson) {
    if (!payloadJson) return;
    let payload = payloadJson;
    if (typeof payloadJson === 'string') {
      if (!payloadJson.trim()) return;
      try {
        payload = JSON.parse(payloadJson);
      } catch (err) {
        console.error('Invalid frontend payload:', err);
        return;
      }
    }

    if (!payload || typeof payload !== 'object') return;
    const action = payload.action || '';
    const envelopePayload = payload.payload || payload;
    if (!action) return;

    switch (action) {
      case 'injectWhyResponse':
        injectWhyResponse(envelopePayload.panelId, envelopePayload.html || '', envelopePayload.mode);
        break;
      case 'injectChatResponse':
        injectChatResponse(envelopePayload.html || '');
        break;
      case 'startPracticeSolve':
        startPracticeSolve(
          envelopePayload.problemText || envelopePayload.problem_statement || envelopePayload.problemHtml || '',
          envelopePayload.queueIdx || 0,
          envelopePayload.queueLen || 1,
          envelopePayload.generationSessionId
        );
        break;
      case 'showProblemModal':
        showProblemModal(
          envelopePayload.html || '',
          envelopePayload.queueIdx || 0,
          envelopePayload.queueLen || 1,
          envelopePayload.generationSessionId
        );
        break;
      case 'showMathPreviewError':
        if (previewNode()) {
          previewNode().textContent = `Math preview error${envelopePayload && envelopePayload.message ? ': ' + envelopePayload.message : ''}`;
        }
        break;
      case 'generationNotice':
        if (typeof _setPracticeGenerationNotice === 'function') {
          _setPracticeGenerationNotice(
            envelopePayload.message || '',
            envelopePayload.kind || 'info'
          );
          if (envelopePayload.kind === 'error' || envelopePayload.code) {
            setGenerateButtonState({generating: false});
            if (typeof _endGenerationSession === 'function') {
              _endGenerationSession(false, envelopePayload.message || 'Generation failed');
            }
          }
        }
        break;
      case 'generationProgress':
        if (typeof renderGenerationProgress === 'function') {
          renderGenerationProgress(envelopePayload);
        }
        break;
      case 'clearGenerationProgress':
        if (typeof clearGenerationProgress === 'function') {
          clearGenerationProgress();
        }
        break;
      default:
        if (payload.ok === false && payload.error) {
          console.warn('[ActionError]', action, payload.error);
        } else {
          console.warn('Unknown frontend action:', action);
        }
    }
  }

  function injectWhyResponse(panelId, html, mode) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    panel.innerHTML = html;
    panel.classList.add('open');
    panel.dataset.loaded = '1';
    if (mode) panel.dataset.mode = mode;
    renderLatexInNode(panel);
  }

  function injectChatResponse(html) {
    const thread = document.getElementById('ct-chat-thread');
    const thinking = document.getElementById('ct-thinking');
    const sendBtn = document.getElementById('ct-chat-send');

    if (thinking) thinking.remove();

    const empty = thread ? thread.querySelector('.ct-chat-empty') : null;
    if (empty) empty.remove();

    if (thread && html) {
      const div = document.createElement('div');
      div.innerHTML = html;
      thread.appendChild(div.firstElementChild || div);
      thread.scrollTop = thread.scrollHeight;
    }
    if (sendBtn) sendBtn.disabled = false;
    renderLatex();
  }

function startPracticeSolve(problemText) {
  if (typeof closeProblemModalIfOpen === 'function') {
    closeProblemModalIfOpen();
  }
  if (typeof setGenerateButtonState === 'function') {
    setGenerateButtonState({generating: false});
  }
  if (typeof _setPracticeGenerationNotice === 'function') {
    _setPracticeGenerationNotice('Problem solved view loading…', 'info');
  }
  const finalProblemText = String(problemText || '').trim();
  if (!finalProblemText) return;
  if (typeof window.switchMode === 'function') {
    window.switchMode('solve');
  }
  const submitSolveFromPanel = () => {
    const textarea = document.querySelector('#ct-solve-panel textarea');
    if (textarea) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(textarea, finalProblemText);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const btn = document.querySelector('.ct-solve-btn');
    if (btn) btn.click();
  };
  requestAnimationFrame(submitSolveFromPanel);
}

function showProblemModal(html, queueIdx, queueLen, generationSessionId) {
  if (_generationSession && generationSessionId && _generationSession.id && generationSessionId !== _generationSession.id) return;
    const modal = document.getElementById('ct-problem-modal');
    const header = document.getElementById('ct-modal-header');
    const body = document.getElementById('ct-modal-body');
    const footer = document.getElementById('ct-modal-footer');
    if (body) body.innerHTML = html;
    if (footer) {
      const hasNext = queueIdx < queueLen - 1;
      footer.innerHTML = `
        <button class="ct-modal-btn" data-action="regenerate-problem" type="button">↻ Another</button>
        <button class="ct-modal-btn ct-modal-solve" data-action="solve-from-modal" type="button">Solve it →</button>
        ${hasNext ? '<button class="ct-modal-btn primary" data-action="next-topic" type="button">Next topic →</button>' : ''}
      `;
    }
    if (header) {
      const diff = document.getElementById('ct-tray-diff');
      const diffText = diff ? diff.textContent : '';
      const safeHtml = html.replace(/<[^>]*>/g, '');
      const previewLabel = (safeHtml || 'Practice problem').slice(0, 64);
      header.innerHTML = `<span class="ct-modal-topic">${previewLabel}</span>
        <span class="ct-modal-meta">${diffText}</span>
        <button class="ct-modal-close" data-action="close-problem-modal" type="button">✕</button>`;
    }
    if (modal) {
      modal.classList.add('open');
    }
    const stmt = document.getElementById('ct-problem-stmt');
    if (stmt) {
      const txt = stmt.textContent || '';
      stmt.textContent = txt;
    if (typeof renderMathInElement === 'function' && Array.isArray(KATEX_DELIMITERS)) {
      renderMathInElement(stmt, {
        delimiters: KATEX_DELIMITERS,
        strict: false,
        throwOnError: false,
      });
    }
    }
  if (typeof _endGenerationSession === 'function') {
    _endGenerationSession(true, 'Problem generated');
    setGenerateButtonState({generating: false});
  }
    setProblemModalOpenState(true);
    renderLatex();
  }

  function getMathPreviewDebugState() {
    return {
      ...previewState,
      queuedValuePreview: Boolean(_queuedPreviewValue),
      hasRenderers: hasMathRenderers(),
      timestamp: Date.now(),
    };
  }

  function updateMathPreviewFromValue(value) {
    const safeValue = value ? String(value) : '';
    recordDebugEvent('updateMathPreviewFromValue', { valueLength: safeValue.length });
    queuePreviewFromValue(safeValue);
  }

  function autoResizeChatInput(textarea) {
    const area = textarea || document.getElementById('ct-chat-input');
    if (!area) return;
    area.style.height = 'auto';
    area.style.height = `${Math.min(area.scrollHeight, 140)}px`;
  }

  function emitPayloadToInput(inputId, payload) {
    const el = document.getElementById(inputId);
    if (!el) return;
    const field = el.querySelector('input, textarea');
    const target = field || el;
    const text = JSON.stringify(payload || {});
    const proto = target instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(proto.prototype, 'value');
    if (setter && typeof setter.set === 'function') {
      setter.set.call(target, text);
    } else {
      target.value = text;
    }
    target.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function getActionTarget(node) {
    return node && node.closest ? node.closest('[data-action]') : null;
  }

  function setProblemModalOpenState(isOpen) {
    const body = document.body;
    if (!body) return;
    const tray = document.getElementById('ct-practice-tray');
    body.classList.toggle('ct-modal-open', Boolean(isOpen));
    if (tray) {
      tray.classList.toggle('ct-practice-tray--modal-open', Boolean(isOpen));
    }
  }

  function closeProblemModalIfOpen() {
    const modal = document.getElementById('ct-problem-modal');
    if (!modal || !modal.classList.contains('open')) return false;
    setProblemModalOpenState(false);
    _isSolvingFromModal = false;
    if (typeof window.closeProblemModal === 'function') {
      window.closeProblemModal();
    } else {
      modal.classList.remove('open');
    }
    return true;
  }

  function bindGlobalEscape() {
    if (window.__ctGlobalEscapeBound) return;
    window.__ctGlobalEscapeBound = true;
    document.addEventListener('keydown', function (event) {
      if (event && event.key === 'Escape') {
        if (closeProblemModalIfOpen()) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
    });
  }

  function handleSelectTopicAction(actionEl) {
    if (typeof window.selectTopic !== 'function') return;
    window.selectTopic(
      actionEl.dataset.topic || '',
      actionEl.dataset.label || '',
      actionEl.dataset.domain || '',
      actionEl
    );
  }

  function handleDifficultyAction(actionEl) {
    if (typeof window.selectDiff !== 'function') return;
    window.selectDiff(actionEl.dataset.diff || 'standard', actionEl);
  }

  function handleDifficultySelect(selectEl) {
    if (typeof window.selectDiff !== 'function' || !selectEl) return;
    const diff = selectEl.value || 'standard';
    window.selectDiff(diff, null);
  }

  function handleChatSendAction() {
    const input = document.getElementById('ct-chat-input');
    const thread = document.getElementById('ct-chat-thread');
    const sendBtn = document.getElementById('ct-chat-send');
    if (!input || !input.value.trim()) return;

    const question = input.value.trim();
    input.value = '';
    autoResizeChatInput(input);
    const row = document.createElement('div');
    if (thread) {
      row.className = 'ct-msg user';
      const avatar = document.createElement('div');
      avatar.className = 'ct-msg-avatar';
      avatar.textContent = 'you';
      const body = document.createElement('div');
      const text = document.createElement('div');
      body.className = 'ct-msg-bubble';
      text.textContent = question;
      body.appendChild(text);
      row.appendChild(avatar);
      row.appendChild(body);
      thread.appendChild(row);
      thread.scrollTop = thread.scrollHeight;
    }
    if (sendBtn) sendBtn.disabled = true;
    emitPayloadToInput('ct-chat-payload', { question });
  }

  function handleChatGotItAction(actionEl) {
    const msgId = actionEl.dataset.msgId || '';
    const concept = actionEl.dataset.concept || '';
    emitPayloadToInput('ct-chatgotit-payload', { msgId, concept });
    if (actionEl && actionEl.dataset && !actionEl.classList.contains('confirmed')) {
      actionEl.classList.add('confirmed');
      actionEl.textContent = '✓ Got it';
    }
  }

  function setSolveProfile(actionEl) {
    const profile = actionEl.dataset.profile || '';
    if (!profile) return;
    document.querySelectorAll('.ct-solve-profile-btn').forEach((btn) => {
      btn.classList.toggle('ct-solve-profile-active', btn === actionEl);
    });
    emitPayloadToInput('ct-solve-profile', profile);
  }

  function expandStepWork(actionEl) {
    const panelId = actionEl.dataset.panelId || '';
    const mode = actionEl.dataset.mode || 'baby';
    if (!panelId) return;
    const row = actionEl.closest('.ct-step-row');
    let stepData = {};
    if (row && row.dataset && row.dataset.step) {
      try {
        stepData = JSON.parse(row.dataset.step || '{}');
      } catch (err) {
        stepData = {};
      }
    }
    const panel = document.getElementById(panelId);
    if (panel) {
      panel.classList.add('open');
      panel.innerHTML = '<div class="ct-why-loading"><div class="ct-spinner"></div> Expanding work…</div>';
    }
    emitPayloadToInput('ct-why-payload', {
      panelId,
      mode: 'work',
      stepData,
      targetColumn: mode,
    });
  }

  function handleSaveNoteAction(actionEl) {
    const stepId = actionEl.dataset.stepId || '';
    if (!stepId) return;
    emitPayloadToInput('ct-note-payload', { stepId, note: actionEl.value || '' });
  }

  function handleActionClick(event) {
    const actionEl = getActionTarget(event.target);
    if (!actionEl || !document.body.contains(actionEl)) return;

    const action = actionEl.dataset.action;
    switch (action) {
      case 'switch-mode':
        closeProblemModalIfOpen();
        if (typeof window.switchMode === 'function' && actionEl.dataset.mode) {
          window.switchMode(actionEl.dataset.mode);
        }
        break;
      case 'select-topic':
        handleSelectTopicAction(actionEl);
        break;
      case 'toggle-section':
        if (typeof window.toggleSection === 'function') {
          window.toggleSection(actionEl.dataset.domain || '');
        }
        break;
      case 'go-to-topic-domain':
        if (typeof window.goToTopicDomain === 'function') {
          window.goToTopicDomain(actionEl.dataset.domain || '');
        }
        break;
      case 'select-difficulty':
      case 'toggle-difficulty':
        handleDifficultyAction(actionEl);
        break;
      case 'generate-problem':
        if (actionEl.disabled) return;
        if (typeof window.triggerGenerate === 'function') window.triggerGenerate();
        break;
      case 'remove-tray-topic':
        if (typeof window._removeTrayTopic === 'function') {
          window._removeTrayTopic(Number(actionEl.dataset.index || 0));
        }
        break;
      case 'close-problem-modal':
        closeProblemModalIfOpen();
        break;
      case 'toggle-topic-nav':
        if (typeof window.toggleTopicsNav === 'function') {
          window.toggleTopicsNav();
        }
        break;
      case 'regenerate-problem':
        if (typeof window.regenerateProblem === 'function') window.regenerateProblem();
        break;
      case 'solve-from-modal':
      if (_isSolvingFromModal) return;
      _isSolvingFromModal = true;
      actionEl.disabled = true;
      actionEl.dataset.ctSolveState = 'busy';
        closeProblemModalIfOpen();
        if (typeof window.solveGeneratedProblem === 'function') window.solveGeneratedProblem();
      window.setTimeout(() => {
        _isSolvingFromModal = false;
        actionEl.disabled = false;
        actionEl.dataset.ctSolveState = '';
      }, 450);
        break;
      case 'next-topic':
        if (typeof window.nextTopicInQueue === 'function') window.nextTopicInQueue();
        break;
      case 'chat-send':
        handleChatSendAction();
        break;
      case 'chat-gotit':
        handleChatGotItAction(actionEl);
        break;
      case 'set-solve-profile':
        setSolveProfile(actionEl);
        break;
      case 'toggle-got-it':
        if (typeof window.toggleGotIt === 'function') {
          window.toggleGotIt(actionEl.dataset.stepId, actionEl);
        }
        break;
      case 'toggle-why':
        if (typeof window.toggleWhy === 'function') {
          const panelId = actionEl.dataset.panelId || '';
          const mode = actionEl.dataset.mode || 'baby';
          const buttonId = actionEl.dataset.btnId || actionEl.id;
          window.toggleWhy(buttonId, panelId, mode, actionEl);
        }
        break;
      case 'save-note':
        handleSaveNoteAction(actionEl);
        break;
      case 'expand-step-work':
        expandStepWork(actionEl);
        break;
      case 'insert-symbol':
        if (typeof window.insertSymbol === 'function') window.insertSymbol(actionEl);
        break;
      case 'toggle-hint':
        actionEl.classList.toggle('ct-hint-hidden');
        actionEl.classList.toggle('ct-hint-revealed');
        break;
      case 'scroll-memory':
        const memory = document.getElementById('ct-memory-panel');
        if (memory) memory.scrollIntoView({ behavior: 'smooth' });
        break;
      default:
        break;
    }
  }

  function handleActionInput(event) {
    const actionEl = getActionTarget(event.target);
    if (!actionEl || !document.body.contains(actionEl)) return;
    const action = actionEl.dataset.action;
    if (action === 'chat-input' && event.target instanceof HTMLTextAreaElement) {
      autoResizeChatInput(event.target);
      return;
    }
    if (action === 'difficulty-select' && event.target instanceof HTMLSelectElement) {
      handleDifficultySelect(event.target);
      return;
    }
    if (action === 'save-note') {
      handleSaveNoteAction(actionEl);
    }
  }

  function handleActionKeydown(event) {
    const actionEl = getActionTarget(event.target);
    if (!actionEl || !document.body.contains(actionEl)) return;
    const action = actionEl.dataset.action;
    if (event.key === 'Escape') {
      if (closeProblemModalIfOpen()) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }
    if (action === 'chat-input' && event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleChatSendAction();
      return;
    }
    if (action === 'save-note' && event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSaveNoteAction(actionEl);
      event.target.blur();
    }
  }

  function bindActionDelegates() {
    if (window.__ctActionDelegatesBound) return;
    window.__ctActionDelegatesBound = true;
    document.addEventListener('click', handleActionClick);
    document.addEventListener('input', handleActionInput);
    document.addEventListener('keydown', handleActionKeydown);
    document.addEventListener('change', handleActionInput);
  }

  function updateSelectionBar() {
    const defaultSelect = document.getElementById('ct-difficulty-select');
    if (defaultSelect) {
      defaultSelect.value = 'standard';
      handleDifficultySelect(defaultSelect);
    }
  }

  let _bridgeInitialized = false;
  function init() {
    if (_bridgeInitialized) return;
    _bridgeInitialized = true;
    updateSelectionBar();
    bindActionDelegates();
    bindGlobalEscape();
    if (typeof window.updateMathPreviewFromValue === 'function') {
      window.updateMathPreviewFromValue('');
    }
    if (typeof installLivePreview === 'function') {
      installLivePreview();
    }
  }

  window.CalcTutorBridge = {
    init,
    dispatchFrontendAction,
    renderLatexInNode,
    renderLatex,
    scheduleLatexRender,
    showProblemModal,
    startPracticeSolve,
    injectWhyResponse,
    injectChatResponse,
    updateMathPreviewFromValue,
    installLivePreview,
    updateSelectionBar,
    autoResizeChatInput,
  };

  window.dispatchFrontendAction = dispatchFrontendAction;
  window.renderLatex = renderLatex;
  window.renderLatexInNode = renderLatexInNode;
  window.updateMathPreviewFromValue = updateMathPreviewFromValue;
  window.updateMathPreview = function (textarea) {
    const node = getProblemInputTextArea(textarea);
    window.updateMathPreviewFromValue(node ? (node.value || '') : '');
  };
  window.autoResizeChatInput = autoResizeChatInput;
  window.startPracticeSolve = startPracticeSolve;
  window.chatGotIt = handleChatGotItAction;
  window.getMathPreviewDebugState = getMathPreviewDebugState;
  window.dumpMathPreviewDebugState = function () {
    const state = getMathPreviewDebugState();
    console.log('[calc-tutor math-preview]', state);
    return state;
  };
  window.ctDebugPreviewEvent = function(payload) {
    recordDebugEvent('debug-hook', payload);
  };

  init();
  window.CalcTutorBridgeState = previewState;
 

})(); 
