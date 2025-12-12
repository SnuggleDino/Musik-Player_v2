// renderer.js

// Hilfsfunktion zum Abrufen von DOM-Elementen
const $ = (selector) => document.querySelector(selector);

// -------------------- Globaler Zustand --------------------
let playlist = [];
let basePlaylist = []; // Unveränderte Liste nach dem Laden
let currentIndex = -1;
let isPlaying = false;
let audio = new Audio();
let currentVolume = 0.7;
let shuffleOn = false;
let loopMode = 'off'; // 'off', 'all', 'one'
let currentLanguage = 'de';
let currentTheme = 'blue';

// Visualizer-Zustand
let audioContext;
let analyser;
let sourceNode;
let visualizerRunning = false;

// -------------------- DOM-Elemente --------------------
const trackTitleEl = $('#track-title-large');
const trackArtistEl = $('#track-artist-large');
const coverArtEl = $('#cover-art');
const coverPlaceholderEl = $('.cover-placeholder');

const currentTimeEl = $('#current-time');
const durationEl = $('#duration');
const progressBar = $('.progress-bar');
const progressFill = $('.progress-fill');

const playBtn = $('#play-btn');
const playIcon = $('#play-icon');
const pauseIcon = $('#pause-icon');
const prevBtn = $('#prev-btn');
const nextBtn = $('#next-btn');
const loopBtn = $('#loop-btn');
const shuffleBtn = $('#shuffle-btn');

const volumeSlider = $('.volume-slider');
const volumeFill = $('.volume-fill');
const volumeIcon = $('.volume-icon');

const playlistEl = $('.playlist-scroll-area');
const playlistInfoBar = $('.playlist-info-bar');
const loadFolderBtn = $('#load-folder-btn');
const searchInput = $('.playlist-search-input');

const ytUrlInput = $('#yt-url-input');
const ytNameInput = $('#yt-name-input'); // Feld zum Umbenennen
const downloadBtn = $('#download-btn');
const downloadStatusEl = $('.status-text');
const downloadProgressFill = $('.yt-progress-fill');

const visualizerCanvas = $('#visualizer-canvas');
const visualizerContainer = $('.visualizer-container');

const langButtons = document.querySelectorAll('.lang-btn');
const themeButtons = document.querySelectorAll('.theme-btn');

// -------------------- Übersetzungen --------------------
const translations = {
    de: {
        playerTitle: 'Musik-Player',
        playerSubtitle: 'Lokal & YouTube',
        loadFolder: 'Ordner laden',
        searchPlaceholder: 'Playlist durchsuchen...',
        emptyPlaylist: 'Playlist ist leer. Lade einen Ordner!',
        track: 'Titel',
        tracks: 'Titel',
        downloaderTitle: 'Downloader',
        downloadButton: 'Download',
        urlPlaceholder: 'YouTube URL...',
        renamePlaceholder: 'Optionaler Name...',
        statusReady: 'Bereit zum Download.',
        statusUrlMissing: 'URL fehlt!',
        statusFolderAbort: 'Ordnerauswahl abgebrochen.',
        statusStarting: 'Download startet...',
        statusSuccess: 'Download erfolgreich!',
        statusError: 'Fehler beim Download.',
        statusProgress: (p) => `Lade... ${p}%`
    },
    en: {
        playerTitle: 'Music Player',
        playerSubtitle: 'Local & YouTube',
        loadFolder: 'Load Folder',
        searchPlaceholder: 'Search playlist...',
        emptyPlaylist: 'Playlist is empty. Load a folder!',
        track: 'track',
        tracks: 'tracks',
        downloaderTitle: 'Downloader',
        downloadButton: 'Download',
        urlPlaceholder: 'YouTube URL...',
        renamePlaceholder: 'Optional name...',
        statusReady: 'Ready to download.',
        statusUrlMissing: 'URL is missing!',
        statusFolderAbort: 'Folder selection aborted.',
        statusStarting: 'Starting download...',
        statusSuccess: 'Download successful!',
        statusError: 'Error during download.',
        statusProgress: (p) => `Downloading... ${p}%`
    }
};

function tr(key, ...args) {
    const lang = translations[currentLanguage] || translations.de;
    const text = lang[key] || key;
    return typeof text === 'function' ? text(...args) : text;
}

// -------------------- Kernfunktionen des Players --------------------

function playTrack(index) {
    if (index < 0 || index >= playlist.length) {
        isPlaying = false;
        updatePlayPauseUI();
        return;
    }

    currentIndex = index;
    const track = playlist[index];
    
    audio.src = `file://${track.path}`;
    audio.play();
    isPlaying = true;
    
    updateUIForCurrentTrack();
    if (!visualizerRunning) startVisualizer();
}

function playNext() {
    let nextIndex;
    if (shuffleOn) {
        nextIndex = Math.floor(Math.random() * playlist.length);
    } else {
        nextIndex = currentIndex + 1;
        if (nextIndex >= playlist.length) {
            if (loopMode === 'all') {
                nextIndex = 0;
            } else {
                isPlaying = false;
                updatePlayPauseUI();
                return; // Stopp am Ende der Liste
            }
        }
    }
    playTrack(nextIndex);
}

