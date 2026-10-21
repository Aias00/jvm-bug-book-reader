(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const storage = {
    get(key) { try { return localStorage.getItem(`jvm-book:${key}`); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(`jvm-book:${key}`, value); } catch { /* Reading works without storage. */ } }
  };
  const theme = $('#theme'), size = $('#font-size');
  const savedTheme = storage.get('theme'), savedSize = storage.get('size');
  if (['auto','light','dark','paper'].includes(savedTheme)) theme.value = savedTheme;
  if (['17','19','22'].includes(savedSize)) size.value = savedSize;
  function preferences() {
    document.documentElement.dataset.theme = theme.value;
    document.documentElement.style.setProperty('--reader-size', `${size.value}px`);
    storage.set('theme', theme.value); storage.set('size', size.value);
  }
  preferences();
  theme.addEventListener('change', preferences); size.addEventListener('change', preferences);
  const menu = $('#menu');
  function closeMenu() { document.body.classList.remove('menu-open'); menu.setAttribute('aria-expanded','false'); }
  menu.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open'); menu.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeMenu(); menu.focus(); } });
  $('#sidebar').addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
  const sections = [...document.querySelectorAll('#content > section.level1')];
  const links = [...document.querySelectorAll('#chapters a')];
  const index = sections.map(section => ({
    id: section.id, title: section.querySelector('h1').textContent,
    text: section.textContent.replace(/\s+/g, ' ')
  }));
  $('#search').addEventListener('input', e => {
    const query = e.target.value.trim().toLocaleLowerCase();
    const results = $('#results'); results.replaceChildren();
    results.hidden = !query; $('#chapters').hidden = !!query;
    if (!query) { $('#search-status').textContent = ''; return; }
    let count = 0;
    for (const item of index) {
      const offset = item.text.toLocaleLowerCase().indexOf(query);
      if (offset < 0) continue;
      count++;
      const link = document.createElement('a'); link.href = `#${encodeURIComponent(item.id)}`;
      const title = document.createElement('strong'); title.textContent = item.title;
      const snippet = document.createElement('small');
      snippet.textContent = `${offset > 30 ? '…' : ''}${item.text.slice(Math.max(0,offset-30),offset+query.length+65)}…`;
      link.append(title,snippet); results.append(link);
    }
    $('#search-status').textContent = count ? `找到 ${count} 个相关章节，点击跳转；正文内可用浏览器查找。` : '没有找到相关内容，试试更短的关键词。';
  });
  const saved = storage.get('position');
  if (saved) {
    try {
      const position = JSON.parse(saved);
      const section = document.getElementById(position.id);
      if (section && Number.isFinite(position.ratio)) {
        $('#resume').hidden = false;
        $('#resume').addEventListener('click', () => {
          const ratio = Math.max(0, Math.min(1, position.ratio));
          window.scrollTo(0, section.offsetTop + ratio * section.offsetHeight - 85);
        });
      }
    } catch { /* Ignore stale reading data. */ }
  }
  let pending = false, timer;
  function update() {
    pending = false;
    const range = document.documentElement.scrollHeight - innerHeight;
    $('#progress-bar').style.width = `${range > 0 ? Math.min(100, scrollY / range * 100) : 0}%`;
    let current = null;
    for (const section of sections) if (section.getBoundingClientRect().top <= 130) current = section;
    links.forEach(link => {
      if (current && decodeURIComponent(link.hash.slice(1)) === current.id) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
    clearTimeout(timer);
    if (current) {
      const record = {id:current.id,ratio:Math.max(0, Math.min(1,(scrollY + 85 - current.offsetTop)/current.offsetHeight))};
      timer = setTimeout(() => storage.set('position',JSON.stringify(record)),200);
    }
  }
  addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(update); } }, {passive:true});
  addEventListener('resize',update); update();
  document.querySelectorAll('pre').forEach(pre => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'copy'; button.textContent = '复制';
    button.setAttribute('aria-label','复制代码');
    button.addEventListener('click',async () => {
      try { await navigator.clipboard.writeText(pre.querySelector('code').textContent); button.textContent = '已复制'; }
      catch { button.textContent = '请选中文本复制'; }
      setTimeout(() => { button.textContent = '复制'; },1800);
    });
    pre.append(button);
  });
})();

/* BEGIN AIAS SHARED READER */
/* Aias Reader 1.0. Shared preference across books on aias00.github.io. */
(() => {
  'use strict';
  const root = document.documentElement;
  const key = 'aias-reader-theme';
  const read = () => { try { return localStorage.getItem(key); } catch { return null; } };
  let theme = read() === 'dark' ? 'dark' : 'light';
  let control;
  function apply() {
    root.dataset.theme = theme;
    if (document.body) document.body.classList.toggle('dark', theme === 'dark');
    const palette = document.querySelector('[data-md-component="palette"]');
    if (palette) {
      const scheme = theme === 'dark' ? 'slate' : 'default';
      document.body.dataset.mdColorScheme = scheme;
      const selected = palette.querySelector(`input[data-md-color-scheme="${scheme}"]`);
      if (selected) {
        selected.checked = true;
        palette.querySelectorAll('label[for]').forEach(label => { label.hidden = label.htmlFor === selected.id; });
      }
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#1c1f24' : '#f7f7f3');
    if (!control) return;
    if (control.tagName === 'SELECT') {
      control.value = theme;
    } else {
      control.textContent = theme === 'dark' ? '切换浅色' : '切换深色';
      control.setAttribute('aria-pressed', String(theme === 'dark'));
    }
    control.setAttribute('aria-label', theme === 'dark' ? '切换到浅色模式' : '切换到深色模式');
  }
  apply();
  function initialize() {
    const palette = document.querySelector('[data-md-component="palette"]');
    if (palette) {
      palette.addEventListener('change', event => {
        theme = event.target.dataset.mdColorScheme === 'slate' ? 'dark' : 'light';
        try { localStorage.setItem(key, theme); } catch { /* Optional persistence. */ }
        apply();
      });
      apply();
      return;
    }
    control = document.querySelector('#theme-toggle, #theme, select[name="theme"]');
    if (!control) {
      const bar = document.createElement('div');
      bar.className = 'aias-reader-tools';
      const home = document.createElement('a');
      home.href = 'https://aias00.github.io/#books';
      home.textContent = 'Aias · 电子书架';
      control = document.createElement('button');
      control.type = 'button';
      bar.append(home, control);
      (document.querySelector('main') || document.body).prepend(bar);
    }
    control.hidden = false;
    control.classList.add('aias-reader-theme');
    if (control.tagName === 'SELECT') {
      control.replaceChildren(...['light', 'dark'].map(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value === 'light' ? '浅色' : '深色';
        return option;
      }));
    }
    const eventName = control.tagName === 'SELECT' ? 'change' : 'click';
    // Capture before legacy handlers; all other reader controls keep working.
    document.addEventListener(eventName, event => {
      if (!control.contains(event.target)) return;
      event.stopImmediatePropagation();
      if (eventName === 'click') event.preventDefault();
      theme = control.tagName === 'SELECT' ? control.value : theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, theme); } catch { /* Reading works without storage. */ }
      apply();
    }, true);
    apply();
  }
  // Legacy initializers finish first; the shared preference is applied last.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initialize, 0), { once: true });
  } else {
    setTimeout(initialize, 0);
  }
  addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    theme = event.newValue === 'dark' ? 'dark' : 'light';
    apply();
  });
})();
/* END AIAS SHARED READER */
