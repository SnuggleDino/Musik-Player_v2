// renderer.js

const $ = (id) => document.getElementById(id);

// -------------------- State --------------------

let basePlaylist = [];
let playlist = [];
let currentIndex = -1;
let isPlaying = false;
let currentVolume = 0.7;
let shuffleOn = false;
let loopMode = "off";
let audio = null;
let visualizerEnabled = false;

let currentTheme = "blue";
let bgAnimEnabled = false;
let comfortMode = false;
let miniMode = false;

let sortMode = "original";
let searchQuery = "";
let currentTrackPath = null;

let favoritePaths = new Set();

let audioContext = null;
let analyser = null;
let sourceNode = null;
let canvas = null;
let ctx = null;

const SETTINGS_KEY = "novawave-settings-v1";

// -------------------- DOM References --------------------

const trackTitle = $("track-title");
const trackArtist = $("track-artist");
const trackGenre = $("track-genre");
const trackLength = $("track-length");
const currentTimeEl = $("track-current-time");
const remainingTimeEl = $("track-remaining-time");
const nextTrackLabel = $("next-track-label");
const progressBar = $("progress-bar");
const progressFill = $("progress-fill");
const volumeSlider = $("volume-slider");
const volumeFill = $("volume-fill");
const playlistList = $("playlist-list");
const playlistSummary = $("playlist-summary");
const queueLabel = $("queue-label");

const playBtn = $("btn-play");
const prevBtn = $("btn-prev");
const nextBtn = $("btn-next");
const shuffleBtn = $("btn-shuffle");
const loopBtn = $("btn-loop");
const loadBtn = $("btn-load-tracks");

const playIcon = $("play-icon");
const pauseIcon = $("pause-icon");

const ytBtn = $("btn-download-yt");
const ytUrlInput = $("yt-url");
const ytNameInput = $("yt-name");
const ytStatus = $("yt-status");
const ytProgressFill = $("yt-progress-fill");

const visualizerToggle = $("toggle-visualizer");
const visualizerContainer = $("visualizer-container");
canvas = $("visualizer-canvas");
if (canvas) ctx = canvas.getContext("2d");

const playlistSearchInput = $("playlist-search");
const sortAzBtn = $("btn-sort-az");
const sortOriginalBtn = $("btn-sort-original");

const appSubtitleEl = $("app-subtitle");
const labelCurrentTrackEl = $("label-current-track");
const coverTopTagEl = $("cover-top-tag");
const coverBottomTextEl = $("cover-bottom-text");
const trackLabelHeaderEl = $("track-label-header");
const upNextLabelEl = $("up-next-label");
const volumeLabelEl = $("volume-label");
const labelExtrasEl = $("label-extras");
const labelDownloaderTitleEl = $("label-downloader-title");
const labelDownloaderSubtitleEl = $("label-downloader-subtitle");
const labelVisualizerTitleEl = $("label-visualizer-title");
const labelVisualizerSubtitleEl = $("label-visualizer-subtitle");
const labelPlaybackModesEl = $("label-playback-modes");
const labelPlaylistEl = $("label-playlist");
const footerLeftEl = $("footer-left");
const langButtons = document.querySelectorAll(".lang-btn");

const labelThemeEl = $("label-theme");
const themeButtons = document.querySelectorAll(".theme-btn");
const bgAnimToggle = $("toggle-bg-anim");
const bgAnimLabel = $("label-bg-anim");
const comfortToggle = $("toggle-comfort");
const comfortLabel = $("label-comfort");

const miniToggleBtn = $("btn-toggle-mini");

const helpBtn = $("btn-help");
const helpOverlay = $("help-overlay");
const helpCloseBtn = $("btn-help-close");
const helpBackdrop = helpOverlay
  ? helpOverlay.querySelector(".help-overlay-backdrop")
  : null;

const helpTitleEl = $("help-title");
const helpHotkeysTitleEl = $("help-hotkeys-title");
const helpHotkeysListEl = $("help-hotkeys-list");
const helpUsageTitleEl = $("help-usage-title");
const helpUsageListEl = $("help-usage-list");
const helpThemesTitleEl = $("help-themes-title");
const helpThemesListEl = $("help-themes-list");
const helpMiscTitleEl = $("help-misc-title");
const helpMiscListEl = $("help-misc-list");

const favoriteCurrentBtn = $("btn-favorite-current");

// -------------------- Translations --------------------