function playPrev() {
    if (audio.currentTime > 3) {
        audio.currentTime = 0;
    } else {
        const prevIndex = currentIndex - 1 < 0 ? playlist.length - 1 : currentIndex - 1;
        playTrack(prevIndex);
    }
}

function setupAudioEvents() {
    audio.addEventListener('timeupdate', () => {
        const { currentTime, duration } = audio;
        if (isNaN(duration)) return;

        progressFill.style.width = `${(currentTime / duration) * 100}%`;
        currentTimeEl.textContent = formatTime(currentTime);
        durationEl.textContent = formatTime(duration);
    });

    audio.addEventListener('ended', () => {
        if (loopMode === 'one') {
            audio.currentTime = 0;
            audio.play();
        } else {
            playNext();
        }
    });

    audio.addEventListener('volumechange', () => {
        volumeFill.style.width = `${audio.volume * 100}%`;
        volumeIcon.innerHTML = getVolumeIcon(audio.volume);
    });

    audio.addEventListener('play', () => {
        isPlaying = true;
        updatePlayPauseUI();
    });

    audio.addEventListener('pause', () => {
        isPlaying = false;
        updatePlayPauseUI();
    });
}

// -------------------- UI Aktualisierungen --------------------

function updateUIForCurrentTrack() {
    if (currentIndex === -1 || !playlist[currentIndex]) {
        trackTitleEl.textContent = 'Nichts spielt';
        trackArtistEl.textContent = '...';
        coverArtEl.style.display = 'none';
        coverPlaceholderEl.style.display = 'flex';
        renderPlaylist();
        return;
    }
    
    const track = playlist[currentIndex];
    trackTitleEl.textContent = track.title;
    trackArtistEl.textContent = track.artist || 'Unbekannter Künstler';

    window.api.getCover(track.path).then(coverUrl => {
        if (coverUrl) {
            coverArtEl.src = coverUrl;
            coverArtEl.style.display = 'block';
            coverPlaceholderEl.style.display = 'none';
        } else {
            coverArtEl.style.display = 'none';
            coverPlaceholderEl.style.display = 'flex';
        }
    });

    renderPlaylist();
}

function updatePlayPauseUI() {
    if (isPlaying) {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
    } else {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
    }
}

function renderPlaylist() {
    playlistEl.innerHTML = '';
    if (playlist.length === 0) {
        playlistEl.innerHTML = `<div class="empty-state">${tr('emptyPlaylist')}</div>`;
        playlistInfoBar.textContent = `0 ${tr('tracks')}`;
        return;
    }

    const fragment = document.createDocumentFragment();
    playlist.forEach((track, index) => {
        const row = document.createElement('div');
        row.className = 'track-row';
        if (index === currentIndex) {
            row.classList.add('active');
        }
        row.innerHTML = `
            <div class="track-index">${isPlaying && index === currentIndex ? '▶' : index + 1}</div>
            <div class="track-info-block">
                <div class="track-title-small">${track.title}</div>
                <div class="track-artist-small">${track.artist || '...'}</div>
            </div>
            <div class="track-duration">${formatTime(track.duration)}</div>
        `;
        row.addEventListener('click', () => playTrack(index));
        fragment.appendChild(row);
    });

    playlistEl.appendChild(fragment);
    const trackCount = playlist.length;
    playlistInfoBar.textContent = `${trackCount} ${trackCount === 1 ? tr('track') : tr('tracks')}`;
}

function applyTranslations() {
    $('h1').textContent = tr('playerTitle');
    $('.app-title-text p').textContent = tr('playerSubtitle');
    loadFolderBtn.textContent = tr('loadFolder');
    searchInput.placeholder = tr('searchPlaceholder');
    $('.panel-title').textContent = tr('downloaderTitle');
    downloadBtn.textContent = tr('downloadButton');
    ytUrlInput.placeholder = tr('urlPlaceholder');
    ytNameInput.placeholder = tr('renamePlaceholder');
    downloadStatusEl.textContent = tr('statusReady');
    renderPlaylist();
    updateUIForCurrentTrack();
}

// -------------------- Downloader --------------------

async function handleDownload() {
    const url = ytUrlInput.value.trim();
    const customName = ytNameInput.value.trim(); // Wert aus dem Umbenennungsfeld

    if (!url) {
        downloadStatusEl.textContent = tr('statusUrlMissing');
        return;
    }
    
    downloadStatusEl.textContent = tr('statusStarting');
    downloadProgressFill.style.width = '0%';
    
    try {
        const folderRes = await window.api.selectDownloadFolder();
        if (folderRes.canceled || !folderRes.folder) {
            downloadStatusEl.textContent = tr('statusFolderAbort');
            return;
        }

        const result = await window.api.downloadFromYouTube(url, folderRes.folder, customName || null);

        if (result.success) {
            downloadStatusEl.textContent = tr('statusSuccess');
            ytUrlInput.value = '';
            ytNameInput.value = ''; // Feld leeren
        } else {
            downloadStatusEl.textContent = `${tr('statusError')}: ${result.error}`;
        }
    } catch (err) {
        downloadStatusEl.textContent = `${tr('statusError')}: ${err.message}`;
    }
}

