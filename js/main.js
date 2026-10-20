(function () {
  "use strict";

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {  } }
  };

  const root = document.documentElement;
  const themeBtn = document.getElementById("themeToggle");
  function applyTheme(t) {
    root.setAttribute("data-theme", t);
    if (themeBtn) {
      themeBtn.textContent = t === "dark" ? "☀️" : "🌙";
      themeBtn.setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
    }
  }
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(store.get("inkwell-theme", prefersDark ? "dark" : "light"));
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      store.set("inkwell-theme", next);
    });
  }

  const menuBtn = document.getElementById("menuToggle");
  const nav = document.getElementById("mainNav");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      const open = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open);
    });
  }

  const likes = JSON.parse(store.get("inkwell-likes", "{}") || "{}");
  function paintLike(btn) {
    const id = btn.dataset.id;
    const base = parseInt(btn.dataset.base, 10) || 0;
    const liked = !!likes[id];
    btn.classList.toggle("liked", liked);
    btn.setAttribute("aria-pressed", liked);
    btn.querySelector(".heart").textContent = liked ? "♥" : "♡";
    btn.querySelector(".count").textContent = base + (liked ? 1 : 0);
  }
  document.querySelectorAll(".like-btn").forEach(function (btn) {
    paintLike(btn);
    btn.addEventListener("click", function () {
      const id = btn.dataset.id;
      likes[id] = !likes[id];
      if (!likes[id]) delete likes[id];
      store.set("inkwell-likes", JSON.stringify(likes));
     
      document.querySelectorAll('.like-btn[data-id="' + id + '"]').forEach(paintLike);
    });
  });

  document.querySelectorAll(".synopsis-toggle").forEach(function (btn) {
    const target = document.getElementById(btn.getAttribute("aria-controls"));
    btn.addEventListener("click", function () {
      const hidden = target.hasAttribute("hidden");
      if (hidden) target.removeAttribute("hidden"); else target.setAttribute("hidden", "");
      btn.setAttribute("aria-expanded", hidden);
      btn.textContent = hidden ? "Hide synopsis" : "Show synopsis";
    });
  });

  const overlay = document.getElementById("modalOverlay");
  if (overlay) {
    const mImg = overlay.querySelector("img");
    const set = function (sel, txt) { overlay.querySelector(sel).textContent = txt; };
    let lastFocus = null;
    function closeModal() {
      overlay.classList.remove("open");
      document.body.style.overflow = "";
      if (lastFocus) lastFocus.focus();
    }
    document.querySelectorAll(".details-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const card = btn.closest(".book-card");
        lastFocus = btn;
        mImg.src = card.dataset.cover;
        mImg.alt = "Cover of " + card.dataset.title;
        set("#mTitle", card.dataset.title);
        set("#mAuthor", "by " + card.dataset.author);
        set("#mGenre", card.dataset.genre + " • " + card.dataset.chapter);
        set("#mSynopsis", card.dataset.synopsis);
        overlay.querySelector("#mRead").href = card.dataset.url;
        overlay.classList.add("open");
        document.body.style.overflow = "hidden";
        overlay.querySelector(".modal-close").focus();
      });
    });
    overlay.addEventListener("click", function (e) { if (e.target === overlay) closeModal(); });
    overlay.querySelector(".modal-close").addEventListener("click", closeModal);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && overlay.classList.contains("open")) closeModal(); });
  }

  const bar = document.getElementById("progressBar");
  const reader = document.getElementById("reader");
  if (bar && reader) {
    const update = function () {
      const rect = reader.getBoundingClientRect();
      const total = rect.height - window.innerHeight * 0.6;
      const done = Math.min(Math.max(-rect.top + 80, 0), Math.max(total, 1));
      const pct = Math.round((done / Math.max(total, 1)) * 100);
      bar.style.width = pct + "%";
      bar.setAttribute("aria-valuenow", pct);
      const label = document.getElementById("progressLabel");
      if (label) label.textContent = pct + "% read";
    };
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  const track = document.getElementById("popTrack");
  if (track) {
    const prev = document.getElementById("popPrev");
    const next = document.getElementById("popNext");
    const step = function () { return Math.max(track.clientWidth * 0.8, 150); };
    let timer = null;
    function go(dir) {
      const max = track.scrollWidth - track.clientWidth;
      if (dir > 0 && track.scrollLeft >= max - 4) track.scrollTo({ left: 0 });
      else if (dir < 0 && track.scrollLeft <= 4) track.scrollTo({ left: max });
      else track.scrollBy({ left: dir * step() });
    }
    function start() {
      stop();
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      timer = setInterval(function () { go(1); }, 4000);
    }
    function stop() { clearInterval(timer); }
    prev.addEventListener("click", function () { go(-1); start(); });
    next.addEventListener("click", function () { go(1); start(); });
    track.parentElement.addEventListener("mouseenter", stop);
    track.parentElement.addEventListener("mouseleave", start);
    track.parentElement.addEventListener("focusin", stop);
    track.parentElement.addEventListener("focusout", start);
    start();
  }

  const grid = document.getElementById("bookGrid");
  const chips = document.querySelectorAll(".chip[data-genre]");
  const search = document.getElementById("searchBox");
  if (grid && chips.length) {
    const cards = Array.from(grid.querySelectorAll(".book-card"));
    const empty = document.getElementById("emptyMsg");
    const count = document.getElementById("resultCount");
    let genre = "All";
    function filter() {
      const q = search ? search.value.trim().toLowerCase() : "";
      let shown = 0;
      cards.forEach(function (c) {
        const okGenre = genre === "All" || c.dataset.genre === genre;
        const okText = !q || (c.dataset.title + " " + c.dataset.author + " " + c.dataset.genre).toLowerCase().indexOf(q) > -1;
        const vis = okGenre && okText;
        c.hidden = !vis;
        c.style.display = vis ? "" : "none";
        if (vis) shown++;
      });
      if (empty) empty.style.display = shown ? "none" : "block";
      if (count) count.textContent = shown + " of " + cards.length + " stories";
    }
    function setGenre(g) {
      genre = g;
      chips.forEach(function (c) {
        const on = c.dataset.genre === g;
        c.classList.toggle("active", on);
        c.setAttribute("aria-pressed", on);
      });
      filter();
    }
    chips.forEach(function (c) { c.addEventListener("click", function () { setGenre(c.dataset.genre); }); });
    if (search) search.addEventListener("input", filter);
    const q0 = new URLSearchParams(window.location.search).get("q");
    if (search && q0) search.value = q0;
    const wanted = new URLSearchParams(window.location.search).get("genre");
    setGenre(wanted && document.querySelector('.chip[data-genre="' + wanted + '"]') ? wanted : "All");
  }

  const fontBtns = document.querySelectorAll("[data-font]");
  if (fontBtns.length) {
    let size = parseFloat(store.get("inkwell-font", "1.12"));
    const apply = function () { root.style.setProperty("--read-size", size + "rem"); store.set("inkwell-font", size); };
    apply();
    fontBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        size = Math.min(1.6, Math.max(0.9, size + (b.dataset.font === "up" ? 0.1 : -0.1)));
        apply();
      });
    });
  }
})();
