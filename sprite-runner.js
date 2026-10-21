(async () => {
  "use strict";
  const { drawBreathingFrame } = await import("./animation-library/player.js?v=breathing-v1");
  let breathEffect = null;
  const $ = (id) => document.getElementById(id);
  const canvas = $("sprite-canvas"), context = canvas.getContext("2d");
  let image = null, config = null, elapsed = 0, playing = false, previousTime = null;
  let currentFrame = -1, cards = [], objectURL = null, requestId = 0;
  let breathingTime = 0, resting = false;
  let registration = [], frameMap = null;
  const presets = {
    smooth: { file: "animation/sparky/improved/04-room-game-lu-n-look-left/Sparky_Head_Look_v2.png", title: "Sparky · Head look + return", columns: 5, rows: 2, count: 10,
      holds: "600, 70, 70, 70, 90, 1000, 90, 70, 70, 70", loop: true, breathing: false, offsets: [],
      note: "Six unique drawings with two generated turn angles. Body artwork is reused identically below the neck; ten timed cells include a gradual return. Original source sheet is preserved." },
    look: { file: "Four-key head-look animation sheet.png", title: "Sparky · Head look", count: 4, holds: "600, 140, 220, 1200", loop: false, breathing: false,
      offsets: [[-52.5,-26],[16,-26],[-52,-26+61],[16.5,-26+61]],
      note: "Four original head-look keys, aligned using shoe contacts without rescaling. One-shot ends on the turned pose; intermediate turn drawings are not present." },
    blink: { file: "Sparky_Idle_EB_4_Keys.png", title: "Sparky · Breathing + blink", count: 4, holds: "2200, 60, 80, 100", loop: true, breathing: true, offsets: [],
      note: "Four blink poses with optional live breathing. The source sheet remains unchanged." },
    idle: { file: "Sparky_Idle_3_Key_Review.png", title: "Sparky · Idle keys", count: 3, holds: "1400, 1100, 700", loop: true, breathing: false, offsets: [],
      note: "Three original idle review keys with held exposures; no generated in-betweens." }
  };
  const frameBuffer = document.createElement("canvas"), frameContext = frameBuffer.getContext("2d");
  const value = (id) => Number($(id).value);

  function parseConfig(img) {
    const columns = value("columns"), rows = value("rows"), count = value("count"), fps = value("fps");
    if (![columns, rows, count].every(Number.isInteger) || columns < 1 || rows < 1 || columns > 64 || rows > 64 || count < 1 || count > 512 || (!frameMap && count > columns * rows)) throw new Error("Use whole grid sizes from 1–64 and a frame count within the grid (up to 512).");
    if (!Number.isFinite(fps) || fps < 0.1 || fps > 120) throw new Error("FPS must be between 0.1 and 120.");
    if (img.naturalWidth % columns || img.naturalHeight % rows) throw new Error("The image dimensions must divide evenly into the selected columns and rows.");
    const custom = $("timing").value.trim();
    const holds = custom ? custom.split(",").map((part) => Number(part.trim())) : Array(count).fill(1000 / fps);
    if (holds.length !== count || holds.some((n) => !Number.isFinite(n) || n <= 0)) throw new Error("Enter one positive hold duration for each frame, separated by commas.");
    const total = holds.reduce((a, b) => a + b, 0);
    if (!Number.isFinite(total)) throw new Error("Frame durations are too large.");
    return { columns, rows, count, holds, total, width: img.naturalWidth / columns, height: img.naturalHeight / rows };
  }
  function frameAt(time) {
    let end = 0;
    for (let i = 0; i < config.count; i++) { end += config.holds[i]; if (time < end) return i; }
    return config.count - 1;
  }
  function crop(ctx, index, width, height) {
    const cell=frameMap?.[index]??index;
    const x = (cell % config.columns) * config.width;
    const y = Math.floor(cell / config.columns) * config.height;
    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = !$("pixelated").checked;
    ctx.imageSmoothingQuality = "high";
    const [dx,dy] = registration[index] || [0,0];
    ctx.drawImage(image, x, y, config.width, config.height,
      dx * width / config.width, dy * height / config.height, width, height);
  }
  function drawBreathing() {
    const w = canvas.width, h = canvas.height;
    // Registration for this standing Sparky sheet: rigid head above shoulders,
    // gradual chest extension toward a fixed waist, untouched lower body.
    const shoulders = h * (400 / 640), waist = h * (520 / 640);
    const lift = value("breath-strength") * h / 640 * (1 - Math.cos(2 * Math.PI * breathingTime / 3400)) / 2;
    context.clearRect(0, 0, w, h);
    context.imageSmoothingEnabled = !$("pixelated").checked;
    context.imageSmoothingQuality = "high";
    // One continuous piecewise-affine mapping keeps the head rigid, with no
    // independent silhouette centering, detached cutouts or whole-body scaling.
    context.drawImage(frameBuffer, 0, 0, w, shoulders, 0, -lift, w, shoulders);
    context.drawImage(frameBuffer, 0, shoulders, w, waist - shoulders,
      0, shoulders - lift, w, waist - shoulders + lift);
    context.drawImage(frameBuffer, 0, waist, w, h - waist, 0, waist, w, h - waist);
  }
  function paint(force = false) {
    if (!image || !config) return;
    const index = frameAt(elapsed);
    if (force || index !== currentFrame) {
      currentFrame = index;
      crop(frameContext, index, frameBuffer.width, frameBuffer.height);
      cards.forEach((card, i) => card.setAttribute("aria-pressed", String(i === index)));
    }
    if (breathEffect?.enabled) {
      context.clearRect(0,0,canvas.width,canvas.height);
      drawBreathingFrame(context,frameBuffer,0,0,canvas.width,canvas.height,breathEffect,breathingTime,index);
    }
    else if ($("breathing").checked) drawBreathing();
    else { context.clearRect(0,0,canvas.width,canvas.height); context.drawImage(frameBuffer,0,0); }
    $("frame-readout").textContent = `Frame ${index + 1} / ${config.count}`;
    $("scrub").value = String(Math.min(elapsed, config.total - 1));
    $("time-readout").textContent = `${(elapsed / 1000).toFixed(2)} / ${(config.total / 1000).toFixed(2)}s`;
  }
  function setPlaying(next) {
    resting = false;
    playing = next && Boolean(config); previousTime = null;
    $("play").textContent = playing ? "Pause" : "Play";
    $("play").disabled = !config;
    $("playback-state").textContent = playing ? "Playing" : "Paused";
  }
  function jump(index) {
    elapsed = config.holds.slice(0, index).reduce((a,b) => a+b, 0);
    setPlaying(false); paint();
  }
  function apply(nextImage = image) {
    const nextConfig = parseConfig(nextImage);
    image = nextImage; config = nextConfig; elapsed = 0; currentFrame = -1;
    canvas.width = frameBuffer.width = config.width; canvas.height = frameBuffer.height = config.height;
    breathingTime = 0;
    $("scrub").max = String(Math.max(0, config.total - 1));
    $("sheet-size").textContent = `${image.naturalWidth} × ${image.naturalHeight} · ${config.width} × ${config.height} cells`;
    $("frame-strip").replaceChildren(); cards = [];
    for (let i = 0; i < config.count; i++) {
      const card = document.createElement("button"); card.type = "button"; card.className = "frame-card";
      card.setAttribute("aria-label", `Show frame ${i + 1}`);
      const thumb = document.createElement("canvas"); thumb.width = 120; thumb.height = Math.round(120 * config.height / config.width);
      crop(thumb.getContext("2d"), i, thumb.width, thumb.height);
      const label = document.createElement("span"); label.textContent = `K${String(i + 1).padStart(2,"0")} · ${Math.round(config.holds[i])} ms`;
      card.append(thumb,label); card.addEventListener("click", () => jump(i));
      $("frame-strip").append(card); cards.push(card);
    }
    $("settings-error").textContent = "";
    setPlaying(true); paint(true);
  }
  async function load(src, name) {
    const id = ++requestId;
    const candidate = new Image(); candidate.src = src;
    try {
      await candidate.decode(); if (id !== requestId) return;
      apply(candidate);
      $("source-name").textContent = name;
    } catch (error) { if (id === requestId) $("settings-error").textContent = `Could not load sheet: ${error.message}`; }
  }
  function tick(now) {
    if ((playing || resting) && config) {
      if (previousTime !== null) {
        const delta = (now - previousTime) * value("speed");
        if (playing) elapsed += delta;
        breathingTime = (breathingTime + delta) % (breathEffect?.periodMs || 3400);
        if (playing && elapsed >= config.total) {
          if ($("loop").checked) elapsed %= config.total;
          else { elapsed = config.total; setPlaying(false); resting = Boolean(breathEffect?.enabled); if (resting) { $("play").textContent = "Pause"; $("playback-state").textContent = "Holding pose · breathing"; } }
        }
      }
      previousTime = (playing || resting) ? now : null; paint();
    }
    requestAnimationFrame(tick);
  }
  $("play").addEventListener("click", () => { if (playing || resting) { setPlaying(false); paint(); return; } if (config && elapsed >= config.total) elapsed = 0; setPlaying(true); paint(); });
  $("restart").addEventListener("click", () => { if (!config) return; elapsed = 0; breathingTime = 0; setPlaying(true); paint(); });
  $("previous").addEventListener("click", () => { if (config) jump((currentFrame - 1 + config.count) % config.count); });
  $("next").addEventListener("click", () => { if (config) jump((currentFrame + 1) % config.count); });
  $("scrub").addEventListener("input", () => { if (config) { elapsed = value("scrub"); setPlaying(false); paint(); } });
  $("speed").addEventListener("change", () => { previousTime = null; });
  $("settings").addEventListener("submit", (event) => { event.preventDefault(); if (!image) return; try { apply(); } catch (error) { $("settings-error").textContent = error.message; } });
  $("breathing").addEventListener("change", () => paint(true));
  $("breath-strength").addEventListener("input", () => {
    $("breath-value").textContent = `${value("breath-strength")} px`;
    paint(true);
  });
  $("background").addEventListener("change", () => { $("sprite-stage").dataset.background = $("background").value; });
  $("pixelated").addEventListener("change", () => {
    canvas.style.imageRendering = $("pixelated").checked ? "pixelated" : "auto";
    if (config) { cards.forEach((card,i) => { const c = card.querySelector("canvas"); crop(c.getContext("2d"),i,c.width,c.height); }); paint(true); }
  });
  async function usePreset(id) {
    const preset = presets[id];
    if (!preset) return;
    setPlaying(false);
    $("columns").value = String(preset.columns || 2); $("rows").value = String(preset.rows || 2); $("count").value = String(preset.count);
    $("fps").value = String(preset.fps || 3);
    $("timing").value = preset.holds; $("loop").checked = preset.loop; $("breathing").checked = preset.breathing;
    frameMap=preset.frameMap||null; registration = preset.offsets; breathEffect = preset.breathEffect || null;
    await load(preset.assetRevision ? `${preset.file}?revision=${preset.assetRevision}` : preset.file, preset.file);
    $("sheet-title").textContent = preset.title;
    $("preview-note").textContent = preset.note;
  }
  async function refreshCollection() {
    const status = $("collection-status");
    try {
      const response = await fetch("animation/sparky/improved/manifest.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const manifest = await response.json();
      if (manifest.version !== 1 || !Array.isArray(manifest.entries)) throw new Error("Unsupported collection manifest.");
      const group = document.createElement("optgroup"); group.label = "Improved collection"; group.id = "improved-options";
      const nextPresets = {}; const ids = new Set();
      let ready = 0, available = 0;
      for (const entry of manifest.entries) {
        if (!entry || typeof entry.id !== "string" || typeof entry.clip !== "string" || ids.has(entry.id)) throw new Error("Invalid or duplicate collection entry.");
        ids.add(entry.id);
        const id = `collection:${entry.id}`, option = document.createElement("option"); option.value = id;
        if (entry.status === "ready") {
          const playback = entry.playback;
          if (!playback || typeof playback.file !== "string" || !playback.file.startsWith("animation/sparky/improved/") || playback.file.includes("..") || ![playback.columns,playback.rows,playback.count].every(Number.isInteger) || playback.columns<1 || playback.columns>64 || playback.rows<1 || playback.rows>64 || playback.count<1 || (playback.count>512||(!playback.frameMap&&playback.count>playback.columns*playback.rows)) || !Array.isArray(playback.holds) || playback.holds.length!==playback.count || playback.holds.some(n => !Number.isFinite(n) || n<=0)) throw new Error(`Invalid playback settings for ${entry.clip}.`);
          nextPresets[id] = { ...playback, title: `Sparky · ${entry.clip}`, holds: playback.holds.join(", "), offsets: playback.offsets || [], breathing: false };
          option.textContent = `${entry.clip} · ${entry.review?.artisticApproval ? "approved" : "review export"}`; ready++;
        } else {
          const hasInput = entry.status === "input_available";
          if (hasInput) available++;
          option.textContent = `${entry.clip} · ${hasInput ? "input available — improvement pending" : "awaiting input"}`;
          option.disabled = true;
        }
        group.append(option);
      }
      const selected = $("sheet-preset").value;
      const oldGroup = $("improved-options");
      for (const id of Object.keys(presets)) if (id.startsWith("collection:")) delete presets[id];
      Object.assign(presets,nextPresets);
      if (oldGroup) oldGroup.replaceWith(group); else $("sheet-preset").prepend(group);
      if (nextPresets[selected]) $("sheet-preset").value = selected;
      else if (selected.startsWith("collection:")) $("sheet-preset").value = "smooth";
      status.textContent = `${ready} / ${manifest.entries.length} playable · ${available} sources pending · ${manifest.entries.length-ready-available} awaiting input. Visual approval is separate.`;
      return Object.keys(nextPresets)[0] || null;
    } catch (error) {
      status.textContent = `Collection unavailable: ${error.message}. Existing saved animations still work.`;
      return null;
    }
  }
  $("refresh-collection").addEventListener("click", refreshCollection);
  $("sheet-preset").addEventListener("change", () => usePreset($("sheet-preset").value));
  $("upload").addEventListener("change", async () => {
    const file = $("upload").files[0]; if (!file) return;
    if (objectURL) URL.revokeObjectURL(objectURL);
    objectURL = URL.createObjectURL(file);
    // New sheets start as one complete cell so they are never silently miscut.
    registration = []; frameMap=null; breathEffect = null;
    $("sheet-preset").value = "";
    $("breathing").checked = false;
    $("columns").value = "1"; $("rows").value = "1"; $("count").value = "1"; $("timing").value = "";
    await load(objectURL, file.name);
    $("sheet-title").textContent = file.name.replace(/\.[^.]+$/, "");
    $("preview-note").textContent = "Set the grid and frame count, then apply settings to preview your sheet.";
  });
  document.addEventListener("visibilitychange", () => { previousTime = null; });
  refreshCollection().then((first) => {
    const requested = new URLSearchParams(window.location.search).get("animation");
    const requestedPreset = requested ? `collection:${requested}` : "";
    const initial = requestedPreset && presets[requestedPreset] ? requestedPreset : first || "smooth";
    $("sheet-preset").value = initial;
    usePreset(initial);
  });
  requestAnimationFrame(tick);
})();