const translations = {
  de: {
    appSubtitle: "Lokale Musik + Downloader",
    currentTrackLabel: "Aktueller Track",
    coverTopTag: "Now Playing",
    coverBottomText: "Bereit für Musik",
    selectedTrackLabel: "Ausgewählter Titel",
    noTrackTitle: "Kein Track ausgewählt",
    noTrackSubtitle: "Wähle einen Ordner oder lade Titel herunter",
    localFileArtist: "Lokale Datei / Download",
    genreLocalFile: "MP3",
    upNext: "Als Nächstes:",
    volume: "Lautstärke",
    extrasLabel: "Tools & Downloader",
    downloaderTitle: "Downloader",
    downloaderSubtitle:
      "Lade Audiodateien per URL in einen Zielordner herunter.",
    visualizerTitle: "Audio-Visualizer",
    visualizerSubtitle: "Echtzeit-Visualisierung der aktuellen Wiedergabe.",
    visualizerOnLabel: "Visualizer an",
    visualizerOffLabel: "Visualizer aus",
    playbackModesLabel: "Wiedergabemodi",
    playlistLabel: "Playlist",
    playlistEmpty: "Keine Titel geladen",
    playlistSummary: (n) => `${n} Titel geladen`,
    queueLabel: (n) => `Queue: ${n} Songs`,
    footerLeft: "NovaWave • Lokale Dateien + Downloader",
    emptyStateHtml:
      'Keine Titel geladen<br/>Klicke auf „Ordner öffnen“, um Musik zu laden',
    btnPrevTitle: "Vorheriger Titel",
    btnNextTitle: "Nächster Titel",
    shuffleTooltip: "Shuffle",
    shuffleOnTooltip: "Shuffle: An",
    loopOffTooltip: "Repeat / Loop",
    loopAllTooltip: "Loop alle Titel",
    loopOneTooltip: "Diesen Titel wiederholen",
    btnLoadTracks: "Ordner öffnen",
    ytStatusUrlMissing: "URL fehlt",
    ytStatusStart: "Starte Download…",
    ytStatusFolderAbort: "Ordnerauswahl abgebrochen",
    ytStatusSuccess:
      "Download abgeschlossen. Neu laden mit „Ordner öffnen“.",
    ytStatusErrorPrefix: "Fehler: ",
    themeLabel: "Theme",
    themeBlue: "Blue-Purple",
    themeDark: "Dark",
    themeLight: "White",
    bgAnimOnLabel: "Hintergrund-Animation an",
    bgAnimOffLabel: "Hintergrund-Animation aus",
    playlistSearchPlaceholder: "Suche in Playlist",
    sortAzTitle: "Alphabetisch A–Z",
    sortOriginalTitle: "Original-Reihenfolge",
    comfortOnLabel: "Komfort-Modus an",
    comfortOffLabel: "Komfort-Modus aus",
    favoriteTooltipOn: "Favorit – Klick zum Entfernen",
    favoriteTooltipOff: "Als Favorit markieren",
    favoriteAriaOn: "Track ist Favorit, klick zum Entfernen",
    favoriteAriaOff: "Track als Favorit markieren",
    miniToggleTitleMini: "Mini-Player anzeigen",
    miniToggleTitleFull: "Normale Ansicht anzeigen",
    miniToggleLabel: "Mini-Player",
    helpButtonTitle: "Hilfe & Tastenkürzel",
    helpButtonLabel: "Hilfe / Help",
    helpTitle: "Hilfe & Tastenkürzel",
    helpHotkeysTitle: "Hotkeys / Tastenkürzel",
    helpHotkeysHtml: `
      <li><strong>Leertaste</strong> – Play / Pause</li>
      <li><strong>Pfeil rechts</strong> – Nächster Track</li>
      <li><strong>Pfeil links</strong> – Vorheriger Track</li>
      <li><strong>S</strong> – Shuffle an/aus</li>
      <li><strong>L</strong> – Loop-Modus wechseln (aus → alle → ein Titel)</li>
      <li><strong>F</strong> – Aktuellen Track als Favorit markieren/entfernen</li>
      <li><strong>Pfeil hoch</strong> oder <strong>+</strong> – Lautstärke erhöhen</li>
      <li><strong>Pfeil runter</strong> oder <strong>-</strong> – Lautstärke verringern</li>
      <li><strong>Media-Tasten</strong> (Play/Pause, Next, Prev, Stop, Mute) – werden, wenn vorhanden, unterstützt</li>
    `,
    helpUsageTitle: "Bedienung",
    helpUsageHtml: `
      <li>Klick auf einen Eintrag in der Playlist – Track abspielen</li>
      <li>Klick in die Fortschrittsleiste – im Track springen</li>
      <li>Klick in die Lautstärkeleiste – Lautstärke setzen</li>
      <li>„Ordner öffnen“ – lokalen Musik-Ordner auswählen</li>
      <li>Downloader – URL eingeben, optional Dateiname, Zielordner wählen</li>
    `,
    helpThemesTitle: "Themes & Komfort",
    helpThemesHtml: `
      <li><strong>Theme</strong> – Blue-Purple, Dark oder White auswählen</li>
      <li><strong>Hintergrund-Animation</strong> – animierten Hintergrund ein-/ausschalten</li>
      <li><strong>Komfort-Modus</strong> – größere Schrift, größere Buttons, ruhigere Animation</li>
    `,
    helpMiscTitle: "Sonstiges",
    helpMiscHtml: `
      <li>Playlist-Suche – schnell nach Titeln filtern</li>
      <li>Sortierung – Original-Reihenfolge oder A–Z</li>
      <li>Shuffle &amp; Loop – Wiedergabemodi steuern</li>
      <li>Favoriten – Tracks mit Stern markieren</li>
      <li>Mini-Player – kompakte Ansicht über den Button im Header</li>
    `,
  },
  en: {
    appSubtitle: "Local music + downloader",
    currentTrackLabel: "Current track",
    coverTopTag: "Now Playing",
    coverBottomText: "Ready for music",
    selectedTrackLabel: "Selected track",
    noTrackTitle: "No track selected",
    noTrackSubtitle: "Choose a folder or download tracks",
    localFileArtist: "Local file / download",
    genreLocalFile: "MP3",
    upNext: "Up Next:",
    volume: "Volume",
    extrasLabel: "Tools & downloader",
    downloaderTitle: "Downloader",
    downloaderSubtitle:
      "Download audio files by URL into a target folder.",
    visualizerTitle: "Audio visualizer",
    visualizerSubtitle: "Real-time visualization of the current playback.",
    visualizerOnLabel: "Visualizer on",
    visualizerOffLabel: "Visualizer off",
    playbackModesLabel: "Playback modes",
    playlistLabel: "Playlist",
    playlistEmpty: "No tracks loaded",
    playlistSummary: (n) => `${n} tracks loaded`,
    queueLabel: (n) => `Queue: ${n} tracks`,
    footerLeft: "NovaWave • Local files + downloader",
    emptyStateHtml:
      'No tracks added yet<br/>Click "Open folder" to load music',
    btnPrevTitle: "Previous track",
    btnNextTitle: "Next track",
    shuffleTooltip: "Shuffle",
    shuffleOnTooltip: "Shuffle: On",
    loopOffTooltip: "Repeat / Loop",
    loopAllTooltip: "Loop all tracks",
    loopOneTooltip: "Repeat this track",
    btnLoadTracks: "Open folder",
    ytStatusUrlMissing: "URL missing",
    ytStatusStart: "Starting download…",
    ytStatusFolderAbort: "Folder selection canceled",
    ytStatusSuccess:
      "Download finished. Reload with “Open folder”.",
    ytStatusErrorPrefix: "Error: ",
    themeLabel: "Theme",
    themeBlue: "Blue-Purple",
    themeDark: "Dark",
    themeLight: "White",
    bgAnimOnLabel: "Background animation on",
    bgAnimOffLabel: "Background animation off",
    playlistSearchPlaceholder: "Search in playlist",
    sortAzTitle: "Alphabetical A–Z",
    sortOriginalTitle: "Original order",
    comfortOnLabel: "Comfort mode on",
    comfortOffLabel: "Comfort mode off",
    favoriteTooltipOn: "Favorite – click to remove",
    favoriteTooltipOff: "Mark as favorite",
    favoriteAriaOn: "Track is favorite, click to remove",
    favoriteAriaOff: "Mark track as favorite",
    miniToggleTitleMini: "Show mini player",
    miniToggleTitleFull: "Show full view",
    miniToggleLabel: "Mini player",
    helpButtonTitle: "Help & keyboard shortcuts",
    helpButtonLabel: "Help / Hilfe",
    helpTitle: "Help & Keyboard Shortcuts",
    helpHotkeysTitle: "Hotkeys / Shortcuts",
    helpHotkeysHtml: `
      <li><strong>Space</strong> – Play / Pause</li>
      <li><strong>Arrow Right</strong> – Next track</li>
      <li><strong>Arrow Left</strong> – Previous track</li>
      <li><strong>S</strong> – Toggle shuffle</li>
      <li><strong>L</strong> – Cycle loop mode (off → all → one)</li>
      <li><strong>F</strong> – Toggle favorite for current track</li>
      <li><strong>Arrow Up</strong> or <strong>+</strong> – Volume up</li>
      <li><strong>Arrow Down</strong> or <strong>-</strong> – Volume down</li>
      <li><strong>Media keys</strong> (Play/Pause, Next, Prev, Stop, Mute) – supported when available</li>
    `,
    helpUsageTitle: "Usage",
    helpUsageHtml: `
      <li>Click a playlist entry – play that track</li>
      <li>Click in the progress bar – seek within the track</li>
      <li>Click in the volume bar – set volume</li>
      <li>“Open folder” – choose a local music folder</li>
      <li>Downloader – enter URL, optional filename, choose target folder</li>
    `,
    helpThemesTitle: "Themes & Comfort",
    helpThemesHtml: `
      <li><strong>Theme</strong> – choose Blue-Purple, Dark or White</li>
      <li><strong>Background animation</strong> – enable/disable animated background</li>
      <li><strong>Comfort mode</strong> – larger fonts, larger buttons, calmer animation</li>
    `,
    helpMiscTitle: "Misc",
    helpMiscHtml: `
      <li>Playlist search – quickly filter tracks</li>
      <li>Sorting – original order or A–Z</li>
      <li>Shuffle &amp; loop – control playback modes</li>
      <li>Favorites – mark tracks with a star</li>
      <li>Mini player – compact view via the button in the header</li>
    `,
  },
};

