const { spawnSync } = require("node:child_process");
const path = require("node:path");

const allowedIncrements = new Set(["patch", "minor", "major"]);
const increment = process.argv[2] || "patch";
const dryRun = process.argv.includes("--dry-run");
const npmCli = process.env.npm_execpath;
const npmEnvironment = { ...process.env, npm_config_cache: path.resolve(".npm-cache") };

if (!allowedIncrements.has(increment)) {
    console.error("Uso: node scripts/release.js [patch|minor|major] [--dry-run]");
    process.exit(1);
}

function run(command, args, options = {}) {
    const result = spawnSync(command, args, { stdio: "inherit", shell: false, ...options });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Falha: ${command} ${args.join(" ")}`);
}

function capture(command, args) {
    const result = spawnSync(command, args, { encoding: "utf8", shell: false });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr.trim() || `Falha: ${command} ${args.join(" ")}`);
    return result.stdout.trim();
}

function runNpm(args) {
    if (npmCli) return run(process.execPath, [npmCli, ...args], { env: npmEnvironment });
    return run(process.platform === "win32" ? "npm.cmd" : "npm", args, { env: npmEnvironment, shell: process.platform === "win32" });
}

try {
    if (capture("git", ["status", "--porcelain"]) && !dryRun) {
        throw new Error("O repositório contém alterações sem commit. Faça o commit antes de publicar.");
    }
    runNpm(["test"]);
    runNpm(["run", "test:syntax"]);
    runNpm(["pack", "--dry-run", "--registry=https://registry.npmjs.org"]);
    if (dryRun) {
        console.log("Pré-verificação concluída; nenhuma versão foi publicada.");
        process.exit(0);
    }
    runNpm(["whoami", "--registry=https://registry.npmjs.org"]);
    runNpm(["whoami", "--registry=https://npm.pkg.github.com"]);
    runNpm(["version", increment, "-m", "chore(release): %s"]);
    runNpm(["link", "--registry=https://registry.npmjs.org"]);
    runNpm(["publish", "--access", "public", "--registry=https://registry.npmjs.org"]);
    runNpm(["publish", "--registry=https://npm.pkg.github.com"]);
    run("git", ["push", "--follow-tags"]);
    console.log("npm link, npm e GitHub Packages atualizados.");
} catch (error) {
    console.error(`Release interrompido: ${error.message}`);
    process.exit(1);
}
