const RIGS = [
  { id: "garden", label: "Toy Garden", folder: "garden", skeleton: "Lucas_Toy_Garden.skel", atlas: "Lucas_Toy_Garden.atlas", page: "Lucas_Toy_Garden.png", size: "828 x 828", note: "Garden rig and atlas names match. Controller statuses are separate from the Spine clip list." },
  { id: "room", label: "Room", folder: "room", skeleton: "Lucas_Room_Game.skel", atlas: "Lucas_Room_Game.atlas", page: "Lucas_Room_Game.png", size: "876 x 876", note: "Room rig and atlas names match. Controller statuses are separate from the Spine clip list." },
  { id: "activity-game", label: "Activity Game", folder: "activity", skeleton: "Lucas_Activity_Kids.skel", atlas: "Lucas_Activity_Kids_Game.atlas", page: "Lucas_Activity_Kids_Game.png", size: "860 x 860", tentative: true, note: "The activity-game skeleton and atlas pairing is tentative; verify the exported pairing in Spine before relying on this preview." },
  { id: "activity-intro", label: "Activity Intro", folder: "activity", skeleton: "Lucas_Activity_Kids_Intro.skel", atlas: "Lucas_Activity_Kids_Intro.atlas", page: "Lucas_Activity_Kids_Intro.png", size: "732 x 732", note: "Activity intro rig and atlas names match. Controller statuses are separate from the Spine clip list." },
  { id: "icecream", label: "Ice-cream Activity", folder: "icecream", skeleton: "Lucas_Activity_Icecream.skel", atlas: "Lucas_Activity_Icecream.atlas", page: "Lucas_Activity_Icecream.png", size: "1100 x 1100", note: "Ice-cream activity rig and atlas names match. Controller statuses are separate from the Spine clip list." }
];

const PARTS = [
  "Body__1.png", "Body__2.png", "Body.png", "Eye_L__1.png", "Eye_L_B__1.png", "Eye_L_B.png", "Eye_L.png", "Eye_R__1.png", "Eye_R_B__1.png", "Eye_R_B__2.png", "Eye_R_B__3.png", "Eye_R_B.png", "Eye_R.png", "eye.png", "EyeBlink__1.png", "Eyeblink.png", "Eyebrow__1.png", "Eyebrow_L__1.png", "Eyebrow_L__2.png", "Eyebrow_L.png", "Eyebrow_R__1.png", "Eyebrow_R__2.png", "Eyebrow_R.png", "Eyebrow.png", "Face__1.png", "Face__2.png", "Face__3.png", "face__4.png", "Face.png", "Hand_Bottom__1.png", "Hand_Bottom__2.png", "Hand_Bottom__3.png", "Hand_Bottom.png", "Hand_L.png", "Hand_Top__1.png", "Hand_Top__2.png", "Hand_Top__3.png", "Hand_Top.png", "Laugh__1.png", "laugh__2.png", "laugh__3.png", "laugh__4.png", "Laugh.png", "Nose.png", "Open_Eye.png", "Smile__1.png", "Smile__2.png", "Smile__3.png", "Smile__4.png", "Smile.png", "Specks.png", "Tail__1.png", "Tail__2.png", "Tail__3.png", "Tail.png", "Torso__1.png", "Torso.png"
].map((name) => ({ name, path: `character_parts/garden/${name}`, group: "garden" }));

const FX = [
  { name: "confetti_ribbin.png", group: "garden" }, { name: "confetti.png", group: "garden" }, { name: "Default-Particle.png", group: "garden" }, { name: "Default-ParticleSystem.png", group: "garden" }, { name: "flash.png", group: "garden" }, { name: "glitter-white.png", group: "garden" }, { name: "shine.png", group: "garden" }, { name: "smoke.png", group: "garden" }, { name: "twinkle-1.png", group: "garden" }, { name: "twinkle-3.png", group: "garden" }, { name: "twinkle-5.png", group: "garden" },
  { name: "confetti.png", group: "icecream" }, { name: "Fire_flame.png", group: "icecream" }, { name: "shine.png", group: "icecream" }, { name: "smoke.png", group: "icecream" }, { name: "twinkle-2.png", group: "icecream" }, { name: "twinkle-5.png", group: "icecream" }, { name: "Water_splash_sprite.png", group: "icecream" }, { name: "water-drop-particle.png", group: "icecream" },
  { name: "smoke.png", group: "room" }, { name: "Water_splash_sprite.png", group: "room" }, { name: "water-drop-particle.png", group: "room" }
].map((item) => ({ ...item, path: `fx/${item.group}/${item.name}` }));

