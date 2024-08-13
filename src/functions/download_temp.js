const ytdl = require("@distube/ytdl-core");
const fs = require('fs');

const printProgress = (message) => {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(message);
};

module.exports = {
    video: async ({ url: url, name: name, itag: itag, dir: dir, pl: pl }) => {

        const promise = new Promise(async (resolution, rejection) => {

            if (!fs.existsSync(`${dir}/temp`)) {
                fs.mkdirSync(`${dir}/temp`);
            };

            await ytdl(url, itag)
                .on("progress", (_, totalByteReceived, totalByteFile) => {
                    if (!pl) {
                        printProgress(
                            `Video Download Progress: ${((totalByteReceived / totalByteFile) * 100).toFixed(
                            2
                            )} %`
                        );
                    };
                    
                })
                .pipe(fs.createWriteStream(`${dir}/temp/${name}.mp4`))
                .on("finish", () => {
                    if (!pl) {
                        process.stdout.clearLine();
                        process.stdout.cursorTo(0);
                    };
                    resolution(`${dir}/temp/${name}.mp4`);
                })
                .on("error", () => {
                    resolution('error');
                });

        });
        const response = await promise;
        return response;

    },
    audio: async ({ url: url, name: name, dir: dir, pl: pl }) => {

        const promise = new Promise(async (resolution, rejection) => {

            if (!fs.existsSync(`${dir}/temp`)) {
                fs.mkdirSync(`${dir}/temp`);
            };

            await ytdl(url, { quality: 'highestaudio' })
                .on("progress", (_, totalByteReceived, totalByteFile) => {
                    if (!pl) {
                        printProgress(
                            `Audio Download Progress: ${((totalByteReceived / totalByteFile) * 100).toFixed(
                            2
                            )} %`
                        );
                    };
                })
                .pipe(fs.createWriteStream(`${dir}/temp/${name}.mp3`))
                .on("finish", () => {
                    if (!pl) {
                        process.stdout.clearLine();
                        process.stdout.cursorTo(0);
                    };
                    resolution(`${dir}/temp/${name}.mp3`);
                })
                .on("error", () => {
                    resolution('error');
                });

        });
        const response = await promise;
        return response;

    }
}