// 스크롤 진행도(0~1)로 영상 프레임과 자막을 제어합니다. 외부 라이브러리 없음.
(() => {
  const C = window.SITE_CONTENT;
  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;

  /* ---------- 설정 ---------- */
  const EASE = 0.12;                 // 0~1, 작을수록 부드럽게(느리게) 따라감
  const SOURCES = {
    hd: 'assets/hero-720.mp4',       // 1280×720, 9.6MB
    sd: 'assets/hero-480.mp4',       //  854×480, 3.6MB (데이터 절약/느린 회선)
  };

  /* ---------- content.js → 화면 ---------- */
  const get = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), C);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  // "\n" 을 <br> 로 (textContent 기반이라 HTML 이 섞여도 안전)
  const multiline = (tag, text, cls) => {
    const n = el(tag, cls);
    String(text).split('\n').forEach((line, i) => {
      if (i) n.append(document.createElement('br'));
      n.append(line);
    });
    return n;
  };

  document.querySelectorAll('[data-k]').forEach((n) => { n.textContent = get(n.dataset.k) ?? ''; });
  $('scrollHintText').textContent = C.scrollHint;
  $('loaderText').textContent = C.loadingText;

  const capWrap = $('captions');
  C.captions.forEach((c, i) => {
    const box = el('div', `caption caption--${c.position || 'bottom-left'}`);
    box.dataset.in = c.in;
    box.dataset.out = c.out;
    if (c.showWhenStatic) box.dataset.static = '';
    if (c.eyebrow) box.append(el('p', 'eyebrow', c.eyebrow));
    box.append(multiline(i === 0 ? 'h1' : 'p', c.title));
    box.lastChild.setAttribute('role', 'heading');
    box.lastChild.setAttribute('aria-level', i === 0 ? '1' : '2');
    if (box.lastChild.tagName === 'P') box.lastChild.classList.add('h1');
    if (c.cta) {
      const a = el('a', 'btn-light', c.cta.label);
      a.href = c.cta.href;
      box.append(a);
    }
    capWrap.append(box);
  });

  C.intro.body.forEach((t) => $('introBody').append(el('p', null, t)));
  C.intro.facts.forEach((f) => {
    const row = el('div');
    row.append(el('dt', null, f.label), el('dd', null, f.value));
    $('introFacts').append(row);
  });
  C.conquests.items.forEach((it) => {
    const li = el('li');
    li.append(el('span', 'year', it.year), el('h3', null, it.title), el('p', null, it.desc));
    $('conquestList').append(li);
  });
  C.timeline.items.forEach((it) => {
    const li = el('li');
    li.append(el('span', 'year', it.year), el('p', null, it.text));
    $('timelineList').append(li);
  });
  C.menus.cards.forEach((c) => {
    const a = el('a', 'card');
    a.href = c.href;
    const img = el('div', 'card__img');
    img.style.backgroundImage = `url("${c.img}")`;
    const body = el('div', 'card__body');
    body.append(el('h3', null, c.title), el('p', null, c.desc));
    a.append(img, body);
    $('menuGrid').append(a);
  });

  /* ---------- 히어로 ---------- */
  const hero = document.querySelector('.hero');
  const stage = $('stage');
  const video = $('heroVideo');
  const timed = [...document.querySelectorAll('.stage [data-in]')];

  // 접근성: 모션 줄이기 → 영상 대신 첫 프레임 정지 이미지
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('is-static');
    video.remove();
    $('heroStill').hidden = false;
    timed.forEach((n) => n.classList.toggle('is-on', n.hasAttribute('data-static')));
    return;
  }

  // 회선이 느리거나 데이터 절약 모드면 480p, 그 외에는 720p.
  // (세로 화면에서는 cover 로 영상 가운데만 확대돼 보이므로 폰에서도 기본은 720p 가 낫다)
  const conn = navigator.connection || {};
  const useSD = conn.saveData || /2g|3g/.test(conn.effectiveType || '');
  const src = useSD ? SOURCES.sd : SOURCES.hd;

  root.classList.add('is-loading');
  const pct = $('loaderPct');
  let ready = false;

  function onReady() {
    if (ready) return;
    ready = true;
    // iOS Safari: 한 번 play→pause 해 둬야 currentTime 변경 시 화면이 갱신됨
    const p = video.play();
    if (p && p.then) p.then(() => video.pause()).catch(() => {});
    else video.pause();
    pct.textContent = '100%';
    root.classList.remove('is-loading');
    stage.classList.add('is-ready');
    readScroll();
  }

  function fail() {
    $('placeholder').hidden = false;
    root.classList.remove('is-loading');
    stage.classList.add('is-ready');
  }

  video.addEventListener('error', fail);

  // 영상 전체를 Blob 으로 받아 두면 탐색할 때 네트워크 요청이 없어 훨씬 매끄럽고,
  // 로딩 % 도 보여줄 수 있다. 실패하면(file:// 등) 일반 src 로 대체.
  async function load() {
    try {
      const res = await fetch(src);
      if (!res.ok || !res.body) throw new Error(res.status);
      const total = +res.headers.get('content-length') || 0;
      const reader = res.body.getReader();
      const chunks = [];
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        got += value.length;
        if (total) pct.textContent = `${Math.min(99, Math.floor((got / total) * 100))}%`;
      }
      video.src = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));
    } catch {
      video.src = src;
      pct.textContent = '';
    }
    video.load();
  }

  video.addEventListener('loadeddata', onReady, { once: true });
  // 일부 iOS 는 loadeddata 가 늦게 오므로 메타데이터 이후 canplaythrough 도 받는다
  video.addEventListener('canplaythrough', onReady, { once: true });
  load();

  /* ---------- 스크롤 → 진행도 → currentTime (rAF + lerp) ---------- */
  let target = 0;
  let current = 0;

  function readScroll() {
    const r = hero.getBoundingClientRect();
    const span = r.height - stage.offsetHeight;
    target = Math.min(1, Math.max(0, -r.top / (span || 1)));
  }

  function tick() {
    current += (target - current) * EASE;
    if (Math.abs(target - current) < 0.0005) current = target;

    root.style.setProperty('--p', current.toFixed(4));

    // 이전 탐색이 끝나기 전에 또 탐색을 걸면 디코더에 요청이 쌓여 끊긴다 → seeking 중이면 건너뜀
    if (ready && video.duration && !video.seeking) {
      const t = current * (video.duration - 0.05);
      if (Math.abs(video.currentTime - t) > 1 / 60) video.currentTime = t;
    }

    for (const n of timed) {
      n.classList.toggle('is-on', current >= +n.dataset.in && current < +n.dataset.out);
    }
    requestAnimationFrame(tick);
  }

  addEventListener('scroll', readScroll, { passive: true });
  addEventListener('resize', readScroll);
  readScroll();
  requestAnimationFrame(tick);
})();