let currentLanguage = "de";

// -------------------- Helpers --------------------

function tr(key, ...args) {
  const dict = translations[currentLanguage] || translations.de;
  const value = dict[key];
  if (typeof value === "function") return value(...args);
  return value ?? key;
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveSettings(partial) {
  try {
    const existing = loadSettings();
    const merged = { ...existing, ...partial };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  } catch {
    // ignore
  }
}

function formatTime(sec) {
  if (!sec || isNaN(sec)) return "--:--";
  const totalSeconds = Math.floor(sec);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s < 10 ? "0" + s : s}`;
}

function updatePlayPauseUI() {
  if (!playIcon || !pauseIcon) return;
  if (isPlaying) {
    playIcon.style.display = "none";
    pauseIcon.style.display = "block";
  } else {
    playIcon.style.display = "block";
    pauseIcon.style.display = "none";
  }
}

function updateShuffleBtnTitle() {
  if (!shuffleBtn) return;
  shuffleBtn.title = shuffleOn ? tr("shuffleOnTooltip") : tr("shuffleTooltip");
}

function updateLoopBtnTitle() {
  if (!loopBtn) return;
  if (loopMode === "off") loopBtn.title = tr("loopOffTooltip");
  else if (loopMode === "all") loopBtn.title = tr("loopAllTooltip");
  else loopBtn.title = tr("loopOneTooltip");
}

function updateMiniToggleUI() {
  if (!miniToggleBtn) return;
  miniToggleBtn.textContent = miniMode ? "🗗" : "🗖";
  miniToggleBtn.title = miniMode
    ? tr("miniToggleTitleFull")
    : tr("miniToggleTitleMini");
  miniToggleBtn.setAttribute("aria-label", tr("miniToggleLabel"));
}

// -------------------- Favorites --------------------

function updateNowPlayingFavoriteButton() {
  if (!favoriteCurrentBtn) return;

  if (currentIndex < 0 || currentIndex >= playlist.length) {
    favoriteCurrentBtn.textContent = "☆";
    favoriteCurrentBtn.classList.remove("favorite-nowplaying--active");
    favoriteCurrentBtn.disabled = true;
    favoriteCurrentBtn.title = tr("favoriteTooltipOff");
    favoriteCurrentBtn.setAttribute("aria-label", tr("favoriteAriaOff"));
    return;
  }

  const track = playlist[currentIndex];
  const isFav = !!track.favorite;

  favoriteCurrentBtn.disabled = false;
  favoriteCurrentBtn.textContent = isFav ? "★" : "☆";
  favoriteCurrentBtn.classList.toggle("favorite-nowplaying--active", isFav);
  favoriteCurrentBtn.title = isFav
    ? tr("favoriteTooltipOn")
    : tr("favoriteTooltipOff");
  favoriteCurrentBtn.setAttribute(
    "aria-label",
    isFav ? tr("favoriteAriaOn") : tr("favoriteAriaOff")
  );
}

function toggleFavorite(path) {
  if (!path) return;

  const wasFav = favoritePaths.has(path);
  if (wasFav) favoritePaths.delete(path);
  else favoritePaths.add(path);

  const applyFavFlag = (arr) => {
    arr.forEach((t) => {
      if (t.path === path) t.favorite = favoritePaths.has(path);
    });
  };
  applyFavFlag(basePlaylist);
  applyFavFlag(playlist);

  saveSettings({ favorites: Array.from(favoritePaths) });

  updateNowPlayingFavoriteButton();
  renderPlaylist();
}

// -------------------- UI Updates --------------------

function updateNowPlayingUI() {
  if (currentIndex < 0 || currentIndex >= playlist.length) {
    trackTitle.textContent = tr("noTrackTitle");
    trackArtist.textContent = tr("noTrackSubtitle");
    trackGenre.textContent = "–";
    trackLength.textContent = "--:--";
    currentTimeEl.textContent = "0:00";
    remainingTimeEl.textContent = "--:--";
    nextTrackLabel.textContent = "–";
    progressFill.style.width = "0%";
    updateNowPlayingFavoriteButton();
    return;
  }

  const t = playlist[currentIndex];

  trackTitle.textContent = t.title;
  trackArtist.textContent = tr("localFileArtist");
  trackGenre.textContent = tr("genreLocalFile");
  trackLength.textContent = "--:--";
  currentTimeEl.textContent = "0:00";
  remainingTimeEl.textContent = "--:--";

  const nextIndex = (currentIndex + 1) % playlist.length;
  const nextTrack = playlist[nextIndex];
  nextTrackLabel.textContent = nextTrack ? nextTrack.title : "–";

  updateNowPlayingFavoriteButton();
}

function updateQueueUI() {
  queueLabel.textContent = tr("queueLabel", playlist.length);
  if (!playlist.length) {
    playlistSummary.textContent = tr("playlistEmpty");
  } else {
    playlistSummary.textContent = tr("playlistSummary", playlist.length);
  }
}

// -------------------- Playlist Rendering --------------------

function renderPlaylist() {
  playlistList.innerHTML = "";

  if (!playlist.length) {
    playlistList.innerHTML = `<div class="empty-state">${tr(
      "emptyStateHtml"
    )}</div>`;
    updateQueueUI();
    return;
  }

  updateQueueUI();

  playlist.forEach((track, i) => {
    const isFav = !!track.favorite;
    const favTooltip = isFav
      ? tr("favoriteTooltipOn")
      : tr("favoriteTooltipOff");

    const row = document.createElement("div");
    row.className = "track-row";
    if (i === currentIndex) row.classList.add("active");

    row.innerHTML = `
      <div class="track-index">${i + 1}</div>
      <div class="track-info-block">
        <div class="track-title-small">${track.title}</div>
        <div class="track-artist-small">${tr("localFileArtist")}</div>
        <div class="track-meta-small">
          <span>${track.displayName || ""}</span>
        </div>
      </div>
      <div class="track-right">
        <button
          class="track-fav-btn ${isFav ? "track-fav-btn--active" : ""}"
          type="button"
          title="${favTooltip}"
          aria-label="${
            isFav ? tr("favoriteAriaOn") : tr("favoriteAriaOff")
          }"
        >
          ${isFav ? "★" : "☆"}
        </button>
        <div class="track-badge ${
          i === currentIndex && isPlaying ? "playing" : ""
        }">
          ${i === currentIndex && isPlaying ? "▶" : "●"}
        </div>
      </div>
    `;

    row.onclick = () => {
      setCurrentTrack(i, true);
    };

    const favBtn = row.querySelector(".track-fav-btn");
    if (favBtn) {
      favBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        toggleFavorite(track.path);
      });
    }

    playlistList.appendChild(row);
  });
}

// -------------------- Playlist View (Search + Sort) --------------------

function toFileUrl(p) {
  if (!p) return "";
  const normalized = p.replace(/\\/g, "/");
  return `file://${normalized}`;
}