const $ = (selector) => document.querySelector(selector);
const elements = {
  rig: $("#rig-select"), animation: $("#animation-select"), loop: $("#loop-toggle"), speed: $("#speed-select"),
  mount: $("#player-mount"), placeholder: $("#stage-placeholder"), stageState: $("#stage-state"), stageContext: $("#stage-context"),
  count: $("#animation-count"), skeleton: $("#skeleton-name"), pageSize: $("#page-size"), note: $("#rig-note"), loadStatus: $("#load-status"),
  transport: $("#transport"), play: $("#play-toggle"), timeline: $("#timeline"), timeCurrent: $("#time-current"), timeDuration: $("#time-duration"),
  atlasImage: $("#atlas-image"), atlasText: $("#atlas-text"), atlasPageName: $("#atlas-page-name"), atlasDimensions: $("#atlas-dimensions"), atlasRegionCount: $("#atlas-region-count"),
  partsGrid: $("#parts-grid"), fxGrid: $("#fx-grid"), assetDetail: $("#asset-detail"), clipSection: $("#clip-section"), atlasDetail: $("#atlas-detail"),
  assetPreview: $("#asset-preview"), assetName: $("#asset-name"), assetPath: $("#asset-path"), footnote: $("#view-footnote"),
  playerView: $("#animation-view"), atlasView: $("#atlas-view"), partsView: $("#parts-view"), fxView: $("#fx-view")
};

let activeRig = RIGS[0];
let player = null;
let animations = [];
let isPaused = false;
let animationFrame = 0;
let zoom = 1;
let selectedAssetButton = null;

function setLoadState(message, isError = false) {
  elements.loadStatus.textContent = message;
  elements.stageState.querySelector("span").textContent = message;
  elements.stageState.classList.toggle("is-error", isError);
  document.querySelector(".live-dot").classList.toggle("is-error", isError);
}

function setPlaceholder(message, isError = false) {
  elements.placeholder.hidden = false;
  elements.placeholder.classList.toggle("has-error", isError);
  elements.placeholder.querySelector("p").textContent = message;
}

function rigPath(file) {
  return `animation/${activeRig.folder}/${file}`;
}

function currentEntry() {
  return player?.animationState?.getCurrent(0) ?? null;
}

function setPaused(paused) {
  isPaused = paused;
  if (player?.animationState) player.animationState.timeScale = paused ? 0 : Number(elements.speed.value);
  elements.play.textContent = paused ? "Play" : "Pause";
  elements.play.setAttribute("aria-label", paused ? "Play animation" : "Pause animation");
}

function setAnimation(name) {
  if (!player || !name) return;
  player.setAnimation(name, elements.loop.checked);
  setPaused(false);
  updateTimeline();
}

