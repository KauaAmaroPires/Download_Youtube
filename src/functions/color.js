module.exports = (txt, cor) => {

  const code = {
    black: 30,
    blue: 34,
    red: 91,
    green: 92,
    yellow: 93,
    magenta: 95,
    cian: 96,
    white: 97
  }[cor];

  if (code) return "\x1b[" + code + "m" + txt + "\x1b[0m";
  
};