function applyPlaylistView() {
  let view = [...basePlaylist];

  if (searchQuery && searchQuery.trim() !== "") {
    const q = searchQuery.toLowerCase();
    view = view.filter((t) => {
      const title = (t.title || "").toLowerCase();
      const displayName = (t.displayName || "").toLowerCase();
      const path = (t.path || "").toLowerCase();
      return (
        title.includes(q) || displayName.includes(q) || path.includes(q)
      );
    });
  }

  if (sortMode === "az") {
    view.sort((a, b) =>
      (a.title || "").localeCompare(b.title || "", undefined, {
        sensitivity: "base",
      })
    );
  }

  const prevPath = currentTrackPath;
  playlist = view;

  if (!playlist.length) {
    currentIndex = -1;
  } else if (prevPath) {
    const idx = playlist.findIndex((t) => t.path === prevPath);
    currentIndex = idx !== -1 ? idx : 0;
  } else {
    currentIndex = 0;
  }

  updateNowPlayingUI();
  renderPlaylist();
}

// -------------------- Theme / Layout States --------------------

function applyTheme() {
  document.documentElement.dataset.theme = currentTheme;

  themeButtons.forEach((btn) => {
    const theme = btn.dataset.theme;
    btn.classList.toggle("theme-btn--active", theme === currentTheme);
    if (theme === "blue") btn.textContent = tr("themeBlue");
    if (theme === "dark") btn.textContent = tr("themeDark");
    if (theme === "light") btn.textContent = tr("themeLight");
  });
}

