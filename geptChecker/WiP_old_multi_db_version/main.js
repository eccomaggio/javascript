// "use strict";


const app = new App();
app.init();

// ## UTILITIES ############################################

function debounce(func, timeout = 500) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

// function debug(...params) {
//   console.log(`DEBUG: ${debug.caller.name}> `, params);
// }
