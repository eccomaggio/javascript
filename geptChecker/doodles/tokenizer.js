const p1 = `I'll hope you've still remembered our brand-new things in the 1st week. \nWell, the key-point was that a $2,500.99 or 67% proportion of greenhouse gases come from the food we eat in the 1990s at 3 A.M. or 2 P.M., or 1 a.m. or thereabouts. ` //And of this food, it's red meat - principally beef, lamb and pork -- that have a brand-new impact on our global climate, much more than vegetables or even other types of meat. Clearly, the question is: how can consumers be persuaded to eat less red meat? In today's class, I'll talk about "a recent study that addresses one method of achieving just that."?`;

const p2 = `The researchers wanted to gauge whether labeling a food as good or bad for the environment could influence the way people dine. For the study, more than 5,000 participants were shown a fast food menu and then asked to choose one item. The first group received a menu which labeled red meat items as having a "high climate impact. " The second group's menu highlighted items that had a "low climate impact, " such as chicken, fish, and vegetarian options. The menu for the third group, which was the control group, had no labels. marcus. marcus. Marcus,`;

const compounds = {
  "am": 2,
  "absentminded": 26,
  "airconditioner": 209,
  "airconditioned": 210,
  "bandaid": 596,
  "brandnew": 900,
  "breakin": 916,
  "buildup": 987,
  "checkin": 1232,
  "contactlens": 1649,
  "conveniencestore": 1693,
  "creditcard": 1831,
  "crosscountry": 1859,
  "daytoday": 1960,
  "departmentstore": 2064,
  "diningroom": 2184,
  "dodgeball": 2319,
  "doubletenthday": 2345,
  "dragonboatfestival": 2366,
  "elementaryschool": 2508,
  "etc": 2667,
  "firstclass": 2960,
  "flattire": 2986,
  "followup": 3037,
  "frenchfries": 3124,
  "frontpage": 3145,
  "fulltime": 3158,
  "goahead": 3285,
  "goodlooking": 3298,
  "grownup": 3386,
  "halftime": 3434,
  "headon": 3518,
  "highrise": 3586,
  "hongkong": 3634,
  "hotdog": 3668,
  "icecream": 3725,
  "juniorhighschool": 4104,
  "knowhow": 4156,
  "lanternfestival": 4190,
  "largescale": 4194,
  "leadin": 4230,
  "lefthand": 4252,
  "leftwing": 4253,
  "livein": 4361,
  "livingroom": 4366,
  "longstanding": 4400,
  "longterm": 4401,
  "maam": 4453,
  "madeup": 4458,
  "mailcarrier": 4474,
  "manmade": 4508,
  "mensroom": 4616,
  "middleaged": 4649,
  "mothersday": 4787,
  "mr": 4816,
  "mrs": 4817,
  "ms": 4819,
  "newyearsday": 4925,
  "newyearseve": 4926,
  "nicelooking": 4938,
  "oclock": 5056,
  "oldfashioned": 5081,
  "onesided": 5089,
  "onetime": 5090,
  "pm": 5232,
  "parkinglot": 5286,
  "parttime": 5306,
  "popmusic": 5579,
  "postoffice": 5606,
  "presidentelect": 5687,
  "putdown": 5880,
  "quarterfinal": 5901,
  "republicofchina": 6183,
  "righthand": 6301,
  "rightwing": 6302,
  "rollerblade": 6342,
  "rollerskate": 6343,
  "runnerup": 6388,
  "runup": 6390,
  "saudiarabia": 6447,
  "secondhand": 6522,
  "secretarygeneral": 6526,
  "selfesteem": 6549,
  "semifinal": 6554,
  "seniorhighschool": 6560,
  "shortsighted": 6675,
  "shortterm": 6676,
  "sideeffect": 6705,
  "sitdown": 6754,
  "sitin": 6756,
  "socalled": 6865,
  "softdrink": 6880,
  "southeast": 6930,
  "southwest": 6932,
  "soysauce": 6937,
  "standup": 7056,
  "tabletennis": 7380,
  "tailormade": 7399,
  "taxfree": 7437,
  "teachersday": 7443,
  "tradein": 7706,
  "tradeoff": 7708,
  "tshirt": 7820,
  "tugofwar": 7827,
  "twothirds": 7855,
  "uptodate": 7947,
  "valentinesday": 7981,
  "vicepresident": 8041,
  "wayout": 8168,
  "wellbeing": 8203,
  "wellknown": 8204,
  "womensroom": 8297,
  "wouldbe": 8330,
  "xray": 8349,
  "overestimate": 8441,
  "reevaluate": 8546,
  "reevaluation": 8547,
  "underresourced": 8582,
  "nontraditional": 8594,
  "coordinate": 8610,
  "coordinated": 8611,
  "coordination": 8612,
  "coordinator": 8613,
  "cooperate": 8838,
  "cooperation": 8839,
  "cooperative": 8840,
  "cooperatively": 8841,
  "nonconformist": 8953,
  "nonconformity": 8954
}


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
  text = text.replaceAll("\n", " EOL ")
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
  textArr = tokenize1(textArr);
  textArr = tokenize2(textArr);
  textArr = tokenize3(textArr);
  textArr = tokenize4(textArr);
  return textArr;
}