function loadRig() {
  activeRig = RIGS.find((rig) => rig.id === elements.rig.value) ?? RIGS[0];
  cancelAnimationFrame(animationFrame);
  if (player && typeof player.dispose === "function") player.dispose();
  player = null;
  animations = [];
  elements.mount.replaceChildren();
  elements.animation.replaceChildren(new Option("Loading skeleton...", ""));
  elements.animation.disabled = true;
  elements.transport.hidden = true;
  elements.count.textContent = "Loading...";
  elements.skeleton.textContent = activeRig.skeleton;
  elements.pageSize.textContent = activeRig.size;
  elements.stageContext.textContent = activeRig.label.toUpperCase();
  elements.note.textContent = activeRig.note;
  elements.atlasImage.src = rigPath(activeRig.page);
  elements.atlasText.textContent = "Loading atlas...";
  elements.atlasPageName.textContent = activeRig.page;
  elements.atlasDimensions.textContent = activeRig.size;
  elements.atlasRegionCount.textContent = "...";
  elements.atlasImage.style.width = "auto";
  zoom = 1;
  $("#zoom-level").textContent = "Fit";
  setPlaceholder("Loading skeleton and atlas");

  if (location.protocol === "file:") {
    setLoadState("Local server required", true);
    setPlaceholder("Open this viewer through a local HTTP server so the browser can load the skeleton and atlas files. From the repository root, run: python3 -m http.server 4173 --directory re/character_assets/lucas, then visit http://localhost:4173/.", true);
    return;
  }

  if (!window.spine?.SpinePlayer) {
    setLoadState("Spine runtime unavailable", true);
    setPlaceholder("Could not load Spine Player 4.2. Check your connection to the CDN and reload.", true);
    return;
  }

  setLoadState("Loading rig");
  try {
    player = new spine.SpinePlayer(elements.mount, {
      skeleton: rigPath(activeRig.skeleton),
      atlas: rigPath(activeRig.atlas),
      showControls: false,
      premultipliedAlpha: true,
      backgroundColor: "#e8f0e900",
      defaultMix: 0.12,
      success: (loadedPlayer) => {
        player = loadedPlayer;
        animations = [...(loadedPlayer.skeleton?.data?.animations ?? [])].map((animation) => animation.name).sort((a, b) => a.localeCompare(b));
        elements.count.textContent = `${animations.length} clips`;
        elements.animation.replaceChildren(...animations.map((name) => new Option(name, name)));
        elements.animation.disabled = animations.length === 0;
        elements.transport.hidden = animations.length === 0;
        elements.placeholder.hidden = true;
        setLoadState(activeRig.tentative ? "Loaded · pairing tentative" : "Rig loaded");
        if (animations.length) setAnimation(animations[0]);
        animationFrame = requestAnimationFrame(syncTimeline);
      },
      error: (_failedPlayer, reason) => {
        const detail = typeof reason === "string" ? reason : "The skeleton or atlas could not be parsed.";
        setLoadState("Rig failed to load", true);
        setPlaceholder(`${detail} The activity-game pairing is tentative; other rigs require a local HTTP server.`, true);
      }
    });
  } catch (error) {
    setLoadState("Rig failed to load", true);
    setPlaceholder(error.message || "Could not create the Spine player.", true);
  }
  loadAtlasText();
}

async function loadAtlasText() {
  try {
    const response = await fetch(rigPath(activeRig.atlas));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    const regionCount = (text.match(/^bounds:/gm) ?? []).length;
    elements.atlasText.textContent = text;
    elements.atlasRegionCount.textContent = String(regionCount);
  } catch (error) {
    elements.atlasText.textContent = `Unable to read atlas text: ${error.message}`;
    elements.atlasRegionCount.textContent = "Unavailable";
  }
}

function updateTimeline() {
  const entry = currentEntry();
  const duration = entry?.animation?.duration ?? 0;
  const time = entry ? Math.min(entry.trackTime, duration) : 0;
  elements.timeline.max = String(Math.max(duration, 0.01));
  elements.timeline.value = String(time);
  elements.timeCurrent.textContent = `${time.toFixed(2)}s`;
  elements.timeDuration.textContent = `${duration.toFixed(2)}s`;
}

function syncTimeline() {
  if (!elements.timeline.matches(":active")) updateTimeline();
  animationFrame = requestAnimationFrame(syncTimeline);
}

function switchView(view) {
  for (const tab of document.querySelectorAll(".view-tab")) {
    const selected = tab.dataset.view === view;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-pressed", String(selected));
  }
  elements.playerView.hidden = view !== "animation";
  elements.atlasView.hidden = view !== "atlas";
  elements.partsView.hidden = view !== "parts";
  elements.fxView.hidden = view !== "fx";
  elements.clipSection.hidden = view !== "animation";
  elements.atlasDetail.hidden = view !== "atlas";
  elements.assetDetail.hidden = view !== "parts" && view !== "fx";
  const notes = {
    animation: "Controller statuses and Spine clips are different inventories.",
    atlas: "Atlas preview displays the packed texture page. Region metadata comes from the adjacent .atlas file.",
    parts: "Extracted sprite variants are shown as separate files; variant-to-rig mapping is not confirmed.",
    fx: "Texture candidates only. These images do not include particle prefab behavior or configuration."
  };
  elements.footnote.textContent = notes[view];
}

