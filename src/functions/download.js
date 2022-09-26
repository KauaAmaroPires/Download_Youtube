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

Events.on('Downloaded', (data) => {
    if (data.SuccessLength >= data.ListLength) {
        console.log('\n\n');
        console.log(color(`[LOG] - Download Completo! Success: ${data.SuccessLength}, Error: ${data.ErrorLength} encerrando processos...`, 'blue'));
        console.log('\n\n');
        process.exit();
    };
});

class Download {
    constructor() {
        this.version = '1.0.0';
    }

    async download({ url: url, type: type, dir: dir }) {

        console.log('\n\n');
        console.log(color('[LOG] - Carregando...', 'blue'));
        console.log('\n\n');

        let ytdl = require('ytdl-core');
        const info = await ytdl.getInfo(url).catch(a => {});

        data.ListLength = 1;

        if (info === 'undefined' || info === undefined) {
            console.log(color(`[ERROR] - música ${url}`, 'red'));
            process.exit();
        } else {

            const name = `${info.videoDetails.title}`.normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/([^\w]+|\s+)/g, '-')
                .replace(/\-\-+/g, '-')
                .replace(/(^-+|-+$)/, '');

            let filter;
            let end;

            if (type == 'MP4') {
                end = '.mp4';
                filter = { filter: format => format.itag === 18 };
            };
            if (type == 'MP3') {
                end = '.mp3';
                filter = { filter: "audioonly" };
            };

            ytdl(url, filter).pipe(fs.createWriteStream(`${dir}/${name}${end}`)).on('finish', () => {
                console.log(color('[DOWNLOADED] ' + name + end, 'magenta'));
                data.SuccessLength += 1;
                Events.emit('Downloaded', (data));
            })
            .on('unpipe', () => {})
            .on('close', () => {})
            .on('drain', () => {})
            .on('error', () => {
                console.log(color(`[ERROR] - música: ${name} - ${url}`, 'red'));
                data.ErrorLength += 1;
                Events.emit('Downloaded', (data));
            });

        };

    };

    async playlist({ list: list, type: type, dir: dir }) {

        console.log('\n\n');
        console.log(color('[LOG] - Carregando...', 'blue'));
        console.log('\n\n');

        if (list.length <= 0) {
            console.log(color('[ERROR] - Ocorreu um erro! verifique o link e tente novamente.', 'red'));
            process.exit();
        };

        data.ListLength = list.length;

        for (let i = 0; i < list.length; i++) {
            let ytdl = require('ytdl-core');
            const obj = list[i];
            const info = await ytdl.getInfo(obj.url).catch(a => {});

            if (info === 'undefined' || info === undefined) {
                console.log(color(`[ERROR] - música ${obj.index} - ${obj.url}`, 'red'));
                data.ListLength -= 1;
                data.ErrorLength += 1;
            } else {
                
                const name = `${obj.index}-${info.videoDetails.title}`.normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/([^\w]+|\s+)/g, '-')
                    .replace(/\-\-+/g, '-')
                    .replace(/(^-+|-+$)/, '');

                let filter;
                let end;

                if (type == 'MP4') {
                    end = '.mp4';
                    filter = { filter: format => format.itag === 18 };
                };
                if (type == 'MP3') {
                    end = '.mp3';
                    filter = { filter: "audioonly" };
                };

                ytdl(obj.url, filter).pipe(fs.createWriteStream(`${dir}/${name}${end}`)).on('finish', () => {
                    console.log(color('[DOWNLOADED] ' + name + end, 'magenta'));
                    data.SuccessLength += 1;
                    Events.emit('Downloaded', (data));
                })
                .on('unpipe', () => {})
                .on('close', () => {})
                .on('drain', () => {})
                .on('error', () => {
                    console.log(color(`[ERROR] - música: ${name} - ${obj.url}`, 'red'));
                    data.ErrorLength += 1;
                    Events.emit('Downloaded', (data));
                });

                await delay(1500);

            };
        };

    };

};

module.exports = Download;