# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## Unreleased

- Replaced the broken downloader with the actively maintained `yt-dlp` engine while preserving CommonJS and Node.js 18+ compatibility.
- Preserved the simple interactive `ytdlpl` flow and added a reusable CommonJS API.
- Added a live terminal progress panel and up to three simultaneous playlist downloads.
- Fixed progress reporting so percentages are emitted while `yt-dlp` is downloading.
- Report repeated files by name instead of treating them as new downloads, and include the video ID in sanitized filenames to prevent title collisions.
- Bundled FFmpeg for MP3 conversion and MP4 muxing.
- Added automated tests, package validation, and dual npm/GitHub Packages publishing.
- Removed obsolete runtime shims and the deprecated `fluent-ffmpeg` dependency.

### [3.0.5](https://github.com/KauaAmaroPires/Download_Youtube/compare/v3.0.4...v3.0.5) (2024-10-27)

### [3.0.3](https://github.com/KauaAmaroPires/Download_Youtube/compare/v3.0.4...v3.0.3) (2024-10-27)

### [3.0.4](https://github.com/KauaAmaroPires/Download_Youtube/compare/v3.0.3...v3.0.4) (2024-10-27)

### [3.0.3](https://github.com/KauaAmaroPires/Download_Youtube/compare/v3.0.2...v3.0.3) (2024-10-27)

### [3.0.2](https://github.com/KauaAmaroPires/Download_Youtube/compare/v3.0.1...v3.0.2) (2024-08-14)

### [3.0.1](https://github.com/KauaAmaroPires/Download_Youtube/compare/v1.1.3...v3.0.1) (2024-08-13)
