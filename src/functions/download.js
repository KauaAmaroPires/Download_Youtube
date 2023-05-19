const ffmpeg = require('fluent-ffmpeg');
const ytdl = require('ytdl-core');
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

Events.on('Downloaded', async ({ data: data, resolution: resolution }) => {
    if (data.SuccessLength >= data.ListLength) {
        console.log('\n\n');
        console.log(color(`[LOG] - Download Completo! Success: ${data.SuccessLength}, Error: ${data.ErrorLength} encerrando processos...`, 'blue'));
        console.log('\n\n');
        await delay(2500);
        resolution();
    };
});

class Download {
    constructor() {
        this.version = require('../../package.json').version;
    }

    async download({ url: url, type: type, dir: dir }) {

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

                    end = '.mp4';

                    ytdl(url, {
                        filter: format => format.itag === 18
                    }).pipe(fs.createWriteStream(`${dir}/${name}${end}`)).on('finish', () => {
                        console.log(color('[DOWNLOADED] ' + name + end, 'magenta'));
                        data.SuccessLength += 1;
                        Events.emit('Downloaded', ({ data: data, resolution: resolution }));
                    })
                    .on('unpipe', () => {})
                    .on('close', () => {})
                    .on('drain', () => {})
                    .on('error', () => {
                        console.log(color(`[ERROR] - música: ${name} - ${url}`, 'red'));
                        data.ErrorLength += 1;
                        Events.emit('Downloaded', ({ data: data, resolution: resolution }));
                    });

                };

                if (type == 'MP3') {

                    end = '.mp3';

                    let stream = ytdl(url, {
                        quality: 'highestaudio',
                    });
                    
                    ffmpeg(stream).audioBitrate(320).save(`${dir}/${name}${end}`).on('error', () => {
                        console.log(color(`[ERROR] - música: ${name} - ${url}`, 'red'));
                        data.ErrorLength += 1;
                        Events.emit('Downloaded', ({ data: data, resolution: resolution }));
                    }).on('end', () => {
                        console.log(color('[DOWNLOADED] ' + name + end, 'magenta'));
                        data.SuccessLength += 1;
                        Events.emit('Downloaded', ({ data: data, resolution: resolution }));
                    });

                };

            };
            
        });
        const response = await promise;
        return response;

    };

    async playlist({ list: list, type: type, dir: dir }) {

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
        
                        ytdl(obj.shortUrl, {
                            filter: format => format.itag === 18
                        }).pipe(fs.createWriteStream(`${dir}/${name}${end}`)).on('finish', () => {
                            console.log(color('[DOWNLOADED] ' + name + end, 'magenta'));
                            data.SuccessLength += 1;
                            Events.emit('Downloaded', ({ data: data, resolution: resolution }));
                        })
                        .on('unpipe', () => {})
                        .on('close', () => {})
                        .on('drain', () => {})
                        .on('error', () => {
                            console.log(color(`[ERROR] - música: ${name} - ${obj.shortUrl}`, 'red'));
                            data.ErrorLength += 1;
                            Events.emit('Downloaded', ({ data: data, resolution: resolution }));
                        });
        
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
                            Events.emit('Downloaded', ({ data: data, resolution: resolution }));
                        }).on('end', () => {
                            console.log(color('[DOWNLOADED] ' + name + end, 'magenta'));
                            data.SuccessLength += 1;
                            Events.emit('Downloaded', ({ data: data, resolution: resolution }));
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