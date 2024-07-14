"use strict";

function makeGEPTdb() {
  return [["", null, [0, -1, 2], "dummy entry: 0 easily confused with undefined|"], ["a", "a", [0, -1, 2], "\u4e00(\u500b); \u5f8c\u63a5\u6bcd\u97f3\u958b\u982d\u4e4b\u5b57\u6642\u70ba an"], ["A.M.", "b", [0, -1, 2], "\u4e0a\u5348; = a.m.= AM"], ["abandon", "v", [1, 45, 3], "\u62cb\u68c4\u3001\u6368\u68c4\u3001\u4e2d\u6b62; ; |abandon"], ["abandon", "n", [1, 45, 3], "\u76e1\u60c5\u3001\u653e\u7e31; ; \u62cb\u68c4\u3001\u6368\u68c4\u3001\u4e2d\u6b62; ; |abandon"], ["abbey", "n", [2, -1, 2], "\u5927\u4fee\u9053\u9662; "], ["abbreviate", "v", [2, -1, 2], "\u7e2e\u5beb\u3001\u4f7f\u7c21\u77ed; "], ["abbreviation", "n", [2, -1, 2], "\u7e2e\u5beb\u3001\u7c21\u7a31; "], ["abdomen", "n", [2, -1, 2], "\u8179\u90e8; "], ["abide", "v", [2, -1, 2], "\u5bb9\u5fcd\u3001\u9075\u5b88; "], ["ability", "n", [0, -1, 2], "\u80fd\u529b\u3001\u624d\u80fd; "], ["able", "j", [0, -1, 2], "\u80fd\u5920\u7684\u3001\u6709\u624d\u80fd\u7684; "], ["abstract", "jn", [1, 43, 3], "\u62bd\u8c61\u7684; ; |abstract"], ["abstract", "n", [1, 43, 3], "\u6458\u8981; ; \u62bd\u8c61\u7684; ; |abstract"],]
}

const text = [
  ["abdomen", "w", [8], 4],
  ["average", "w", [539], 4],
  ["!", "p", [], 0]
];

class Entry {
  static currID = 0;
  // constructor(id, lemma, pos, levelArr, notes) {
  constructor(lemma, pos, levelArr, notes) {
    // this._id = id;
    this._id = Entry.currID;
    Entry.incrementID();
    this._lemma = lemma;
    this._pos = pos;
    this._levelArr = levelArr;
    this._notes = notes;
  }

  get id() { return this._id }
  get lemma() { return this._lemma }
  get pos() { return this._pos }
  get levelArr() { return this._levelArr }
  get levelNum() { return this._levelArr[0] }
  get levelAWL() { return this._levelArr[1] }
  get levelStatus() { return this._levelArr[1] }
  get notes() { return this._notes }
  // get geptNotes() {}
  // get awlNotes() {}
  static incrementID() { Entry.currID++ }
}

class Token {
  constructor(lemma, type, matches = [], count = 0) {
    this.lemma = lemma;
    this.type = type;
    this.matches = matches;
    this.count = count;
  }
}


