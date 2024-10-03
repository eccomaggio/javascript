function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function getRandomDay() {
  return getRandomInt(365) + 1;
}

function shareDayByChance(day) {
  let attempt = 0;
  let noMatch = true;
  while (noMatch) {
    attempt++;
    randomDay = getRandomDay();
    if (randomDay === day) noMatch = false;
    // console.log(`attempt: ${attempt}: *${day}* > ${randomDay}`)
  }
  // console.log(" ");
  return attempt;
}

let spread = {};
for (let i = 0; i < 100000; i++) {
  const n = shareDayByChance(getRandomDay());
  // console.log(i, n)
  if (spread[n]) spread[n]++;
  else spread[n] = 1;
}
// console.log(Object.keys(spread).length, spread);

