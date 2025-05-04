"use strict";

//const canvas = document.getElementById("hanoi");

class Towers{
  min = 1;
  max;
  towers = [];
  constructor(disks){
    this.update(disks);
  }

  update(disks) {
    if (disks) {
      const disksInvalid = this.checkTowers(disks);
      if (disksInvalid) {
        throw new ValidationError(disksInvalid);
      }
      else {
        this.updateAll(disks);
      }
    }
    else {
      console.log("Using default set of plates.")
      this.max = 5;
      // this.towers = [new Stack([1, 2, 3, 4, 5]), new Stack(), new Stack()];
      this.updateAll([[1, 2, 3, 4, 5], [], []]);
    }
  }

  updateAll(threeTowers) {
    for (let i in threeTowers) {
      this.towers[parseInt(i)] = new Stack(threeTowers[i]);
      console.log(`Adding tower ${i} with ${threeTowers[i]} -> ${this.towers[i].show()}`);
    }
  }

  move(item, targetIndex) {
    const move = this.isValidMove(item, targetIndex);
    if (move.isOK) {
      this.towers[move.value].pop();
      this.towers[targetIndex].push(item);
    }
    else throw new ValidationError("illegal move!");
  }

  isValidMove(item, targetIndex){
    let result = {isOK: false, value: -1};
    const maxLength = this.max;
    const sourceTowerId = this.findLive(item);
    const itemIsAvailable = sourceTowerId > -1;
    const targetTowerLen = this.towers[targetIndex].length;
    const targetTowerHasRoom = targetTowerLen === 0 || targetTowerLen < maxLength;
    const targetHead = this.towers[targetIndex].peek();
    const targetCanAccept = targetTowerLen === 0 || targetHead > item;
    // console.log("VALID?", item, {itemIsAvailable}, {targetTowerLen}, {targetTowerHasRoom}, {targetHead}, {targetCanAccept}, {maxLength});
    if (itemIsAvailable && targetTowerHasRoom && targetCanAccept) {
      result.isOK = true;
      result.value = sourceTowerId;
    }
    return result;
  }

  findLive(item) {
    // returns index of tower if first element is 'item', else -1
    let result = -1;
    for (let i in this.towers) {
      if (this.towers[i].peek() === item) result = i;
    }
    return result;
  }

  findAny(item) {
    let result = [];
    for (let i in this.towers) {
      const pos = this.towers[i].find(item);
      if (pos > -1) {
        result = [i, pos];
        break;
      }
    }
    return result;
  }

  show() {
    // const TOP = String.fromCharCode(9573);
    // const BTM = String.fromCharCode(9576);
    // const VRT = String.fromCharCode(9553);
    const TOP = "_";
    const BTM = "^";
    const VRT = "|";
    for (let i=0; i < this.max; i++) {
      let lineNo = this.max - i;
      let displayStr = "";
      for (let tower of this.towers){

        displayStr += (tower.length >= lineNo) ? tower.valueAt(tower.length - lineNo) : VRT;
        displayStr += "\t";
      }
      console.log(displayStr)
    }
    // console.log(`\n${BTM}\t${BTM}\t${BTM}\t`);
    console.log("=========");
    console.log("A\tB\tC");
  }

  checkTowers(disks) {
    let result = "";
    if (disks.length !== 3) result = "Only 3 towers allowed";
    else {
      for (let i in disks) {
        result = this.assertTowerValid(disks[i]);
        if (result) break;
      }
      if (!result){
        let norm = disks.flat(Infinity).sort();
        this.max = Math.max(...norm);
        let range = [];
        for (let i=1; i < this.max + 1; i++) range.push(i);
        if (JSON.stringify(norm) !== JSON.stringify(range)) result = "There are plates missing in the total sequence.";
      }
    }
    return result;

  }
  assertTowerValid(arr) {
    for (let i in arr) {
      if (arr[i] === 0) return "Plates must have integer values greater than 0.";
      if (i > 0 && arr[i] - 1 !== arr[i-1]) return "Plates must be in ascending order.";
    }
    return "";
  }



}


class Stack {
  contents;
  constructor(contents) {
    if (!contents) contents = [];
    if (Array.isArray(contents)) this.contents = contents;
    else throw new Error("Must initialize with an array.");
  }
  push(item) {
    return this.contents.unshift(item);
  }
  pop() {
    return this.contents.shift();
  }

  peek() {
    // console.warn(this.contents)
    return this.contents[0] ?? null;
  }

  find(item) {
    const result = this.contents.indexOf(item);
    console.log("stack find:", result);
    return result;
  }

  show() {
    const displayStr = (this.contents.length) ? `${this.peek()}[,${this.contents.slice(1)}]` : "[]";
    return displayStr;
  }

  valueAt(i) {
    return this.contents[i];
  }

  get length() {
    return this.contents.length;
  }
}


class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}



// let x = new Stack([1,2,3,4]);
// x.show();
// x.push(3);
// x.show();
// x.pop();
// x.show();
// x.find(3);

let y = new Towers();
// let y = new Towers([[1,2],[],[3,4,5]]);
// let y = new Towers([[1,2],[],[3,4,5,6]]);  // valid
// let y = new Towers([[1,2],[3,4,5]]);  // too few towers
// let y = new Towers([[], [1,2],[], [3,4,5]]);  // too manny towers
// let y = new Towers([[1,2],[0],[3,4,5]]);  // starts from 0
// let y = new Towers([[1,2],[],[5,4,3]]);  // incorrect order
// let y = new Towers([[1,2],[],[4,5]]); // number missing
y.show();
console.assert(y.isValidMove(2,1).isOK);
console.assert(y.isValidMove(3,0).isOK);
console.assert(y.isValidMove(3,1).isOK);
// y.move(3,1);
y.move(1,2);
y.show();