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
  constructor(lemma, type, matches=[], count=0) {
    this.lemma = lemma;
    this.type = type;
    this.matches = matches;
    this.count = count;
  }
}


function escapeHTML(text) {
  if (!text) return "";
  // console.log("escape:", typeof text, text)
  return text.replace(/[<>&"]/g, char => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"':" &quot;"}[char]));
}

function tag(name, attrs=[], content=[]){
  return new Tag(name, attrs, content);
}

function root(content){
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
  content = content.reduce((acc,el) => {
    (Array.isArray(el)) ? acc.push(...el.flat(Infinity)) : acc.push(el);
    return acc;
  }, []);
  return new Tag("root", [], content);
}

function attr(name, value){
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
  constructor(name, attrs=[], content=[]) {
    if (typeof content === "string") content = [content];
    this.isEmpty = !attrs.length && !content.length;
    this.name = name;
    if (typeof attrs === "string") attrs = [attrs];
    this.attrs = attrs.map(el => {
      let tmp = el.split("=");
      return (tmp.length === 1) ? [tmp] : [tmp[0],escapeHTML(tmp[1])];
    });
    // this.content = (typeof content === "string") ? [content] : content;
    this.content = content.map(el => (typeof el === "string") ? escapeHTML(el) : el);
  }
  stringify() {
    if (this.isEmpty) return `<${this.name} />`;
    let tmpContent = "";
    for (let el of this.content){
      if (typeof el === "number" ) el = el.toString();
      // tmpContent += (typeof el === "string") ? escapeHTML(el) : el.stringify();
      tmpContent += (typeof el === "string") ? el : el.stringify();
    }
    // ** <root> is used to render a chain of html/text tags; it is not itself rendered
    if (this.name === "root") return tmpContent;
    let tmpAttrs = "";
    if (this.attrs.length){
      tmpAttrs = this.attrs.map(
        el => (el.length === 1)
        ? ` ${el}`
        : ` ${el[0]}="${el[1]}"`
      ).join("");
    }
    return `<${this.name}${tmpAttrs}>${tmpContent}</${this.name}>`;
  }
}






const htmlTag = tag("div", "id=top",[
    tag("span",["class=default", "id=span1", "dataRef=>:0:0", "checked"],[ "hello" ]),
    " ",
    tag("em", [],"world"),
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
  tag("em",[], "** Use "),
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