function applyBgAnimState() {
  document.body.classList.toggle("bg-animated", bgAnimEnabled);
  if (bgAnimToggle) bgAnimToggle.checked = bgAnimEnabled;
  if (bgAnimLabel) {
    bgAnimLabel.textContent = bgAnimEnabled
      ? tr("bgAnimOnLabel")
      : tr("bgAnimOffLabel");
  }
}

function applyComfortMode() {
  document.body.classList.toggle("comfort-mode", comfortMode);
  if (comfortToggle) comfortToggle.checked = comfortMode;
  if (comfortLabel) {
    comfortLabel.textContent = comfortMode
      ? tr("comfortOnLabel")
      : tr("comfortOffLabel");
  }
}

function applyMiniMode() {
  document.body.classList.toggle("mini-mode", miniMode);
  updateMiniToggleUI();
}

// -------------------- Help Overlay --------------------

function openHelp() {
  if (!helpOverlay) return;
  helpOverlay.style.display = "block";
  document.body.classList.add("help-open");
}

function closeHelp() {
  if (!helpOverlay) return;
  helpOverlay.style.display = "none";
  document.body.classList.remove("help-open");
}

// -------------------- Audio / Visualizer --------------------

function attachAudioEvents() {
  if (!audio) return;

  audio.ontimeupdate = () => {
    if (!audio || isNaN(audio.duration) || audio.duration <= 0) return;
    const ratio = audio.currentTime / audio.duration;
    progressFill.style.width = `${ratio * 100}%`;
    currentTimeEl.textContent = formatTime(audio.currentTime);
    remainingTimeEl.textContent = formatTime(
      audio.duration - audio.currentTime
    );
    trackLength.textContent = formatTime(audio.duration);
  };

  audio.onplay = () => {
    isPlaying = true;
    updatePlayPauseUI();
    renderPlaylist();
    if (visualizerEnabled) connectVisualizer();
  };

  audio.onpause = () => {
    isPlaying = false;
    updatePlayPauseUI();
    renderPlaylist();
  };

  audio.onended = () => {
    handleTrackEnded();
  };
}

function handleTrackEnded() {
  if (!playlist.length) return;

  if (loopMode === "one") {
    setCurrentTrack(currentIndex, true);
    return;
  }

  let next = currentIndex;

  if (shuffleOn) {
    if (playlist.length === 1) {
      next = currentIndex;
    } else {
      do {
        next = Math.floor(Math.random() * playlist.length);
      } while (next === currentIndex);
    }
  } else {
    next = currentIndex + 1;
  }

  if (next >= playlist.length) {
    if (loopMode === "all") {
      next = 0;
    } else {
      isPlaying = false;
      updatePlayPauseUI();
      renderPlaylist();
      return;
    }
  }

  setCurrentTrack(next, true);
}

function setCurrentTrack(index, autoplay = true) {
  if (!playlist.length || index < 0 || index >= playlist.length) {
    currentIndex = -1;
    currentTrackPath = null;
    if (audio) {
      audio.pause();
      audio = null;
    }
    updateNowPlayingUI();
    renderPlaylist();
    updatePlayPauseUI();
    return;
  }

  currentIndex = index;

  if (audio) {
    audio.pause();
    audio.src = "";
    audio = null;
  }

  const track = playlist[index];
  currentTrackPath = track.path || null;
  const src = toFileUrl(track.path);

  audio = new Audio(src);
  audio.volume = currentVolume;

  attachAudioEvents();
  updateNowPlayingUI();
  renderPlaylist();

  if (autoplay) {
    audio.play().catch((err) => {
      console.error("Fehler beim Abspielen:", err);
      isPlaying = false;
      updatePlayPauseUI();
      renderPlaylist();
    });
  } else {
    isPlaying = false;
    updatePlayPauseUI();
  }
}

function connectVisualizer() {
  if (!audio || !visualizerEnabled || !canvas || !ctx) return;

  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;

  if (!audioContext) audioContext = new AC();

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  if (sourceNode) {
    try {
      sourceNode.disconnect();
    } catch (e) {
      console.warn("Fehler beim Disconnect des alten Audio-Nodes:", e);
    }
    sourceNode = null;
  }

  if (!analyser) {
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
  }

  sourceNode = audioContext.createMediaElementSource(audio);
  sourceNode.connect(analyser);
  analyser.connect(audioContext.destination);

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    if (!visualizerEnabled || !analyser || !canvas || !ctx) return;

    requestAnimationFrame(draw);

    analyser.getByteFrequencyData(dataArray);

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = "rgb(15, 23, 42)";
    ctx.fillRect(0, 0, width, height);

    const barCount = 48;
    const barWidth = width / barCount;

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i * bufferLength) / barCount);
      const value = dataArray[dataIndex];
      const barHeight = (value / 255) * height * 0.85;
      const x = i * barWidth;
      const y = height - barHeight;

      ctx.fillStyle = "rgb(56, 189, 248)";
      ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
    }
  }

  draw();
}