function createAssetTile(asset) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "asset-tile";
  button.dataset.name = asset.name.toLowerCase();
  button.dataset.path = asset.path;
  button.innerHTML = `<span class="asset-thumb"><img src="${asset.path}" alt="" loading="lazy"></span><span class="asset-tile-label">${asset.name}<span class="asset-tile-meta">${asset.group}</span></span>`;
  button.addEventListener("click", () => {
    selectedAssetButton?.classList.remove("is-selected");
    selectedAssetButton = button;
    button.classList.add("is-selected");
    const image = document.createElement("img");
    image.src = asset.path;
    image.alt = asset.name;
    elements.assetPreview.replaceChildren(image);
    elements.assetName.textContent = asset.name;
    elements.assetPath.textContent = asset.path;
  });
  return button;
}

function renderAssetGrid(grid, assets) {
  grid.replaceChildren(...assets.map(createAssetTile));
}

function filterAssets(kind, query) {
  const grid = kind === "parts" ? elements.partsGrid : elements.fxGrid;
  let visible = 0;
  for (const tile of grid.children) {
    const matches = tile.dataset.name.includes(query.toLowerCase()) || tile.dataset.path.toLowerCase().includes(query.toLowerCase());
    tile.hidden = !matches;
    if (matches) visible += 1;
  }
  let empty = grid.querySelector(".empty-results");
  if (!visible) {
    if (!empty) {
      empty = document.createElement("p");
      empty.className = "empty-results";
      empty.textContent = "No matching assets";
      grid.append(empty);
    }
  } else {
    empty?.remove();
  }
}

function setZoom(nextZoom) {
  zoom = Math.max(0.5, Math.min(3, nextZoom));
  elements.atlasImage.style.width = zoom === 1 ? "auto" : `${Math.round(zoom * 100)}%`;
  $("#zoom-level").textContent = zoom === 1 ? "Fit" : `${Math.round(zoom * 100)}%`;
}

for (const tab of document.querySelectorAll(".view-tab")) tab.addEventListener("click", () => switchView(tab.dataset.view));
elements.rig.addEventListener("change", loadRig);
elements.animation.addEventListener("change", () => setAnimation(elements.animation.value));
elements.loop.addEventListener("change", () => setAnimation(elements.animation.value));
elements.play.addEventListener("click", () => setPaused(!isPaused));
$("#restart-button").addEventListener("click", () => setAnimation(elements.animation.value));
elements.speed.addEventListener("change", () => {
  if (player?.animationState && !isPaused) player.animationState.timeScale = Number(elements.speed.value);
});
elements.timeline.addEventListener("input", () => {
  const entry = currentEntry();
  if (entry) {
    entry.trackTime = Number(elements.timeline.value);
    updateTimeline();
  }
});
for (const input of document.querySelectorAll("[data-filter]")) input.addEventListener("input", () => filterAssets(input.dataset.filter, input.value));
for (const button of document.querySelectorAll("[data-zoom]")) button.addEventListener("click", () => {
  if (button.dataset.zoom === "fit") setZoom(1);
  else setZoom(zoom + (button.dataset.zoom === "in" ? 0.25 : -0.25));
});
elements.atlasImage.addEventListener("load", () => {
  elements.atlasDimensions.textContent = `${elements.atlasImage.naturalWidth} x ${elements.atlasImage.naturalHeight}`;
  elements.pageSize.textContent = elements.atlasDimensions.textContent;
});

renderAssetGrid(elements.partsGrid, PARTS);
renderAssetGrid(elements.fxGrid, FX);
$("#parts-count").textContent = `${PARTS.length} sprites`;
$("#fx-count").textContent = `${FX.length} textures`;
loadRig();