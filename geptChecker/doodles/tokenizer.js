const p1 = `I'll hope you've still remembered what we covered in the 1st week. \nWell, the key-point was that a $2,500.99 or 67% proportion of greenhouse gases come from the food we eat in the 1990s at 3 A.M. or 2 P.M., or 1 a.m. or thereabouts. ` //And of this food, it's red meat - principally beef, lamb and pork -- that have a brand-new impact on our global climate, much more than vegetables or even other types of meat. Clearly, the question is: how can consumers be persuaded to eat less red meat? In today's class, I'll talk about "a recent study that addresses one method of achieving just that."?`;

const p2 = `The researchers wanted to gauge whether labeling a food as good or bad for the environment could influence the way people dine. For the study, more than 5,000 participants were shown a fast food menu and then asked to choose one item. The first group received a menu which labeled red meat items as having a "high climate impact. " The second group's menu highlighted items that had a "low climate impact, " such as chicken, fish, and vegetarian options. The menu for the third group, which was the control group, had no labels. marcus. marcus. Marcus,`;

function chunkTextByRegex(text) {
  const chop = "_";
  let textArr;
  text = text.replaceAll(/(\w)-(\w)/g, "$1qqqh$2")
  text = text.replaceAll(/(\w|\d)'(\w)/g, "$1qqqx$2")
  text = text.replaceAll(/(\b[#$£]\d)/g, "_$1");
  text = text.replaceAll(/(\dp|s|%|¢|st|nd|rd|th)/g, "_$1");
  text = text.replaceAll(/\s+/g, chop);
  // textArr = text.split(/\b/);
  textArr = text.split(chop);
  console.log(textArr)
}

function chunkText(text){
  text = text.replaceAll(/(A|P)\.(M)\./ig, "$1qqq$2qqq");
  let textArr = split(text);
  textArr = tokenize(textArr);
  return textArr;
}
function split(text) {
  let textArr;
  textArr = text.split(/\b/);
  // textArr = text.trim().split(/([^a-zA-Z0-9])/);
  // console.log(textArr)
  return(textArr);
}

function tokenize(textArr){
  // Pass 1: identify possible tokens
  let tmpArr = [];
  for (let el of textArr){
    if (!el.length) continue;
    let token = "**";
    if (/^\s+$/.test(el)) token = "s";                  // space
    else if (el === "-") token = "s";                   // hyphen
    else if (el === "'") token = "a";                   // apostrophe
    else if (/\d/.test(el)) token = "d";                // digit
    else if (/[#$£]/.test(el)) token = "$";             // pre-digit punctuation (i.e. money etc.)
    else if (/[%¢]/.test(el)) token = "%";              // post-digit punctuation (i.e. money etc.)
    else if (el === ".") token = "@";                   // punctuation digit (i.e. occurs in digits)
    else if (el === ",") token = "@";
    else if (/["',\.\/\?\!\(\[\)\]]/.test(el)) token = "p";  // punctuation
    else if (el.indexOf("qqq") >= 0) [el, token] = [el.replaceAll("qqq", "."), "w"];
    else if (/--/.test(el)) token = "p";                          // m-dash
    else if (/\s/.test(el) && el.indexOf("-") >= 0) token = "p";  // dash (i.e. punctuation)
    else if (/[a-zA-Z]/.test(el)) token = "w";                    // word
    tmpArr.push([el, token]);
  }
  // Pass 2: use context to identify tokens & assign suitability to compound search
  textArr = [];
  const max = tmpArr.length - 1;
  let inPhrase;
  let entry;
  for (let i=0; i <= max; i++){
    const prev = (i > 0) ? tmpArr[i-1] : [null,"-"];
    const next = (i < max) ? tmpArr[i+1] : [null,"-"];
    const curr = tmpArr[i];
    const c_n = curr[1] + next[1];
    const p_c_n = prev[1]+c_n;
    inPhrase = "wsc".includes(curr[1]);  // word/space/contractions
    entry = [inPhrase];
    if (p_c_n === "waw") entry.push("+", "c");           // contractions
    else if (c_n === "$d") entry.push("+", "d");         // currency signs
    else if (c_n === "d%") entry.push("+", "d");         // post-digit punctuation
    else if (c_n === "d@") entry.push("+", "d");         // decimal point / thousand separator
    else if (p_c_n === "d@d") entry.push("+", "d");      // decimal point / thousand separator
    curr.push(...entry);
  }
  // Pass 3: Merge specified chunks
  let tmpArr2 = [];
  let acc = [];
  for (let el of tmpArr){
    const accumulatorEmpty = !!acc.length;
    const combineWithNext = el.length === 5;
    if (combineWithNext) {
      if (accumulatorEmpty) acc = [acc[0]+el[0], el[4], el[2]];
      else acc = [el[0], el[4], el[2]];
    }
    else {
      if (accumulatorEmpty){
        acc = [acc[0]+el[0], acc[1], el[2]];
        tmpArr2.push(acc);
        acc = [];
      }
      else tmpArr2.push([el[0], el[1], el[2]]);
    }
  }
  // Pass 4: Mark chunks
  tmpArr = [];
  chunk = [];
  inPhrase = false;
  // let phrasing;
  for (let el of tmpArr2){
    const newEl = [el[0], el[0].toLowerCase(), el[1], []]
    if (!inPhrase && el[2]) {
      // phrasing = "start";
      inPhrase = true;
      chunk = [newEl];
    }
    else if (inPhrase && !el[2]){
      // phrasing = "stop";
      inPhrase = false;
      chunk.push(el);
      tmpArr.push(chunk);
    }
    else {
      // phrasing = "";
      chunk.push(newEl);
    }
    // el[2] = phrasing;
    // tmpArr.push(el);
  }
  return tmpArr;
}

let text = chunkText(p1);
console.log(text)