// Canvas-Resize für Visualizer
if (canvas && visualizerContainer && ctx) {
  const resize = () => {
    const rect = visualizerContainer.getBoundingClientRect();
    const w = Math.max(200, rect.width || 200);
    const h = Math.max(50, rect.height || 50);
    canvas.width = w * window.devicePixelRatio;
    canvas.height = h * window.devicePixelRatio;
    ctx.setTransform(
      window.devicePixelRatio,
      0,
      0,
      window.devicePixelRatio,
      0,
      0
    );
  };
  new ResizeObserver(resize).observe(visualizerContainer);
  resize();
}

// -------------------- Translations / UI Text --------------------

function applyTranslations() {
  appSubtitleEl.textContent = tr("appSubtitle");
  labelCurrentTrackEl.textContent = tr("currentTrackLabel");
  coverTopTagEl.textContent = tr("coverTopTag");
  coverBottomTextEl.textContent = tr("coverBottomText");
  trackLabelHeaderEl.textContent = tr("selectedTrackLabel");
  upNextLabelEl.textContent = tr("upNext");
  volumeLabelEl.textContent = tr("volume");

  if (labelExtrasEl) labelExtrasEl.textContent = tr("extrasLabel");
  if (labelDownloaderTitleEl)
    labelDownloaderTitleEl.textContent = tr("downloaderTitle");
  if (labelDownloaderSubtitleEl)
    labelDownloaderSubtitleEl.textContent = tr("downloaderSubtitle");
  if (labelVisualizerTitleEl)
    labelVisualizerTitleEl.textContent = tr("visualizerTitle");
  if (labelVisualizerSubtitleEl)
    labelVisualizerSubtitleEl.textContent = tr("visualizerSubtitle");
  if (labelPlaybackModesEl)
    labelPlaybackModesEl.textContent = tr("playbackModesLabel");

  labelPlaylistEl.textContent = tr("playlistLabel");
  footerLeftEl.textContent = tr("footerLeft");
  loadBtn.textContent = tr("btnLoadTracks");

  prevBtn.title = tr("btnPrevTitle");
  nextBtn.title = tr("btnNextTitle");
  updateShuffleBtnTitle();
  updateLoopBtnTitle();

  if (labelThemeEl) labelThemeEl.textContent = tr("themeLabel");
  applyTheme();
  applyBgAnimState();
  applyComfortMode();
  updateMiniToggleUI();

  if (playlistSearchInput) {
    playlistSearchInput.placeholder = tr("playlistSearchPlaceholder");
  }
  if (sortAzBtn) sortAzBtn.title = tr("sortAzTitle");
  if (sortOriginalBtn) sortOriginalBtn.title = tr("sortOriginalTitle");

  if (helpBtn) {
    helpBtn.title = tr("helpButtonTitle");
    helpBtn.setAttribute("aria-label", tr("helpButtonLabel"));
  }
  if (helpTitleEl) helpTitleEl.textContent = tr("helpTitle");
  if (helpHotkeysTitleEl) helpHotkeysTitleEl.textContent = tr("helpHotkeysTitle");
  if (helpHotkeysListEl) helpHotkeysListEl.innerHTML = tr("helpHotkeysHtml");
  if (helpUsageTitleEl) helpUsageTitleEl.textContent = tr("helpUsageTitle");
  if (helpUsageListEl) helpUsageListEl.innerHTML = tr("helpUsageHtml");
  if (helpThemesTitleEl) helpThemesTitleEl.textContent = tr("helpThemesTitle");
  if (helpThemesListEl) helpThemesListEl.innerHTML = tr("helpThemesHtml");
  if (helpMiscTitleEl) helpMiscTitleEl.textContent = tr("helpMiscTitle");
  if (helpMiscListEl) helpMiscListEl.innerHTML = tr("helpMiscHtml");

  updateNowPlayingFavoriteButton();
  updateQueueUI();
  updateNowPlayingUI();
  renderPlaylist();
}

// -------------------- Event Wiring --------------------

// Sprache
langButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const lang = btn.dataset.lang;
    if (!lang || lang === currentLanguage) return;
    currentLanguage = lang;
    langButtons.forEach((b) => b.classList.remove("lang-btn--active"));
    btn.classList.add("lang-btn--active");
    saveSettings({ language: currentLanguage });
    applyTranslations();
  });
});

// Theme
themeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const theme = btn.dataset.theme;
    if (!theme || theme === currentTheme) return;
    currentTheme = theme;
    saveSettings({ theme: currentTheme });
    applyTheme();
  });
});

// Hintergrund-Animation
if (bgAnimToggle) {
  bgAnimToggle.addEventListener("change", (e) => {
    bgAnimEnabled = e.target.checked;
    saveSettings({ bgAnimEnabled });
    applyBgAnimState();
  });
}

// Komfort-Modus
if (comfortToggle) {
  comfortToggle.addEventListener("change", (e) => {
    comfortMode = e.target.checked;
    saveSettings({ comfortMode });
    applyComfortMode();
  });
}

// Mini-Player
if (miniToggleBtn) {
  miniToggleBtn.addEventListener("click", () => {
    miniMode = !miniMode;
    saveSettings({ miniMode });
    applyMiniMode();
  });
}

// Help-Overlay
if (helpBtn) {
  helpBtn.addEventListener("click", openHelp);
}
if (helpCloseBtn) {
  helpCloseBtn.addEventListener("click", closeHelp);
}
if (helpBackdrop) {
  helpBackdrop.addEventListener("click", closeHelp);
}

// Now-Playing-Favorit
if (favoriteCurrentBtn) {
  favoriteCurrentBtn.addEventListener("click", () => {
    if (currentIndex < 0 || currentIndex >= playlist.length) return;
    const track = playlist[currentIndex];
    toggleFavorite(track.path);
  });
}

