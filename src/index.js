const ffmpegPath = require("ffmpeg-static");
const youtubeDl = require("youtube-dl-exec");
const { mkdir, readdir } = require("node:fs/promises");
const path = require("node:path");

const QUALITY_HEIGHTS = Object.freeze({ low: 360, medium: 720, high: null });
const PLAYLIST_CONCURRENCY = 3;

function classifyYoutubeUrl(value) {
    let url;
    try {
        url = new URL(String(value || "").trim());
    } catch {
        throw new TypeError("Informe uma URL válida do YouTube.");
    }
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    const isYoutube = hostname === "youtube.com" || hostname.endsWith(".youtube.com") || hostname === "youtu.be";
    if (!isYoutube) throw new TypeError("Informe uma URL válida do YouTube.");
    if (url.searchParams.has("list") || url.pathname === "/playlist") return "playlist";
    if (hostname === "youtu.be" || /^\/(watch|shorts|live)\//.test(url.pathname) || url.pathname === "/watch") return "video";
    throw new TypeError("A URL informada não é de um vídeo ou playlist válida do YouTube.");
}

function sanitizeFilename(value, fallback = "playlist") {
    const sanitized = String(value || "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
        .replace(/[. ]+$/g, "")
        .trim()
        .slice(0, 160);
    return sanitized || fallback;
}

function validateOptions(options = {}) {
    const format = String(options.format || "MP3").toUpperCase();
    const quality = String(options.quality || "high").toLowerCase();
    if (!["MP3", "MP4"].includes(format)) throw new TypeError("O formato deve ser MP3 ou MP4.");
    if (!(quality in QUALITY_HEIGHTS)) throw new TypeError("A qualidade deve ser low, medium ou high.");
    return { format, quality };
}

function mp4Selector(quality) {
    const height = QUALITY_HEIGHTS[quality];
    const limit = height ? `[height<=${height}]` : "";
    return `bv*${limit}[ext=mp4]+ba[ext=m4a]/b${limit}[ext=mp4]/bv*${limit}+ba/b${limit}`;
}

function formatFlags(format, quality) {
    if (format === "MP3") {
        return { format: "bestaudio/best", extractAudio: true, audioFormat: "mp3", audioQuality: 0 };
    }
    return { format: mp4Selector(quality), mergeOutputFormat: "mp4" };
}

function readableError(error) {
    const details = String(error.stderr || error.message || error)
        .split(/\r?\n/)
        .filter(line => line.trim() && !line.startsWith("WARNING:"));
    const lastError = details.reverse().find(line => line.includes("ERROR:")) || details[0];
    return lastError ? lastError.replace(/^ERROR:\s*/, "") : "O download falhou.";
}

function fileKey(file) {
    const normalized = path.resolve(file);
    return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function videoIdFromUrl(value) {
    const url = new URL(value);
    if (url.hostname.toLowerCase().replace(/^www\./, "") === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || null;
    return url.searchParams.get("v") || url.pathname.match(/^\/(?:shorts|live)\/([^/?]+)/)?.[1] || null;
}

async function runWithConcurrency(items, limit, worker) {
    const results = new Array(items.length);
    let nextIndex = 0;
    async function runWorker() {
        while (nextIndex < items.length) {
            const index = nextIndex++;
            results[index] = await worker(items[index], index);
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runWorker));
    return results;
}

class YoutubeDownloader {
    constructor(options = {}) {
        this.engine = options.engine || youtubeDl;
    }

    async download(url, options = {}) {
        const kind = classifyYoutubeUrl(url);
        const settings = validateOptions(options);
        const output = path.resolve(options.output || "músicas");
        await mkdir(output, { recursive: true });
        return kind === "playlist"
            ? this.downloadPlaylist(url.trim(), output, settings, options)
            : this.downloadVideo(url.trim(), output, settings, options);
    }

    async downloadPlaylist(url, output, settings, options) {
        let playlist;
        try {
            playlist = await this.engine(url, { dumpSingleJson: true, flatPlaylist: true, skipDownload: true, noWarnings: true });
        } catch (error) {
            throw new Error(readableError(error));
        }
        const entries = (playlist.entries || []).filter(entry => entry && (entry.url || entry.id));
        if (!entries.length) throw new Error("A playlist não possui vídeos disponíveis.");

        const directory = path.join(output, sanitizeFilename(playlist.title, playlist.id));
        await mkdir(directory, { recursive: true });
        const failures = [];
        const total = entries.length;
        const results = await runWithConcurrency(entries, PLAYLIST_CONCURRENCY, async (entry, index) => {
            const item = {
                index: index + 1,
                total,
                id: entry.id || null,
                title: entry.title || `Vídeo ${index + 1}`,
                url: entry.webpage_url || (String(entry.url).startsWith("http") ? entry.url : `https://www.youtube.com/watch?v=${entry.id || entry.url}`),
            };
            try {
                return await this.downloadItem(item, directory, settings, options, `${String(item.index).padStart(String(total).length, "0")} - %(title).140s [%(id)s].%(ext)s`);
            } catch (error) {
                failures.push({ ...item, error });
                options.onProgress?.({ state: "error", item, error });
                return null;
            }
        });
        const completed = results.filter(Boolean);
        return {
            kind: "playlist",
            files: completed.map(result => result.file),
            duplicates: completed.filter(result => result.duplicate).map(result => result.file),
            failures,
            directory,
        };
    }

    async downloadVideo(url, output, settings, options) {
        const item = { index: 1, total: 1, id: videoIdFromUrl(url), title: "Vídeo", url };
        const result = await this.downloadItem(item, output, settings, options, "%(title).140s [%(id)s].%(ext)s");
        return {
            kind: "video",
            files: [result.file],
            duplicates: result.duplicate ? [result.file] : [],
            failures: [],
            directory: output,
        };
    }

    async downloadItem(item, output, settings, options, template) {
        options.onProgress?.({ state: "start", item, percentage: 0 });
        const directoryEntries = (await readdir(output, { withFileTypes: true })).filter(entry => entry.isFile());
        const existingFiles = new Set(directoryEntries.map(entry => fileKey(path.join(output, entry.name))));
        if (item.id) {
            const extension = settings.format.toLowerCase();
            const suffix = `[${item.id}].${extension}`.toLowerCase();
            const repeated = directoryEntries.find(entry => entry.name.toLowerCase().endsWith(suffix));
            if (repeated) {
                const file = path.join(output, repeated.name);
                options.onProgress?.({ state: "duplicate", item, percentage: 100, file });
                return { file, duplicate: true };
            }
        }
        const flags = {
            ffmpegLocation: ffmpegPath,
            output: path.join(output, template),
            print: "after_move:filepath",
            progress: true,
            newline: true,
            noWarnings: true,
            noPlaylist: true,
            noOverwrites: true,
            windowsFilenames: process.platform === "win32",
            ...formatFlags(settings.format, settings.quality),
        };
        const subprocess = this.engine.exec(item.url, flags, { windowsHide: true });
        const attachProgress = stream => {
            if (!stream) return;
            let pending = "";
            stream.on("data", chunk => {
                pending += String(chunk);
                const lines = pending.split(/\r?\n|\r/);
                pending = lines.pop() || "";
                for (const line of lines) {
                    const match = line.match(/\[download\]\s+([\d.]+)%/);
                    if (match) options.onProgress?.({ state: "progress", item, percentage: Number(match[1]) });
                }
            });
        };
        attachProgress(subprocess.stdout);
        attachProgress(subprocess.stderr);
        let result;
        try {
            result = await subprocess;
        } catch (error) {
            throw new Error(readableError(error));
        }
        const files = String(result.stdout || "")
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line && !line.startsWith("[download]"));
        const file = files[files.length - 1];
        if (!file) throw new Error("Nenhum arquivo foi baixado. O vídeo pode estar indisponível.");
        if (existingFiles.has(fileKey(file))) {
            options.onProgress?.({ state: "duplicate", item, percentage: 100, file });
            return { file, duplicate: true };
        }
        options.onProgress?.({ state: "complete", item, percentage: 100, file });
        return { file, duplicate: false };
    }
}

async function download(url, options) {
    return new YoutubeDownloader().download(url, options);
}

module.exports = { YoutubeDownloader, classifyYoutubeUrl, download, runWithConcurrency };
