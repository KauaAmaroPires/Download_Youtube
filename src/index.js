#!/usr/bin/env node

const fs = require('fs');
const { validateURL } = require("@distube/ytdl-core");
const ytpl = require('@distube/ytpl');
const figlet = require('figlet');
const inquirer = require('inquirer');
const color = require('./functions/color');
const Download = require('./functions/download');
const { download, playlist } = new Download();
let list = [];
let dir = `./músicas`;

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
  },
  {
    type: 'list',
    message: 'escolha qualidade:',
    name: 'quality',
    choices: ['Baixo - low', 'Medio - medium', 'Alto - high']
  }
]).then(async (data) => {

  const qualityTypes = {
    'Baixo - low' : {
      type: 'low',
      itags: [18, 133, 160]
    },
    'Medio - medium' : {
      type: 'medium',
      itags: [135, 136, 298]
    },
    'Alto - high' : {
      type: 'high',
      itags: [137, 299]
    }
  };

  const URL = data.url;
  const TYPE = data.format;
  const QUALITY = qualityTypes[data.quality];

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  };

  if (validateURL(URL)) {
    await download({ url: URL, type: TYPE, quality: QUALITY, dir: dir });
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

    await playlist({ list: list, type: TYPE, quality: QUALITY, dir: dir });

  };

});

process.on("unhandRejection", (reason, promise) => {});

process.on("uncaughtException", (error, origin) => {
  console.log(`Erros identificado:\n\n` + error, origin);
});

process.on("uncaughtExceptionMonitor", (error, origin) => {
  console.log(`Erros identificado:\n\n` + error, origin);
});