// -------------------- Visualizer --------------------

function startVisualizer() {
    if (!visualizerCanvas || visualizerRunning) return;

    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        sourceNode = audioContext.createMediaElementSource(audio);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        sourceNode.connect(analyser);
        analyser.connect(audioContext.destination);
    }
    visualizerRunning = true;
    drawVisualizer();
}

function drawVisualizer() {
    if (!visualizerRunning || !isPlaying) {
        visualizerRunning = false;
        return;
    }
    requestAnimationFrame(drawVisualizer);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const ctx = visualizerCanvas.getContext('2d');
    const { width, height } = visualizerCanvas;
    ctx.clearRect(0, 0, width, height);
    
    const barWidth = (width / bufferLength) * 1.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height;
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent');
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
        x += barWidth + 2;
    }
}

// -------------------- Hilfsfunktionen --------------------

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
}

function getVolumeIcon(volume) {
    if (volume === 0) return '🔇';
    if (volume < 0.5) return '🔈';
    return '🔊';
}

function filterPlaylist(query) {
    if (!query) {
        playlist = [...basePlaylist];
    } else {
        playlist = basePlaylist.filter(track => 
            track.title.toLowerCase().includes(query.toLowerCase()) ||
            (track.artist && track.artist.toLowerCase().includes(query.toLowerCase()))
        );
    }
    // Nach Filterung, den aktuellen Index neu finden
    const currentTrack = basePlaylist[currentIndex];
    currentIndex = currentTrack ? playlist.findIndex(t => t.path === currentTrack.path) : -1;
    renderPlaylist();
}

// -------------------- Event-Listener --------------------

function initEventListeners() {
    playBtn.addEventListener('click', () => {
        if (playlist.length === 0) return;
        if (isPlaying) {
            audio.pause();
        } else {
            if (currentIndex === -1) {
                playTrack(0);
            } else {
                audio.play();
            }
        }
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
    });

    nextBtn.addEventListener('click', playNext);
    prevBtn.addEventListener('click', playPrev);

    shuffleBtn.addEventListener('click', () => {
        shuffleOn = !shuffleOn;
        shuffleBtn.classList.toggle('mode-btn--active', shuffleOn);
    });

    loopBtn.addEventListener('click', () => {
        const modes = ['off', 'all', 'one'];
        loopMode = modes[(modes.indexOf(loopMode) + 1) % modes.length];
        loopBtn.classList.toggle('mode-btn--active', loopMode !== 'off');
        // Icon anpassen (optional)
        if (loopMode === 'one') loopBtn.innerHTML = '🔂';
        else if (loopMode === 'all') loopBtn.innerHTML = '🔁';
        else loopBtn.innerHTML = '➡️';
    });

    progressBar.addEventListener('click', (e) => {
        if (!isNaN(audio.duration)) {
            const rect = progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            audio.currentTime = percent * audio.duration;
        }
    });
    
    volumeSlider.addEventListener('input', (e) => {
        audio.volume = e.target.value;
    });

    loadFolderBtn.addEventListener('click', async () => {
        const result = await window.api.selectMusicFolder();
        if (result && result.tracks) {
            basePlaylist = result.tracks;
            playlist = [...basePlaylist];
            currentIndex = -1;
            playTrack(0);
        }
    });
    
    searchInput.addEventListener('input', (e) => {
        filterPlaylist(e.target.value);
    });

    downloadBtn.addEventListener('click', handleDownload);
    
    window.api.onDownloadProgress((data) => {
        if (data && typeof data.percent === 'number') {
            const percent = data.percent.toFixed(1);
            downloadProgressFill.style.width = `${percent}%`;
            downloadStatusEl.textContent = tr('statusProgress', percent);
        }
    });

    langButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            currentLanguage = btn.dataset.lang;
            langButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyTranslations();
        });
    });

    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            currentTheme = btn.dataset.theme;
            document.documentElement.setAttribute('data-theme', currentTheme);
            themeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // Canvas Größe anpassen
    new ResizeObserver(() => {
        if (visualizerContainer.clientWidth > 0 && visualizerContainer.clientHeight > 0) {
            visualizerCanvas.width = visualizerContainer.clientWidth;
            visualizerCanvas.height = visualizerContainer.clientHeight;
        }
    }).observe(visualizerContainer);
}

// -------------------- Initialisierung --------------------
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    setupAudioEvents();
    applyTranslations();
    renderPlaylist();
    updatePlayPauseUI();
    audio.volume = currentVolume;
    volumeSlider.value = currentVolume;
});