function escapeHTML(text) {
  if (!text) return "";
  // console.log("escape:", typeof text, text)
  return text.replace(/[<>&"]/g, char => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': " &quot;" }[char]));
}

function tag(name, attrs = [], content = []) {
  return new Tag(name, attrs, content);
}

function root(content) {
  if (arguments.length === 1) {
    if (typeof arguments[0] !== "object") content = [arguments[0]];
    else content = arguments[0];
  }
  else if (arguments.length > 1) content = [...arguments];
  // content = content.reduce((acc,el) => {
  //   if (Array.isArray(el)) acc.push(...el.flat(Infinity));
  //   else acc.push(el);
  //   return acc;
  // }, []);
  content = content.reduce((acc, el) => {
    (Array.isArray(el)) ? acc.push(...el.flat(Infinity)) : acc.push(el);
    return acc;
  }, []);
  return new Tag("root", [], content);
}

function attr(name, value) {
  return new Attr(name, value);
}


// class Attr {
//   constructor(name, value) {
//     this.name = name;
//     if (typeof value === "object") value = value.join(" ");
//     this.value = escapeHTML(value);
//   }
//   str() {
//     return `${this.name}="${this.value}"`;
//   }
// }


// class Tag {
//   constructor(name, attrs=[], content=[]) {
//     this.isEmpty = !attrs.length && !content.length;
//     this.name = name;
//     if (typeof attrs === "string") attrs = [attrs];
//     // this.attrs = attrs.map(el => new Attr(...el.split("=")));
//     this.attrs = attrs.map(el => {
//       let tmp = el.split("=");
//       return (tmp.length === 1) ? [tmp] : [tmp[0],escapeHTML(tmp[1])];
//     });
//     this.content = (typeof content === "string") ? [content] : content;
//   }
//   stringify() {
//     if (this.isEmpty) return `<${this.name} />`;
//     let tmpContent = "";
//     for (const el of this.content){
//       tmpContent += (typeof el === "string") ? escapeHTML(el) : el.stringify();
//     }
//     // ** <root> is used to render a chain of html/text tags; it is not itself rendered
//     if (this.name === "root") return tmpContent;
//     // const tmpAttrs = (this.attrs.length) ? " " + this.attrs.map(el => el.str()).join(" ") : "";
//     let tmpAttrs = "";
//     if (this.attrs.length){
//       tmpAttrs = this.attrs.map(
//         el => (el.length === 1)
//         ? ` ${el}`
//         : ` ${el[0]}="${el[1]}"`
//       ).join("");
//     }
//     return `<${this.name}${tmpAttrs}>${tmpContent}</${this.name}>`;
//   }
// }

// class Html {
//   constructor(arrOfTagsAndText){
//     this.content = arrOfTagsAndText;
//   }
//   stringify() {
//     return this.content.map(el => (el.constructor.name === "Tag") ? el.stringify() : escapeHTML(el)).join("");
//   }
// }


class Tag {
  constructor(name, attrs = [], content = []) {
    if (typeof content === "string") content = [content];
    this.isEmpty = !attrs.length && !content.length;
    this.name = name;
    if (typeof attrs === "string") attrs = [attrs];
    this.attrs = attrs.map(el => {
      let tmp = el.split("=");
      return (tmp.length === 1) ? [tmp] : [tmp[0], escapeHTML(tmp[1])];
    });
    // this.content = (typeof content === "string") ? [content] : content;
    this.content = content.map(el => (typeof el === "string") ? escapeHTML(el) : el);
  }
  stringify() {
    if (this.isEmpty) return `<${this.name} />`;
    let tmpContent = "";
    for (let el of this.content) {
      if (typeof el === "number") el = el.toString();
      // tmpContent += (typeof el === "string") ? escapeHTML(el) : el.stringify();
      tmpContent += (typeof el === "string") ? el : el.stringify();
    }
    // ** <root> is used to render a chain of html/text tags; it is not itself rendered
    if (this.name === "root") return tmpContent;
    let tmpAttrs = "";
    if (this.attrs.length) {
      tmpAttrs = this.attrs.map(
        el => (el.length === 1)
          ? ` ${el}`
          : ` ${el[0]}="${el[1]}"`
      ).join("");
    }
    return `<${this.name}${tmpAttrs}>${tmpContent}</${this.name}>`;
  }
}






const htmlTag = tag("div", "id=top", [
  tag("span", ["class=default", "id=span1", "dataRef=>:0:0", "checked"], ["hello"]),
  " ",
  tag("em", [], "world"),
  "!",
  tag("br"),
  "and a new line..."
]);

const lemma = "test";
const word = "Testy"
// const htmlChain = new Html([
//   tag("em",[], "** Use "),
//   tag("strong", [], lemma),
//   tag("em", [], " instead of "),
//   tag("br"),
//   word,
// ]);

// const htmlChain = tag("root",[],[
//   tag("em",[], "** Use "),
//   tag("strong", [], lemma),
//   tag("em", [], " instead of "),
//   tag("br"),
//   word,
// ]);

// const htmlChain = root([
//   tag("em",[], "** Use "),
//   tag("strong", [], lemma),
//   tag("em", [], " instead of "),
//   tag("br"),
//   word,
// ]);

const htmlChain = root(
  tag("em", [], "** Use "),
  tag("strong", [], lemma),
  tag("em", [], " instead of "),
  [tag("hr"),
  tag("hr")],
  tag("br"),
  word,
);


console.log(">>", typeof htmlChain, Array.isArray(htmlChain), htmlChain.stringify())


// const db = makeGEPTdb().map(entry => new Entry(...entry));
// const tokens = text.map(el => new Token(...el));


// console.log(db)
// console.log(tokens)
// console.log("1st token =", db[tokens[0].matches[0]])

// console.log(htmlTag);
const body = document.body;
const para = document.createElement("p");
// para.innerHTML = htmlTag.stringify();
para.innerHTML = htmlChain.stringify();
body.prepend(para);
// console.log(htmlTag.stringify());


const tokenArr = [
  {
    "lemma": "",
    "type": "mc",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "(",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "marcus",
    "type": "wo",
    "matches": [
      -1
    ],
    "count": 0
  },
  {
    "lemma": ", ",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "marcus",
    "type": "wo",
    "matches": [
      -1
    ],
    "count": 1
  },
  {
    "lemma": ", ",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "Good",
    "type": "w",
    "matches": [
      3296
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "morning",
    "type": "w",
    "matches": [
      4772
    ],
    "count": 0
  },
  {
    "lemma": ", ",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "all",
    "type": "w",
    "matches": [
      235
    ],
    "count": 0
  },
  {
    "lemma": ". ",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "I",
    "type": "w",
    "matches": [
      3723
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "hope",
    "type": "w",
    "matches": [
      3643
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "you",
    "type": "w",
    "matches": [
      8375
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "still",
    "type": "w",
    "matches": [
      7119,
      7120,
      7121
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "remember",
    "type": "w",
    "matches": [
      6139
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "what",
    "type": "w",
    "matches": [
      8211
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "we",
    "type": "w",
    "matches": [
      8169
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "covered",
    "type": "wd",
    "matches": [
      1789
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "last",
    "type": "w",
    "matches": [
      4197,
      4198
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "week",
    "type": "w",
    "matches": [
      8189
    ],
    "count": 0
  },
  {
    "lemma": ". ",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "Well",
    "type": "w",
    "matches": [
      8201,
      8202
    ],
    "count": 0
  },
  {
    "lemma": ", ",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "the",
    "type": "w",
    "matches": [
      7524
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "key",
    "type": "w",
    "matches": [
      4121,
      4122
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "point",
    "type": "w",
    "matches": [
      5551,
      5552
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "was",
    "type": "wd",
    "matches": [
      659
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "that",
    "type": "w",
    "matches": [
      7521,
      7522,
      7523
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "a",
    "type": "w",
    "matches": [
      1
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "large",
    "type": "w",
    "matches": [
      4192
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "proportion",
    "type": "w",
    "matches": [
      5802
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "of",
    "type": "w",
    "matches": [
      5062
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "greenhouse",
    "type": "w",
    "matches": [
      3362
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "gases",
    "type": "wd",
    "matches": [
      3202
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "come",
    "type": "w",
    "matches": [
      1442
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "from",
    "type": "w",
    "matches": [
      3142
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "the",
    "type": "w",
    "matches": [
      7524
    ],
    "count": 1
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "food",
    "type": "w",
    "matches": [
      3039
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "we",
    "type": "w",
    "matches": [
      8169
    ],
    "count": 1
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "eat",
    "type": "w",
    "matches": [
      2447
    ],
    "count": 0
  },
  {
    "lemma": ". ",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "And",
    "type": "w",
    "matches": [
      306
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "of",
    "type": "w",
    "matches": [
      5062
    ],
    "count": 1
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "this",
    "type": "w",
    "matches": [
      7563,
      7564
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "food",
    "type": "w",
    "matches": [
      3039
    ],
    "count": 1
  },
  {
    "lemma": ", ",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "it",
    "type": "w",
    "matches": [
      4035
    ],
    "count": 0
  },
  {
    "lemma": "'s",
    "type": "c",
    "matches": [
      -2
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "red",
    "type": "w",
    "matches": [
      6051
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "meat",
    "type": "w",
    "matches": [
      4584
    ],
    "count": 0
  },
  {
    "lemma": " -- ",
    "type": "y",
    "matches": [
      -3
    ],
    "count": 0
  },
  {
    "lemma": "principally",
    "type": "w",
    "matches": [
      8738
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "beef",
    "type": "w",
    "matches": [
      683
    ],
    "count": 0
  },
  {
    "lemma": ", ",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "lamb",
    "type": "w",
    "matches": [
      4175
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "and",
    "type": "w",
    "matches": [
      306
    ],
    "count": 1
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "pork",
    "type": "w",
    "matches": [
      5589
    ],
    "count": 0
  },
  {
    "lemma": " -- ",
    "type": "y",
    "matches": [
      -3
    ],
    "count": 0
  },
  {
    "lemma": "that",
    "type": "w",
    "matches": [
      7521,
      7522,
      7523
    ],
    "count": 1
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "have",
    "type": "w",
    "matches": [
      3503,
      3504
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "the",
    "type": "w",
    "matches": [
      7524
    ],
    "count": 2
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "highest",
    "type": "wd",
    "matches": [
      3582
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "impact",
    "type": "w",
    "matches": [
      3768
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "on",
    "type": "w",
    "matches": [
      5085
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "our",
    "type": "w",
    "matches": [
      5164
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "global",
    "type": "w",
    "matches": [
      3273
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "climate",
    "type": "w",
    "matches": [
      1351
    ],
    "count": 0
  },
  {
    "lemma": ", ",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "much",
    "type": "w",
    "matches": [
      4820
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "more",
    "type": "w",
    "matches": [
      4770
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "than",
    "type": "w",
    "matches": [
      7517
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "vegetables",
    "type": "wd",
    "matches": [
      8002
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "or",
    "type": "w",
    "matches": [
      5126
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "even",
    "type": "w",
    "matches": [
      2683,
      2684
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "other",
    "type": "w",
    "matches": [
      5160
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "types",
    "type": "wd",
    "matches": [
      7856
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "of",
    "type": "w",
    "matches": [
      5062
    ],
    "count": 2
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "meat",
    "type": "w",
    "matches": [
      4584
    ],
    "count": 1
  },
  {
    "lemma": ". ",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "Clearly",
    "type": "wd",
    "matches": [
      1341
    ],
    "count": 0
  },
  {
    "lemma": ", ",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "the",
    "type": "w",
    "matches": [
      7524
    ],
    "count": 3
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "question",
    "type": "w",
    "matches": [
      5910
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "is",
    "type": "w",
    "matches": [
      4028
    ],
    "count": 0
  },
  {
    "lemma": ": ",
    "type": "**",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "how",
    "type": "w",
    "matches": [
      3681
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "can",
    "type": "w",
    "matches": [
      1060
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "consumers",
    "type": "wd",
    "matches": [
      1645
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "be",
    "type": "w",
    "matches": [
      659
    ],
    "count": 1
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "persuaded",
    "type": "wd",
    "matches": [
      5419
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "to",
    "type": "w",
    "matches": [
      7634
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "eat",
    "type": "w",
    "matches": [
      2447
    ],
    "count": 1
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "less",
    "type": "w",
    "matches": [
      4275
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "red",
    "type": "w",
    "matches": [
      6051
    ],
    "count": 1
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "meat",
    "type": "w",
    "matches": [
      4584
    ],
    "count": 2
  },
  {
    "lemma": "? ",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "In",
    "type": "w",
    "matches": [
      3794
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "today",
    "type": "w",
    "matches": [
      7640
    ],
    "count": 0
  },
  {
    "lemma": "'s",
    "type": "c",
    "matches": [
      -2
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "class",
    "type": "w",
    "matches": [
      1324,
      1325
    ],
    "count": 0
  },
  {
    "lemma": ", ",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "I",
    "type": "w",
    "matches": [
      3723
    ],
    "count": 1
  },
  {
    "lemma": "'ll",
    "type": "c",
    "matches": [
      -4
    ],
    "count": 1
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "talk",
    "type": "w",
    "matches": [
      7408
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "about",
    "type": "w",
    "matches": [
      19
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "a",
    "type": "w",
    "matches": [
      1
    ],
    "count": 1
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "recent",
    "type": "w",
    "matches": [
      6021
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "study",
    "type": "w",
    "matches": [
      7195
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "that",
    "type": "w",
    "matches": [
      7521,
      7522,
      7523
    ],
    "count": 2
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "addresses",
    "type": "wd",
    "matches": [
      115
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "one",
    "type": "w",
    "matches": [
      5087
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "method",
    "type": "w",
    "matches": [
      4640
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "of",
    "type": "w",
    "matches": [
      5062
    ],
    "count": 3
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "achieving",
    "type": "wd",
    "matches": [
      77
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "just",
    "type": "w",
    "matches": [
      4107
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "that",
    "type": "w",
    "matches": [
      7521,
      7522,
      7523
    ],
    "count": 3
  },
  {
    "lemma": ". ",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "",
    "type": "me",
    "matches": [],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "The",
    "type": "w",
    "matches": [
      7524
    ],
    "count": 4
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "researchers",
    "type": "wd",
    "matches": [
      6191
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "wanted",
    "type": "wd",
    "matches": [
      8133
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "to",
    "type": "w",
    "matches": [
      7634
    ],
    "count": 1
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "gauge",
    "type": "w",
    "matches": [
      3211
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "whether",
    "type": "w",
    "matches": [
      8224
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "labeling",
    "type": "wd",
    "matches": [
      4164
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "a",
    "type": "w",
    "matches": [
      1
    ],
    "count": 2
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "food",
    "type": "w",
    "matches": [
      3039
    ],
    "count": 2
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "as",
    "type": "w",
    "matches": [
      436,
      437,
      438
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "good",
    "type": "w",
    "matches": [
      3296
    ],
    "count": 1
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "or",
    "type": "w",
    "matches": [
      5126
    ],
    "count": 1
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "bad",
    "type": "w",
    "matches": [
      572
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "for",
    "type": "w",
    "matches": [
      3047,
      3048
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "the",
    "type": "w",
    "matches": [
      7524
    ],
    "count": 5
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "environment",
    "type": "w",
    "matches": [
      2618
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "could",
    "type": "w",
    "matches": [
      1761
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "influence",
    "type": "w",
    "matches": [
      3854
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "the",
    "type": "w",
    "matches": [
      7524
    ],
    "count": 6
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "way",
    "type": "w",
    "matches": [
      8166,
      8167
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "people",
    "type": "w",
    "matches": [
      5379
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "dine",
    "type": "w",
    "matches": [
      2183
    ],
    "count": 0
  },
  {
    "lemma": ". ",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "For",
    "type": "w",
    "matches": [
      3047,
      3048
    ],
    "count": 1
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "the",
    "type": "w",
    "matches": [
      7524
    ],
    "count": 7
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "study",
    "type": "w",
    "matches": [
      7195
    ],
    "count": 1
  },
  {
    "lemma": ", ",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "more",
    "type": "w",
    "matches": [
      4770
    ],
    "count": 1
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "than",
    "type": "w",
    "matches": [
      7517
    ],
    "count": 1
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "5,000",
    "type": "d",
    "matches": [
      -5
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "participants",
    "type": "wd",
    "matches": [
      5295
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "were",
    "type": "wd",
    "matches": [
      659
    ],
    "count": 2
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "shown",
    "type": "wd",
    "matches": [
      6683
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "a",
    "type": "w",
    "matches": [
      1
    ],
    "count": 3
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "fast",
    "type": "w",
    "matches": [
      2869
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "food",
    "type": "w",
    "matches": [
      3039
    ],
    "count": 3
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "menu",
    "type": "w",
    "matches": [
      4620
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "and",
    "type": "w",
    "matches": [
      306
    ],
    "count": 2
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "then",
    "type": "w",
    "matches": [
      7533
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "asked",
    "type": "wd",
    "matches": [
      447
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "to",
    "type": "w",
    "matches": [
      7634
    ],
    "count": 2
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "choose",
    "type": "w",
    "matches": [
      1277
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "one",
    "type": "w",
    "matches": [
      5087
    ],
    "count": 1
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "item",
    "type": "w",
    "matches": [
      4037
    ],
    "count": 0
  },
  {
    "lemma": ". ",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "The",
    "type": "w",
    "matches": [
      7524
    ],
    "count": 8
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "first",
    "type": "w",
    "matches": [
      2959
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "group",
    "type": "w",
    "matches": [
      3382
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "received",
    "type": "wd",
    "matches": [
      6019
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "a",
    "type": "w",
    "matches": [
      2,
      1
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "menu",
    "type": "w",
    "matches": [
      4620
    ],
    "count": 1
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "which",
    "type": "w",
    "matches": [
      8225
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "labeled",
    "type": "wd",
    "matches": [
      4164
    ],
    "count": 1
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "red",
    "type": "w",
    "matches": [
      6051
    ],
    "count": 2
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "meat",
    "type": "w",
    "matches": [
      4584
    ],
    "count": 3
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "items",
    "type": "wd",
    "matches": [
      4037
    ],
    "count": 1
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "as",
    "type": "w",
    "matches": [
      436,
      437,
      438
    ],
    "count": 1
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "having",
    "type": "wd",
    "matches": [
      3503
    ],
    "count": 1
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "a",
    "type": "w",
    "matches": [
      1
    ],
    "count": 5
  },
  {
    "lemma": " \"",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "high",
    "type": "w",
    "matches": [
      3582
    ],
    "count": 1
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "climate",
    "type": "w",
    "matches": [
      1351
    ],
    "count": 1
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "impact",
    "type": "w",
    "matches": [
      3768
    ],
    "count": 1
  },
  {
    "lemma": ". \" ",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "The",
    "type": "w",
    "matches": [
      7524
    ],
    "count": 9
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "second",
    "type": "w",
    "matches": [
      6519,
      6520
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "group",
    "type": "w",
    "matches": [
      3382
    ],
    "count": 1
  },
  {
    "lemma": "'s",
    "type": "c",
    "matches": [
      -2
    ],
    "count": 1
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "menu",
    "type": "w",
    "matches": [
      4620
    ],
    "count": 2
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "highlighted",
    "type": "wd",
    "matches": [
      3583
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "items",
    "type": "wd",
    "matches": [
      4037
    ],
    "count": 2
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "that",
    "type": "w",
    "matches": [
      7521,
      7522,
      7523
    ],
    "count": 4
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "had",
    "type": "wd",
    "matches": [
      3503
    ],
    "count": 2
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "a",
    "type": "w",
    "matches": [
      1
    ],
    "count": 6
  },
  {
    "lemma": " \"",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "low",
    "type": "w",
    "matches": [
      4427
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "climate",
    "type": "w",
    "matches": [
      1351
    ],
    "count": 2
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "impact",
    "type": "w",
    "matches": [
      3768
    ],
    "count": 2
  },
  {
    "lemma": ", \" ",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "such",
    "type": "w",
    "matches": [
      7245
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "as",
    "type": "w",
    "matches": [
      436,
      437,
      438
    ],
    "count": 2
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "chicken",
    "type": "w",
    "matches": [
      1252
    ],
    "count": 0
  },
  {
    "lemma": ", ",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "fish",
    "type": "w",
    "matches": [
      2962
    ],
    "count": 0
  },
  {
    "lemma": ", ",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "and",
    "type": "w",
    "matches": [
      306
    ],
    "count": 3
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "vegetarian",
    "type": "w",
    "matches": [
      8003
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "options",
    "type": "wd",
    "matches": [
      5124
    ],
    "count": 0
  },
  {
    "lemma": ". ",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "The",
    "type": "w",
    "matches": [
      7524
    ],
    "count": 10
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "menu",
    "type": "w",
    "matches": [
      4620
    ],
    "count": 3
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "for",
    "type": "w",
    "matches": [
      3047,
      3048
    ],
    "count": 2
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "the",
    "type": "w",
    "matches": [
      7524
    ],
    "count": 11
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "third",
    "type": "w",
    "matches": [
      7558
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "group",
    "type": "w",
    "matches": [
      3382
    ],
    "count": 2
  },
  {
    "lemma": ", ",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "which",
    "type": "w",
    "matches": [
      8225
    ],
    "count": 1
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "was",
    "type": "wd",
    "matches": [
      659
    ],
    "count": 3
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "the",
    "type": "w",
    "matches": [
      7524
    ],
    "count": 12
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "control",
    "type": "w",
    "matches": [
      1687
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "group",
    "type": "w",
    "matches": [
      3382
    ],
    "count": 3
  },
  {
    "lemma": ", ",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "had",
    "type": "wd",
    "matches": [
      3503
    ],
    "count": 3
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "no",
    "type": "w",
    "matches": [
      4952
    ],
    "count": 0
  },
  {
    "lemma": " ",
    "type": "s",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "labels",
    "type": "wd",
    "matches": [
      4164
    ],
    "count": 2
  },
  {
    "lemma": ". ",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "marcus",
    "type": "wo",
    "matches": [
      -1
    ],
    "count": 2
  },
  {
    "lemma": ". ",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "marcus",
    "type": "wo",
    "matches": [
      -1
    ],
    "count": 3
  },
  {
    "lemma": ". ",
    "type": "p",
    "matches": [],
    "count": 0
  },
  {
    "lemma": "Marcus",
    "type": "wo",
    "matches": [
      -1
    ],
    "count": 4
  },
  {
    "lemma": "!\")",
    "type": "p",
    "matches": [],
    "count": 0
  }
];


function textLookupCompounds(tokenArr) {
  const len = Object.keys(tokenArr).length;
  for (let i = 0; i < len; i++) {
    const token = tokenArr[i];
    if (token.type.startsWith("w")) {
      let j = i;
      let wordBlob = "";
      while (j < len && !(tokenArr[j].type.startsWith("p") || tokenArr[j].type === "me")) {
        const tmpToken = tokenArr[j];
        if (tmpToken.type.startsWith("w")) wordBlob += tmpToken.lemma;
        j++;
      }
      wordBlob = wordBlob.toLowerCase();
      // for (const word in V.currentDb.compounds) {
      //   if (wordBlob.startsWith(word)) {
      //     token.matches.push(V.currentDb.compounds[word]);
      //     break;
      //   }
      // }
      console.log(i, token.lemma, wordBlob)
    }
  }
  return tokenArr;
}

textLookupCompounds(tokenArr);