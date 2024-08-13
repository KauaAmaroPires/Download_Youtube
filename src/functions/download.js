const ffmpeg = require('fluent-ffmpeg');
const ytdl = require("@distube/ytdl-core");
const downloadTemp = require('./download_temp.js');
const delay = require('util').promisify(setTimeout);
const events = require('events');
const Events = new events();
const fs = require('fs');
const color = require('./color');

const data = {
    ListLength: 0,
    SuccessLength: 0,
    ErrorLength: 0
};

let end;

Events.on('Downloaded', async ({ dir: dir, data: data, resolution: resolution }) => {
    if (data.SuccessLength >= data.ListLength) {
        console.log('\n\n');
        console.log(color(`[LOG] - Download Completo! Success: ${data.SuccessLength}, Error: ${data.ErrorLength} encerrando processos...`, 'blue'));
        console.log('\n\n');
        if (fs.existsSync(`${dir}/temp/`)) {
            let file = fs.readdirSync(`${dir}/temp/`);
            for (var i = 0; i < file.length; i++) {
                fs.unlinkSync(`${dir}/temp/${file[i]}`, () => {});
            }
            fs.rmdir(`${dir}/temp/`, () => {});
        };
        await delay(2500);
        resolution();
    };
});

class Download {
    constructor() {
        this.version = require('../../package.json').version;
    }

