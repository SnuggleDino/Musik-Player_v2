// main.js
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

// yt-dlp-wrap: wichtig ist das .default
const YTDlpWrap = require("yt-dlp-wrap").default;

// GPU-Disk-Cache deaktivieren (beseitigt "Unable to create cache / Gpu Cache Creation failed")
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");
app.commandLine.appendSwitch("disable-gpu-program-cache");

const SUPPORTED = [".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac", ".webm"];

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 1000,
    autoHideMenuBar: true,
    backgroundColor: "#050816",
    icon: path.join(__dirname, "assets", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile("index.html");

  // Sicherheit: keine neuen Fenster durch Links öffnen lassen
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
}

// Lokale Musik-Ordner-Auswahl
ipcMain.handle("select-folder", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });

  if (canceled || !filePaths || !filePaths[0]) {
    return { folder: null, tracks: [] };
  }

  const dir = filePaths[0];
  const files = await fs.promises.readdir(dir);

  const tracks = files
    .filter((f) => SUPPORTED.includes(path.extname(f).toLowerCase()))
    .map((f) => ({
      title: path.basename(f, path.extname(f)),
      displayName: f,
      path: path.join(dir, f),
    }));

  return { folder: dir, tracks };
});

// YouTube / URL → MP3 Downloader mit Progress-Events
ipcMain.handle("yt-download", async (event, { url, dir, name }) => {
  try {
    if (!url || !dir) {
      return {
        success: false,
        error: "URL oder Zielordner fehlt.",
      };
    }

    // yt-dlp Binary (wird intern gecached, also nicht jedes Mal neu geladen)
    const binaryPath = await YTDlpWrap.downloadFromGithub();
    const ytDlpWrap = new YTDlpWrap(binaryPath);

    // Dateiname absichern
    const safeName = name
      ? name.replace(/[\/\\?%*:|"<>]/g, "_")
      : "%(uploader)s - %(title)s";

    const outputTemplate = path.join(dir, `${safeName}.%(ext)s`);

    // yt-dlp starten – NICHT execPromise, sondern exec, damit wir Events bekommen
    const child = ytDlpWrap.exec([
      url,
      "-x", // Audio extrahieren
      "--audio-format",
      "mp3",
      "--audio-quality",
      "0", // beste Qualität
      "--embed-thumbnail",
      "--add-metadata",
      "-o",
      outputTemplate,
    ]);

    // Progress-Events nach Renderer schicken
    child.on("progress", (progress) => {
      // progress.percent ist typischerweise eine Zahl (0–100)
      // manche Felder sind Strings, das ist aber egal – wir schicken einfach durch
      event.sender.send("yt-download-progress", {
        percent: progress.percent,
        totalSize: progress.totalSize,
        downloaded: progress.downloaded,
        eta: progress.eta,
      });
    });

    // Allgemeine Events (optional für Logging)
    child.on("ytDlpEvent", (data) => {
      // Kannst du zum Debuggen nutzen, aktuell nur Log
      // console.log("yt-dlp event:", data);
    });

    // Promise, das resolved, wenn yt-dlp fertig ist
    const result = await new Promise((resolve, reject) => {
      child.once("close", (code) => {
        if (code === 0) {
          resolve({
            success: true,
            message: `Fertig! ${
              name ? `${name}.mp3` : "Datei(en)"
            } gespeichert. Lade den Ordner neu.`,
          });
        } else {
          reject(new Error(`yt-dlp ist mit Code ${code} beendet.`));
        }
      });

      child.once("error", (err) => {
        reject(err);
      });
    });

    return result;
  } catch (e) {
    console.error("yt-dlp Fehler-Details:", e);
    return {
      success: false,
      error: e.message || "Download fehlgeschlagen (prüfe URL/Internet).",
    };
  }
});

// App-Lebenszyklus
app.whenReady().then(() => {
  // Für korrektes Icon im Task-Manager / Notifications
  app.setAppUserModelId("com.snuggledino.novawave");

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
