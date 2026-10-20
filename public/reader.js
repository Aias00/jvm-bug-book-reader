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
