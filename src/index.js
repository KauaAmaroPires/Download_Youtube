#!/usr/bin/env node

const fs = require('fs');
const { validateURL } = require('ytdl-core');
const ytpl = require('ytpl');
const figlet = require('figlet');
const inquirer = require('inquirer');
const color = require('./functions/color');
const Download = require('./functions/download');
const { download, playlist } = new Download();
let list = [];
let dir = `./músicas`;
let format;

console.log(color(figlet.textSync('Download_Youtube'), 'cian'));

inquirer.prompt([
  {
    name: 'url',
    message: 'link do vídeo ou da playlist:',
    validate(answer) {
      if (answer.length < 1) {
        return 'Digite ou cole o link, essa ação e obrigatória.';
      };
      let pass = false
      if (validateURL(answer.trim())) pass = true;
      if (ytpl.validateID(answer.trim())) pass = true;
      if (!pass) return 'Digite ou cole o link, essa ação e obrigatória.';
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

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  };

  if (validateURL(URL)) {
    await download({ url: URL, type: TYPE, dir: dir });
  } else {

    list = await ytpl(URL, { pages: 1 }).catch(e => {
      console.log(color('[ERROR] - Ocorreu um erro! verifique o link e tente novamente.', 'red'));
      process.exit();
    });

    if (list.estimatedItemCount > 100) {
      list = await ytpl(URL, { pages: Math.ceil(list.estimatedItemCount / 100, 1) });
    };

    dir = dir + '/' + list.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/([^\w]+|\s+)/g, '-').replace(/\-\-+/g, '-').replace(/(^-+|-+$)/, '');

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    } else {
      dir = `./músicas`;
    };

    for (let i = 0; i < list.items.length; i++) {
      const url = list.items[i].shortUrl;
      const num = i + 1;
      list.items[i].index = num;
      console.log(num, color(url, 'white'));
    };

    await playlist({ list: list, type: TYPE, dir: dir });

  };

});

process.on("unhandRejection", (reason, promise) => {});

process.on("uncaughtException", (error, origin) => {
  console.log(`Erros identificado:\n\n` + error, origin);
});

process.on("uncaughtExceptionMonitor", (error, origin) => {
  console.log(`Erros identificado:\n\n` + error, origin);
});