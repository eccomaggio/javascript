
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
  return new Tag("root", [], content);
}

function attr(name, value){
  return new Attr(name, value);
}


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