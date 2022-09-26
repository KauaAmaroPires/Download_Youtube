const puppeteer = require('puppeteer');
const fs = require('fs');
const { validateURL } = require('ytdl-core');
const color = require('./functions/color');
const Download = require('./functions/download');
const { download, playlist } = new Download();
const list = [];
const dir = `./músicas`;

const imput = process.stdin;
imput.setEncoding('utf-8');

let URL; //'https://www.youtube.com/playlist?list=PLJeRqGrP3sbRQOQM0-wWxvxyhvIFGLRSD';
let TYPE;

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        var scrollHeight = document.documentElement.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 300);
    });
  });
};

console.log('Digite abaixo o link do vídeo ou da playlist.');

imput.on('data', async (data) => {

  if (data.trim().split(' ') === 0) return;
  if (data.trim().length <= 0) return;

  if (!URL) {
    URL = data.trim();
    console.log('escolha o formato de download:\n  [1] MP4\n  [2] MP3');
    return;
  } else if (!TYPE) {

    if (!['1', '2'].includes(data.trim())) return;

    TYPE = data.trim();

    console.clear();

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    };

    if (validateURL(URL)) {
      await download({ url: URL, type: TYPE, dir: dir });
    } else {

      let num = 0;
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--disable-notifications', '--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setViewport({
        width: 1366,
        height: 768,
      });
      
      page.on("response", async (response) => {
        let url = response.url();
        if (response.request().resourceType() === "image" && url.includes('https://i.ytimg.com/vi/') && !url.includes('EXCNACEL')) {
          num += 1;
          url = `https://www.youtube.com/watch?v=${url.split('https://').join('').split('/')[2]}`;
          console.log(num, color(url, 'white'));
          list.push({
            index: num,
            url: url
          });
        };
      });

      await page.goto(URL, {
        timeout: 0,
        waitUntil: "networkidle0",
      }).catch(() => {
        console.log(color('[ERROR] - Ocorreu um erro! verifique o link e tente novamente.', 'red'));
        process.exit();
      });

      await autoScroll(page);
      await browser.close();
      await playlist({ list: list, type: TYPE, dir: dir });
      
    };

  };

});

process.on("multipleResolves", (type, promise, reason) => {
  //console.log(`Vários erros identificados:\n\n` + type, promise, reason);
});

process.on("unhandRejection", (reason, promise) => {
  //console.log(`Erros identificado:\n\n` + reason, promise);
});

process.on("uncaughtException", (error, origin) => {
  console.log(`Erros identificado:\n\n` + error, origin);
});

process.on("uncaughtExceptionMonitor", (error, origin) => {
  console.log(`Erros identificado:\n\n` + error, origin);
});