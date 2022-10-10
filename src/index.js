#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const { validateURL } = require('ytdl-core');
const figlet = require('figlet');
const inquirer = require('inquirer');
const color = require('./functions/color');
const Download = require('./functions/download');
const { download, playlist } = new Download();
const list = [];
const dir = `./músicas`;

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

console.log(color(figlet.textSync('Download_Youtube'), 'cian'));

inquirer.prompt([
  {
    name: 'url',
    message: 'link do vídeo ou da playlist:',
    validate(answer) {
      if (answer.length < 1) {
        return 'Digite ou cole o link, essa ação e obrigatória.';
      };
      return true;
    }
  },
  {
    type: 'list',
    message: 'escolha o formato de download:',
    name: 'format',
    choices: ['MP4', 'MP3']
  }
]).then(async (data) => {

  const URL = data.url;
  const TYPE = data.format;

  //console.clear();

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  };

  process.stdin.setEncoding('utf-8').on('data', () => {});

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

});

process.on("multipleResolves", (type, promise, reason) => {});

process.on("unhandRejection", (reason, promise) => {});

process.on("uncaughtException", (error, origin) => {
  console.log(`Erros identificado:\n\n` + error, origin);
});

process.on("uncaughtExceptionMonitor", (error, origin) => {
  console.log(`Erros identificado:\n\n` + error, origin);
});