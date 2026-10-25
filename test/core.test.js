const assert = require("node:assert/strict");
const test = require("node:test");
const { classifyYoutubeUrl, runWithConcurrency } = require("../src/index.js");

test("identifica vídeos e playlists", () => {
    assert.equal(classifyYoutubeUrl("https://youtu.be/dQw4w9WgXcQ"), "video");
    assert.equal(classifyYoutubeUrl("https://www.youtube.com/playlist?list=PL1234567890ABCDEF"), "playlist");
    assert.throws(() => classifyYoutubeUrl("https://example.com/video"), /YouTube/);
});

test("a API pública funciona com require", () => {
    const library = require("../src/index.js");
    assert.equal(typeof library.download, "function");
    assert.equal(typeof library.YoutubeDownloader, "function");
});

test("limita playlists a três downloads simultâneos", async () => {
    let active = 0;
    let maximum = 0;
    const results = await runWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, async value => {
        active += 1;
        maximum = Math.max(maximum, active);
        await new Promise(resolve => setTimeout(resolve, 10));
        active -= 1;
        return value * 2;
    });
    assert.equal(maximum, 3);
    assert.deepEqual(results, [2, 4, 6, 8, 10, 12, 14]);
});