// Player Controls
if (playBtn) {
  playBtn.onclick = () => {
    if (!audio) {
      if (playlist.length) {
        setCurrentTrack(currentIndex >= 0 ? currentIndex : 0, true);
      }
      return;
    }

    if (audio.paused) {
      audio.play().catch(console.error);
    } else {
      audio.pause();
    }
  };
}

if (prevBtn) {
  prevBtn.onclick = () => {
    if (!playlist.length) return;
    const nextIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    setCurrentTrack(nextIndex, isPlaying);
  };
}

if (nextBtn) {
  nextBtn.onclick = () => {
    if (!playlist.length) return;
    const nextIndex = (currentIndex + 1) % playlist.length;
    setCurrentTrack(nextIndex, isPlaying);
  };
}

if (shuffleBtn) {
  shuffleBtn.onclick = () => {
    shuffleOn = !shuffleOn;
    shuffleBtn.classList.toggle("mode-btn--active", shuffleOn);
    updateShuffleBtnTitle();
    saveSettings({ shuffleOn });
  };
}

if (loopBtn) {
  loopBtn.onclick = () => {
    if (loopMode === "off") {
      loopMode = "all";
      loopBtn.classList.add("mode-btn--active");
    } else if (loopMode === "all") {
      loopMode = "one";
      loopBtn.classList.add("mode-btn--active");
    } else {
      loopMode = "off";
      loopBtn.classList.remove("mode-btn--active");
    }
    updateLoopBtnTitle();
    saveSettings({ loopMode });
  };
}

// Ordner laden
if (loadBtn) {
  loadBtn.onclick = async () => {
    if (!window.api || typeof window.api.selectMusicFolder !== "function") {
      console.warn("selectMusicFolder nicht verfügbar");
      return;
    }

    try {
      const res = await window.api.selectMusicFolder();
      if (!res || !Array.isArray(res.tracks) || res.tracks.length === 0) {
        basePlaylist = [];
        playlist = [];
        currentIndex = -1;
        currentTrackPath = null;
        if (audio) {
          audio.pause();
          audio = null;
        }
        updateNowPlayingUI();
        renderPlaylist();
        updatePlayPauseUI();
        return;
      }

      basePlaylist = res.tracks.map((t) => ({
        title: t.title,
        path: t.path,
        displayName: t.displayName || "",
        favorite: favoritePaths.has(t.path),
      }));

      searchQuery = "";
      sortMode = "original";
      if (playlistSearchInput) playlistSearchInput.value = "";

      applyPlaylistView();
    } catch (err) {
      console.error("Fehler beim Laden des Ordners:", err);
    }
  };
}

// Downloader
if (ytBtn) {
  ytBtn.onclick = async () => {
    const url = ytUrlInput.value.trim();
    const name = ytNameInput.value.trim();

    if (!url) {
      ytStatus.textContent = tr("ytStatusUrlMissing");
      return;
    }

    if (!window.api || typeof window.api.downloadFromYouTube !== "function") {
      ytStatus.textContent =
        tr("ytStatusErrorPrefix") + "Download-API nicht verfügbar";
      return;
    }

    ytStatus.textContent = tr("ytStatusStart");
    if (ytProgressFill) ytProgressFill.style.width = "0%";

    try {
      const folderRes = await window.api.selectMusicFolder();
      if (!folderRes || !folderRes.folder) {
        ytStatus.textContent = tr("ytStatusFolderAbort");
        if (ytProgressFill) ytProgressFill.style.width = "0%";
        return;
      }

      const result = await window.api.downloadFromYouTube(
        url,
        folderRes.folder,
        name || null
      );

      if (result && result.success) {
        ytStatus.textContent = tr("ytStatusSuccess");
        ytUrlInput.value = "";
        ytNameInput.value = "";
        if (ytProgressFill) ytProgressFill.style.width = "100%";
      } else {
        ytStatus.textContent =
          tr("ytStatusErrorPrefix") +
          (result && result.error ? result.error : "Unbekannt");
        if (ytProgressFill) ytProgressFill.style.width = "0%";
      }
    } catch (err) {
      console.error("Fehler beim Download:", err);
      ytStatus.textContent =
        tr("ytStatusErrorPrefix") + (err.message || String(err));
      if (ytProgressFill) ytProgressFill.style.width = "0%";
    }
  };
}

// Progress aus Main-Process
if (window.api && typeof window.api.onDownloadProgress === "function") {
  window.api.onDownloadProgress((data) => {
    if (!ytStatus) return;

    let percent = null;
    if (data && data.percent != null) {
      const p = parseFloat(data.percent);
      if (!Number.isNaN(p)) percent = p;
    }

    const textParts = [];
    if (percent != null) textParts.push(`Download: ${percent.toFixed(1)}%`);
    if (data && data.downloaded && data.totalSize) {
      textParts.push(`${data.downloaded} / ${data.totalSize}`);
    }
    if (data && data.eta) {
      textParts.push(`ETA: ${data.eta}`);
    }

    ytStatus.textContent =
      textParts.length > 0 ? textParts.join("  •  ") : "Lade herunter…";

    if (ytProgressFill && percent != null) {
      const clamped = Math.max(0, Math.min(100, percent));
      ytProgressFill.style.width = clamped + "%";
    }
  });
}

// Volume
if (volumeSlider) {
  volumeSlider.onclick = (e) => {
    const rect = volumeSlider.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width)
    );
    currentVolume = ratio;
    volumeFill.style.width = ratio * 100 + "%";
    if (audio) audio.volume = currentVolume;
    saveSettings({ volume: currentVolume });
  };
}

// Fortschrittsbalken
if (progressBar) {
  progressBar.onclick = (e) => {
    if (!audio || !audio.duration || isNaN(audio.duration)) return;
    const rect = progressBar.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width)
    );
    audio.currentTime = audio.duration * ratio;
  };
}

