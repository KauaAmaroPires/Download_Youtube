#!/usr/bin/env node

const figlet = require("figlet");
const inquirer = require("inquirer");
const readline = require("node:readline");
const { YoutubeDownloader, classifyYoutubeUrl } = require("./index.js");

const colors = { blue: "\x1b[94m", cyan: "\x1b[96m", green: "\x1b[92m", red: "\x1b[91m", reset: "\x1b[0m" };

function color(text, name) {
    return process.stdout.isTTY ? `${colors[name]}${text}${colors.reset}` : text;
}

function progressBar(percentage, width = 24) {
    const completed = Math.round((Math.max(0, Math.min(100, percentage)) / 100) * width);
    return `${"█".repeat(completed)}${"░".repeat(width - completed)}`;
}

function createProgressRenderer() {
    const active = new Map();
    let completed = 0;
    let duplicates = 0;
    let failed = 0;
    let total = 1;
    let renderedLines = 0;

    function clearPrevious() {
        if (!process.stdout.isTTY || renderedLines === 0) return;
        readline.moveCursor(process.stdout, 0, -renderedLines);
        for (let index = 0; index < renderedLines; index += 1) {
            readline.clearLine(process.stdout, 0);
            if (index < renderedLines - 1) readline.moveCursor(process.stdout, 0, 1);
        }
        if (renderedLines > 1) readline.moveCursor(process.stdout, 0, -(renderedLines - 1));
        readline.cursorTo(process.stdout, 0);
    }

    function redraw() {
        if (!process.stdout.isTTY) return;
        clearPrevious();
        const remaining = Math.max(0, total - completed - duplicates - failed);
        const repeated = duplicates ? ` • ${duplicates} repetido(s)` : "";
        const errors = failed ? ` • ${failed} falha(s)` : "";
        const lines = [`Progresso: ${completed}/${total} novo(s) • ${remaining} restante(s)${repeated}${errors}`];
        for (const state of [...active.values()].sort((a, b) => a.item.index - b.item.index)) {
            const title = state.item.title.length > 42 ? `${state.item.title.slice(0, 39)}...` : state.item.title;
            lines.push(`${String(state.item.index).padStart(String(total).length, "0")}. [${progressBar(state.percentage)}] ${state.percentage.toFixed(1).padStart(5)}% ${title}`);
        }
        process.stdout.write(`${lines.join("\n")}\n`);
        renderedLines = lines.length;
    }

    return {
        update(event) {
            total = event.item.total;
            if (event.state === "start" || event.state === "progress") {
                active.set(event.item.index, { item: event.item, percentage: event.percentage || 0 });
            } else if (event.state === "complete") {
                active.delete(event.item.index);
                completed += 1;
            } else if (event.state === "duplicate") {
                active.delete(event.item.index);
                duplicates += 1;
            } else if (event.state === "error") {
                active.delete(event.item.index);
                failed += 1;
            }
            redraw();
        },
        finish() {
            if (!process.stdout.isTTY) return;
            clearPrevious();
            renderedLines = 0;
        },
    };
}

async function main() {
    console.log(color(figlet.textSync("Download Youtube"), "cyan"));
    const answers = await inquirer.prompt([
        {
            name: "url",
            message: "Link do vídeo ou da playlist:",
            validate(value) {
                try { classifyYoutubeUrl(value); return true; } catch (error) { return error.message; }
            },
        },
        {
            type: "list",
            name: "format",
            message: "Escolha o formato:",
            choices: [
                { name: "MP3 - Áudio", value: "MP3" },
                { name: "MP4 - Vídeo", value: "MP4" },
            ],
        },
        {
            type: "list",
            name: "quality",
            message: "Escolha a qualidade:",
            choices: [
                { name: "Baixa", value: "low" },
                { name: "Média", value: "medium" },
                { name: "Alta", value: "high" },
            ],
        },
    ]);

    const progress = createProgressRenderer();
    let result;
    try {
        result = await new YoutubeDownloader().download(answers.url.trim(), {
            format: answers.format,
            quality: answers.quality,
            onProgress: event => progress.update(event),
        });
    } finally {
        progress.finish();
    }

    if (process.stdout.isTTY) process.stdout.write("\r\x1b[K");
    if (result.kind === "playlist") {
        const newFiles = result.files.length - result.duplicates.length;
        console.log(color(`Download concluído: ${newFiles} novo(s), ${result.duplicates.length} repetido(s), ${result.failures.length} falha(s).`, "green"));
        for (const file of result.duplicates) console.log(color(`Repetido: ${file}`, "blue"));
        console.log(result.directory);
    } else {
        if (result.duplicates.length) console.log(color(`Arquivo repetido: ${result.duplicates[0]}`, "blue"));
        else {
            console.log(color("Download concluído.", "green"));
            console.log(result.files[0]);
        }
    }
}

if (require.main === module) {
    main().catch(error => {
        if (process.stdout.isTTY) process.stdout.write("\r\x1b[K");
        console.error(color(`Erro: ${error.message}`, "red"));
        process.exitCode = 1;
    });
}

module.exports = { main };
