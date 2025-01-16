
class Entry {
  static currID = 0;
  constructor(lemma, pos, levelArr, notes, id) {
    if (id !== undefined) this._id = id;
    else {
      this._id = Entry.currID;
      Entry.incrementID();
    }
    this._lemma = lemma;
    this._pos = pos;
    this._levelArr = levelArr;
    this._notes = notes;
    // this._compound =
  }

  get id() { return this._id }
  get lemma() { return this._lemma }
  get pos() { return this._pos }

  get posExpansion() {
  const pos_str = this._pos;
  if (this._id < 0) return pos_str;
  return (pos_str) ? pos_str.split("").map(el => LOOKUP.pos_expansions[el]).join(", ") : "";
  }

  get levelArr() { return this._levelArr }
  get levelGEPT() { return this._levelArr[0] }
  get levelAWL() { return this._levelArr[1] - C.awl_level_offset }

  get levelAWLraw() { return this._levelArr[1]}
  get levelStatus() { return this._levelArr[1] }

  get notes() {
    let note = this._notes[0];
    if (this._notes[1]) note += `; ${this._notes[1]}`;
    return [note, this._notes[2]];
  }

  // resetIDs() {Entry.resetID()}

  static incrementID() { Entry.currID++ }
  static resetID() {Entry.currID = 0}
}



class Token {
  constructor(lemma, type, matches = [], count = 0) {
    this.lemma = lemma;
    this.type = type;
    this.matches = matches;
    this.count = count;
  }
}


function tag(name, attrs = [], content = []) {
  return new Tag(name, attrs, content);
}

function root(content=[]) {
  // ** GUARD#1 accept Tags/strings/numbers as single array OR as individual arguments
  if (arguments.length === 1) {
    const firstArg = arguments[0];
    // if (typeof firstArg !== "object" || firstArg instanceof Tag) content = [firstArg];
    // else content = firstArg;
    if (Array.isArray(firstArg)) content = firstArg;
    else content = [firstArg];
  }
  else if (arguments.length > 1) content = [...arguments];
  // ** GUARD#2 resolve any mistakenly included arrays
  content = content.reduce((acc,el) => {
    (Array.isArray(el)) ? acc.push(...el.flat(Infinity)) : acc.push(el);
    return acc;
  }, []);

  return new Tag("root", [], content);
}

// function attr(name, value) {
//   return new Attr(name, value);
// }


class Tag {
  constructor(name, attrs = [], content = []) {
    if (typeof content === "string") content = [content];
    this.isEmpty = !attrs.length && !content.length;
    this.name = name;
    if (typeof attrs === "string") attrs = [attrs];
    this.attrs = attrs.map(el => {
      let tmp = el.split("=");
      return (tmp.length === 1) ? [tmp] : [tmp[0], this.escapeHTML(tmp[1])];
    });
    this.content = content.map(el => (typeof el === "string") ? this.escapeHTML(el) : el);
  }

  escapeHTML(text) {
    if (!text) return "";
    return text.replace(/[<>&"]/g, char => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': " &quot;" }[char]));
  }

  stringify() {
    if (!this.name) return "";
    if (this.isEmpty) return `<${this.name} />`;
    let tmpContent = "";
    for (let el of this.content) {
      if (!el) continue;
      if (typeof el === "number") el = el.toString();
      // tmpContent += (typeof el === "string") ? escapeHTML(el) : el.stringify();
      tmpContent += (typeof el === "string") ? el : el.stringify();
    }
    // ** <root> is used to render a chain of html/text tags; it is not itself rendered
    if (this.name === "root") return [tmpContent];
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