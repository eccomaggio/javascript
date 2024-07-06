"use strict";

function makeGEPTdb() {
  return [["", null, [0, -1, 2], "dummy entry: 0 easily confused with undefined|"], ["a", "a", [0, -1, 2], "\u4e00(\u500b); \u5f8c\u63a5\u6bcd\u97f3\u958b\u982d\u4e4b\u5b57\u6642\u70ba an"], ["A.M.", "b", [0, -1, 2], "\u4e0a\u5348; = a.m.= AM"], ["abandon", "v", [1, 45, 3], "\u62cb\u68c4\u3001\u6368\u68c4\u3001\u4e2d\u6b62; ; |abandon"], ["abandon", "n", [1, 45, 3], "\u76e1\u60c5\u3001\u653e\u7e31; ; \u62cb\u68c4\u3001\u6368\u68c4\u3001\u4e2d\u6b62; ; |abandon"], ["abbey", "n", [2, -1, 2], "\u5927\u4fee\u9053\u9662; "], ["abbreviate", "v", [2, -1, 2], "\u7e2e\u5beb\u3001\u4f7f\u7c21\u77ed; "], ["abbreviation", "n", [2, -1, 2], "\u7e2e\u5beb\u3001\u7c21\u7a31; "], ["abdomen", "n", [2, -1, 2], "\u8179\u90e8; "], ["abide", "v", [2, -1, 2], "\u5bb9\u5fcd\u3001\u9075\u5b88; "], ["ability", "n", [0, -1, 2], "\u80fd\u529b\u3001\u624d\u80fd; "], ["able", "j", [0, -1, 2], "\u80fd\u5920\u7684\u3001\u6709\u624d\u80fd\u7684; "], ["abstract", "jn", [1, 43, 3], "\u62bd\u8c61\u7684; ; |abstract"], ["abstract", "n", [1, 43, 3], "\u6458\u8981; ; \u62bd\u8c61\u7684; ; |abstract"],]
}

const tokens = [
  ["average", "w", [539], 4],
  ["!", "p", [], 0]
];

class Entry {
    static currID = 0;
  constructor(id, lemma, pos, levelArr, notes) {
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
  constructor(lemma, type, matches=[], count=0) {
    this.lemma = lemma;
    this.type = type;
    this.matches = matches;
    this.count = count;
  }
}

class Attr {
  constructor(name, value) {
    this.name = name;
    if (typeof value === "object") value = value.join(" ");
    this.value = value;
  }
  str() {
    const out = `${this.name}="${escapeHTML(this.value)}"`;
    return out;
  }
}

class Tag {
  constructor(name, attrs=[], content=[]) {
    this.name = name;
    this.attrs = attrs;
    if (typeof content === "string") content = [content];
    this.content = content;
  }
  str() {
    let tmpAttrs = "";
    for (const attr of this.attrs){
      tmpAttrs += ` ${attr.str()}`;
    }
    let tmpContent = "";
    for (const el of this.content){
      if (typeof el === "string") tmpContent += escapeHTML(el);
      else tmpContent += el.str();
    }
    const out = `<${this.name}${tmpAttrs}>${tmpContent}</${this.name}>`;
    return out;
  }
}

// function escapeHTML_VERBOSE(text) {
//   if (!text) return;
//   const replacements = {
//     "<": "&lt;",
//     ">": "&gt;",
//     "&": "&amp;",
//     '"':" &quot;"};

//   function replacer(match) {
//     return replacements[match];
//   }

//   const replacement = text.replace(/[<>&"]/g, replacer);
//   return replacement;
// }

// function escapeHTML_LESSVERBOSE(text) {
//   const replacements = { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"':" &quot;"};
//   return text.replace(/[<>&"]/g, function (character) {
//     return replacements[character];
//   });
// }



function escapeHTML(text) {
  return text.replace(/[<>&"]/g, char => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"':" &quot;"}[char]));
}

function tag(name, attrs=[], content=[]){
  return new Tag(name, attrs, content);
}

function attr(name, value){
  return new Attr(name, value);
}




const dict = makeGEPTdb().map((el, i) => new Entry(i, ...el));
const tokenArr = tokens.map(token => new Token(...token));

console.log(dict)
console.log(dict[13], dict[13].lemma);
console.log(tokenArr, tokenArr[0].matches);

console.log(tag("em", [attr("blah", "blahdy blah")],["world"]).str())


const html = tag("div",
  [
    attr("id", "top"),
  ],[
    tag("span",[
      attr("class", "default"),
      attr("id", "span1"),
      attr("dataRef", ">:0:0"),
    ], ["hello!"]),
    tag("em", [],[" world"]),
  ]);


// const body = document.getElementsByTagName("body")[0];
const body = document.body;
const para = document.createElement("p");
para.innerHTML = html.str();
body.prepend(para);
console.log(html.str());
console.log(escapeHTML(html.str()))



