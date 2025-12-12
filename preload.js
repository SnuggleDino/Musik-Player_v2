// preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Ordner-Auswahl für lokale Musik
  selectMusicFolder: () => ipcRenderer.invoke("select-folder"),

  // YouTube/URL-Download (Start des Downloads)
  downloadFromYouTube: (url, dir, name) =>
    ipcRenderer.invoke("yt-download", { url, dir, name }),

  // Download-Fortschritt (Progressbar-Events)
  //
  // Verwendung im renderer.js:
  // window.api.onDownloadProgress((data) => {
  //   console.log(data.percent, data.downloaded, data.totalSize, data.eta);
  // });
  onDownloadProgress: (callback) => {
    if (typeof callback !== "function") return;

    // alte Listener entfernen, damit es keine doppelten Events gibt
    ipcRenderer.removeAllListeners("yt-download-progress");

    ipcRenderer.on("yt-download-progress", (_event, data) => {
      try {
        callback(data);
      } catch (err) {
        console.error("Fehler im Download-Progress-Callback:", err);
      }
    });
  },
});