function tokenize1(textArr) {
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
    else if (el.indexOf("EOL") >= 0) token = "p";
    else if (/--/.test(el)) token = "p";                          // m-dash
    else if (/\s/.test(el) && el.indexOf("-") >= 0) token = "p";  // dash (i.e. punctuation)
    else if (/[a-zA-Z]/.test(el)) token = "w";                    // word
    tmpArr.push([el, token]);
  }
  return tmpArr;
}

function tokenize2(textArr){
  // Pass 2: use context to identify tokens & assign suitability to compound search
  const max = textArr.length - 1;
  let inPhrase;
  let entry;
  for (let i=0; i <= max; i++){
    const prev = (i > 0) ? textArr[i-1] : [null,"-"];
    const next = (i < max) ? textArr[i+1] : [null,"-"];
    const curr = textArr[i];
    const c_n = curr[1] + next[1];
    const p_c_n = prev[1]+c_n;
    inPhrase = "wsc".includes(curr[1]);  // word/space/contractions
    entry = [inPhrase];
    if (p_c_n === "waw") entry.push("+", "c");           // contractions
    else if (c_n === "$d") entry.push("+", "d");         // currency signs
    else if (c_n === "d%") entry.push("+", "d");         // post-digit punctuation
    else if (c_n === "d@") entry.push("+", "d");         // decimal point / thousand separator
    else if (p_c_n === "d@d") entry.push("+", "d");      // decimal point / thousand separator
    else if (prev[0] === "EOL") entry.push("-");
    curr.push(...entry);
  }
  return textArr;
}

function tokenize3(textArr){
  // Pass 3: Merge specified chunks
  let tmpArr = [];
  let acc = [];
  for (let el of textArr){
    if (el[3] === "-") continue;
    const accumulatorEmpty = !!acc.length;
    const combineWithNext = el.length === 5;
    if (combineWithNext) {
      if (accumulatorEmpty) acc = [acc[0]+el[0], el[4], el[2]];
      else acc = [el[0], el[4], el[2]];
    }
    else {
      if (accumulatorEmpty){
        acc = [acc[0]+el[0], acc[1], el[2]];
        tmpArr.push(acc);
        acc = [];
      }
      else tmpArr.push([el[0], el[1], el[2]]);
    }
  }
  return tmpArr;
}

function tokenize4(textArr){
  // Pass 4: Mark chunks
  tmpArr = [];
  chunk = [];
  inPhrase = false;
  for (let el of textArr){
    const newEl = [el[0], el[0].toLowerCase(), el[1], []]
    if (!inPhrase && el[2]) {
      // START
      inPhrase = true;
      chunk = [newEl];
    }
    else if (inPhrase && !el[2]){
      // STOP
      inPhrase = false;
      chunk.push(el);
      tmpArr.push(chunk);
    }
    else {
      chunk.push(newEl);
    }
  }
  return tmpArr;
}

function findCompoundsAndFlattenArray(chunks) {
  let flatArray = [];
  for (const chunk of chunks) {
    /* for each word, checks normalized words to end of chunk in search of compound match
    then adds this as a match
    "tail" is the sequence of words in a chunk (punctuation delimited block) as an array.
    The function iterates through it, removing the first word each time
    */
    for (let word_i = 0; word_i <= chunk.length - 1; word_i++) {
      if (chunk[word_i][2] === "s") {
        word_i++;
        continue;
      }
      console.log("???", chunk[word_i])
      let tail = [];
      for (let j = word_i; j < chunk.length; j++) {
        tail.push(chunk[j][0])
      }
      let matches = [];
      const flattenedTail = tail.join("").replace(/-/g, "");
      for (const compound in compounds) {
        if (flattenedTail.startsWith(compound)) {
          const id = compounds[compound];
          // ** This cludge is to stop 'a.m.' matching with anything that begins 'am...'
          const isValidMatch = (compound.length === 2) ?  flattenedTail.length === 2 : true;
          // debug("^^", compound, flattenedTail, isValidMatch, V.isExactMatch)
          if (isValidMatch) {
            matches.push(id);
            break;
          }
        }
      }
      chunk[word_i].push(matches);
    }
    // ** required so that all wordArrs have matches ready for the next stage
    chunk[chunk.length - 1].push([]);
    flatArray.push(...chunk);
  }
  return flatArray;
}

function getType(el) {
  return el[2];
}



let text = chunkText(p1);
text = findCompoundsAndFlattenArray(text);
console.log(text)