// Visualizer Toggle
if (visualizerToggle) {
  visualizerToggle.onchange = (e) => {
    visualizerEnabled = e.target.checked;
    if (visualizerContainer) {
      visualizerContainer.style.display = visualizerEnabled ? "block" : "none";
    }

    const visLabel = $("label-visualizer-switch");
    if (visLabel) {
      visLabel.textContent = visualizerEnabled
        ? tr("visualizerOnLabel")
        : tr("visualizerOffLabel");
    }

    if (visualizerEnabled && audio) connectVisualizer();
  };
}

// Playlist-Suche
if (playlistSearchInput) {
  playlistSearchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value || "";
    applyPlaylistView();
  });
}

function updateSortButtonsUI() {
  if (!sortAzBtn || !sortOriginalBtn) return;
  sortAzBtn.classList.toggle("playlist-sort-btn--active", sortMode === "az");
  sortOriginalBtn.classList.toggle(
    "playlist-sort-btn--active",
    sortMode === "original"
  );
}

if (sortAzBtn) {
  sortAzBtn.addEventListener("click", () => {
    sortMode = "az";
    updateSortButtonsUI();
    applyPlaylistView();
  });
}

if (sortOriginalBtn) {
  sortOriginalBtn.addEventListener("click", () => {
    sortMode = "original";
    updateSortButtonsUI();
    applyPlaylistView();
  });
}

// Volume über Hotkeys
function setVolumeFromHotkey(newValue) {
  currentVolume = Math.max(0, Math.min(1, newValue));
  volumeFill.style.width = currentVolume * 100 + "%";
  if (audio) audio.volume = currentVolume;
  saveSettings({ volume: currentVolume });
}

// Tastatur-Shortcuts
window.addEventListener("keydown", (e) => {
  const isHelpVisible =
    helpOverlay && helpOverlay.style.display !== "none";

  if (e.key === "Escape" || e.key === "Esc") {
    if (isHelpVisible) {
      e.preventDefault();
      closeHelp();
      return;
    }
  }

  if (isHelpVisible) return;

  const target = e.target;
  if (
    target &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable)
  ) {
    return;
  }

  const key = e.key.toLowerCase();
  const code = e.code;

  if (key === " ") {
    e.preventDefault();
    if (playBtn) playBtn.click();
    return;
  }

  if (code === "ArrowRight") {
    e.preventDefault();
    if (nextBtn) nextBtn.click();
    return;
  }

  if (code === "ArrowLeft") {
    e.preventDefault();
    if (prevBtn) prevBtn.click();
    return;
  }

  if (key === "s") {
    if (shuffleBtn) shuffleBtn.click();
    return;
  }

  if (key === "l") {
    if (loopBtn) loopBtn.click();
    return;
  }

  if (key === "f") {
    if (currentIndex >= 0 && currentIndex < playlist.length) {
      const t = playlist[currentIndex];
      toggleFavorite(t.path);
    }
    return;
  }

  if (code === "ArrowUp" || key === "+") {
    e.preventDefault();
    setVolumeFromHotkey(currentVolume + 0.05);
    return;
  }

  if (code === "ArrowDown" || key === "-") {
    e.preventDefault();
    setVolumeFromHotkey(currentVolume - 0.05);
    return;
  }

  switch (code) {
    case "MediaPlayPause":
      e.preventDefault();
      if (playBtn) playBtn.click();
      break;
    case "MediaTrackNext":
    case "MediaNextTrack":
      e.preventDefault();
      if (nextBtn) nextBtn.click();
      break;
    case "MediaTrackPrevious":
    case "MediaPreviousTrack":
      e.preventDefault();
      if (prevBtn) prevBtn.click();
      break;
    case "MediaStop":
      e.preventDefault();
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      break;
    case "AudioVolumeMute":
      if (audio) audio.muted = !audio.muted;
      break;
    default:
      break;
  }
});

// -------------------- Initial Settings Laden --------------------

const initialSettings = loadSettings();

if (
  initialSettings.language &&
  (initialSettings.language === "de" ||
    initialSettings.language === "en")
) {
  currentLanguage = initialSettings.language;
  langButtons.forEach((b) => {
    b.classList.toggle(
      "lang-btn--active",
      b.dataset.lang === currentLanguage
    );
  });
}

if (typeof initialSettings.volume === "number") {
  currentVolume = Math.max(0, Math.min(1, initialSettings.volume));
  volumeFill.style.width = currentVolume * 100 + "%";
}

if (typeof initialSettings.shuffleOn === "boolean") {
  shuffleOn = initialSettings.shuffleOn;
  if (shuffleBtn) {
    shuffleBtn.classList.toggle("mode-btn--active", shuffleOn);
  }
}

if (typeof initialSettings.loopMode === "string") {
  loopMode = initialSettings.loopMode;
  if (loopBtn) {
    loopBtn.classList.toggle("mode-btn--active", loopMode !== "off");
  }
}

if (
  initialSettings.theme === "blue" ||
  initialSettings.theme === "dark" ||
  initialSettings.theme === "light"
) {
  currentTheme = initialSettings.theme;
}

if (typeof initialSettings.bgAnimEnabled === "boolean") {
  bgAnimEnabled = initialSettings.bgAnimEnabled;
}

if (typeof initialSettings.comfortMode === "boolean") {
  comfortMode = initialSettings.comfortMode;
}

if (typeof initialSettings.miniMode === "boolean") {
  miniMode = initialSettings.miniMode;
  applyMiniMode();
}

if (Array.isArray(initialSettings.favorites)) {
  favoritePaths = new Set(initialSettings.favorites);
}

// -------------------- Initial Render --------------------

updateSortButtonsUI();
applyTranslations();
updatePlayPauseUI();