    async download({ url: url, type: type, quality: quality, dir: dir }) {

        const promise = new Promise(async (resolution, rejection) => {

            console.log('\n\n');
            console.log(color('[LOG] - Carregando...', 'blue'));
            console.log('\n\n');

            const info = await ytdl.getInfo(url).catch(a => {});

            data.ListLength = 1;

            if (info === 'undefined' || info === undefined) {
                console.log(color(`[ERROR] - música ${url}`, 'red'));
                resolution();
            } else {

                const name = `${info.videoDetails.title}`.normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/([^\w]+|\s+)/g, '-')
                    .replace(/\-\-+/g, '-')
                    .replace(/(^-+|-+$)/, '');

                if (type == 'MP4') {

                    let itag;
                    end = '.mp4';

                    let inf = await ytdl.getInfo(url);
                    inf = inf.formats.filter(x => quality.itags.includes(x.itag));

                    if (inf.length === 0) {
                        if (quality.type === 'low') itag = { quality: 'lowestvideo' };
                        if (quality.type === 'medium') itag = { quality: 'lowestvideo' };
                        if (quality.type === 'high') itag = { quality: 'highestvideo' };
                    } else itag = { filter: format => format.itag === inf[inf.length - 1].itag };
                    
                    let streamVid = await downloadTemp.video({ url: url, name: name, itag: itag, dir: dir });
                    let streamAud = await downloadTemp.audio({ url: url, name: name, dir: dir });

                    ffmpeg()
                        .addInput(streamVid)
                        .addInput(streamAud)
                        .addOptions(['-map 0:v', '-map 1:a', '-c:v copy'])
                        .format('mp4')
                        .on('error', () => {
                            console.log(color(`[ERROR] - música: ${name} - ${url}`, 'red'));
                            data.ErrorLength += 1;
                            Events.emit('Downloaded', ({ dir: dir, data: data, resolution: resolution }));
                        })
                        .on('end', () => {
                            console.log(color('[DOWNLOADED] ' + name + end, 'magenta'));
                            data.SuccessLength += 1;
                            Events.emit('Downloaded', ({ dir: dir, data: data, resolution: resolution }));
                        })
                        .save(`${dir}/${name}${end}`);

                };

                if (type == 'MP3') {

                    end = '.mp3';

                    let stream = ytdl(url, {
                        quality: 'highestaudio',
                    })
                    .on("progress", (_, totalByteReceived, totalByteFile) => {
                        printProgress(
                            `Audio Download Progress: ${((totalByteReceived / totalByteFile) * 100).toFixed(
                            2
                            )} %`
                        );
                    });
                    
                    ffmpeg(stream).audioBitrate(320).save(`${dir}/${name}${end}`).on('error', () => {
                        process.stdout.clearLine();
                        process.stdout.cursorTo(0);
                        console.log(color(`[ERROR] - música: ${name} - ${url}`, 'red'));
                        data.ErrorLength += 1;
                        Events.emit('Downloaded', ({ dir: dir, data: data, resolution: resolution }));
                    }).on('end', () => {
                        process.stdout.clearLine();
                        process.stdout.cursorTo(0);
                        console.log(color('[DOWNLOADED] ' + name + end, 'magenta'));
                        data.SuccessLength += 1;
                        Events.emit('Downloaded', ({ dir: dir, data: data, resolution: resolution }));
                    });

                };

            };
            
        });
        const response = await promise;
        return response;

    };

    async playlist({ list: list, type: type, quality: quality, dir: dir }) {

        const promise = new Promise(async (resolution, rejection) => {

            console.log('\n\n');
            console.log(color('[LOG] - Carregando...', 'blue'));
            console.log('\n\n');

            if (list.items.length <= 0) {
                console.log(color('[ERROR] - Ocorreu um erro! verifique o link e tente novamente.', 'red'));
                resolution();
            };

            data.ListLength = list.items.length;

            if (type == 'MP4') {

                end = '.mp4';

                for (let i = 0; i < list.items.length; i++) {
                    const obj = list.items[i];
                    const info = await ytdl.getInfo(obj.shortUrl).catch(a => {});
        
                    if (info === 'undefined' || info === undefined) {
                        console.log(color(`[ERROR] - música ${obj.index} - ${obj.shortUrl}`, 'red'));
                        data.ListLength -= 1;
                        data.ErrorLength += 1;
                    } else {

                        const name = `${obj.index}-${info.videoDetails.title}`.normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .replace(/([^\w]+|\s+)/g, '-')
                            .replace(/\-\-+/g, '-')
                            .replace(/(^-+|-+$)/, '');

                        let itag;
                        end = '.mp4';

                        let inf = info.formats.filter(x => quality.itags.includes(x.itag));

                        if (inf.length === 0) {
                            if (quality.type === 'low') itag = { quality: 'lowestvideo' };
                            if (quality.type === 'medium') itag = { quality: 'lowestvideo' };
                            if (quality.type === 'high') itag = { quality: 'highestvideo' };
                        } else itag = { filter: format => format.itag === inf[inf.length - 1].itag };

                        let streamVid = await downloadTemp.video({ url: obj.shortUrl, name: name, itag: itag, dir: dir, pl: true });
                        let streamAud = await downloadTemp.audio({ url: obj.shortUrl, name: name, dir: dir, pl: true });

                        ffmpeg()
                            .addInput(streamVid)
                            .addInput(streamAud)
                            .addOptions(['-map 0:v', '-map 1:a', '-c:v copy'])
                            .format('mp4')
                            .on('error', () => {
                                console.log(color(`[ERROR] - música: ${name} - ${obj.shortUrl}`, 'red'));
                                data.ErrorLength += 1;
                                Events.emit('Downloaded', ({ dir: dir, data: data, resolution: resolution }));
                            })
                            .on('end', () => {
                                console.log(color('[DOWNLOADED] ' + name + end, 'magenta'));
                                data.SuccessLength += 1;
                                Events.emit('Downloaded', ({ dir: dir, data: data, resolution: resolution }));
                            })
                            .save(`${dir}/${name}${end}`);
        
                        await delay(1500);
        
                    };
                };

            };

            if (type == 'MP3') {

                end = '.mp3';

                for (let i = 0; i < list.items.length; i++) {
                    const obj = list.items[i];
                    const info = await ytdl.getInfo(obj.shortUrl).catch(a => {});
        
                    if (info === 'undefined' || info === undefined) {
                        console.log(color(`[ERROR] - música ${obj.index} - ${obj.shortUrl}`, 'red'));
                        data.ListLength -= 1;
                        data.ErrorLength += 1;
                    } else {
                        
                        const name = `${obj.index}-${info.videoDetails.title}`.normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .replace(/([^\w]+|\s+)/g, '-')
                            .replace(/\-\-+/g, '-')
                            .replace(/(^-+|-+$)/, '');

                        let stream = ytdl(obj.shortUrl, {
                            quality: 'highestaudio',
                        });
                        
                        ffmpeg(stream).audioBitrate(320).save(`${dir}/${name}${end}`).on('error', () => {
                            console.log(color(`[ERROR] - música: ${name} - ${obj.shortUrl}`, 'red'));
                            data.ErrorLength += 1;
                            Events.emit('Downloaded', ({ dir: dir, data: data, resolution: resolution }));
                        }).on('end', () => {
                            console.log(color('[DOWNLOADED] ' + name + end, 'magenta'));
                            data.SuccessLength += 1;
                            Events.emit('Downloaded', ({ dir: dir, data: data, resolution: resolution }));
                        });
        
                        await delay(1500);
        
                    };
                };

            };
            
        });
        const response = await promise;
        return response;

    };

};

module.exports = Download;

const printProgress = (message) => {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(message);
};