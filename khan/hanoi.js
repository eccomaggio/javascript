"use strict";

//const canvas = document.getElementById("hanoi");

class Towers {
  min = 1;
  max;
  towers = [];

  movesLog = [];
  constructor(disks) {
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
    for (let i=0;i<threeTowers.length;i++) {
      this.towers[i] = new Stack(threeTowers[i]);
      // console.log(`Adding tower ${i} with ${threeTowers[i]} -> ${this.towers[i].show()}`);
    }
  }


  effectMove(move) {
    // console.log("#########", move)
    // const towerToPop = this.findAny(move.item)[0];
    // this.towers[towerToPop].pop();
    // this.towers[move.tower].push(move.item);
    this.towers[move[0]].pop();
    this.towers[move[1].tower].push(move[1].item);
  }

  solve() {
    // let movesLog = [];
    // let move; // [item, targetTower index]
    // let repeatLoop = 0;
    const x_bold = "font-weight:bold;";
    const x_normal = "font-weight:normal";
    const x_cred = "color: red;";
    const x_cauto = "color: auto;";
    const x_cblack = "color: black;";
    const x_on = x_bold + x_cred;
    const x_off = x_normal + x_cauto;

    let result, move;
    let prevItemWasHigh = true; // as 1 is always the first piece that can move
    console.log("\nInitial state:");
    this.showHorizontal();
    console.log("possible solution...");
    do {
      const possibleMoves = this.getLegalMoves();
      [move, prevItemWasHigh] = this.selectMove(possibleMoves, this.movesLog, prevItemWasHigh);
      // console.log(`Move ${this.movesLog.length + 1}: %c${move.item}%c to tower ${move.tower}`, x_on, x_off);
      this.effectMove(move);
      this.movesLog.push(move);
      result = this.checkSolution([[], [1, 2, 3, 4, 5], []]);

      console.log(`move ${this.movesLog.length}: (${move[1].item}: ${move[0]}->${move[1].tower})`);
      console.log(this.showPossMoves(possibleMoves), prevItemWasHigh);
      this.showHorizontal();
      console.log(" ");

    } while (this.movesLog.length < 20 || result.isOK);
    console.log(this.movesLog.length, result);
  }


  selectMove(possibleMoves, pastMoves, prevItemWasHigh) {
    const prevMovedItem = pastMoves.slice(-1).item ?? -1;
    const maxIsInPlace = this.towers[1].find(this.max) > -1;
    for (let label of Object.keys(possibleMoves)) {
      if (possibleMoves[label].homeTower > -1) {
        let tmp = [];
        // * drop specific move possibilities
        for (let move of possibleMoves[label].moves) {
          if (move.item === prevMovedItem) continue;  // move a different plate each time
          if (move.item === this.max && maxIsInPlace) continue; // makes sure 5 stays on tower 2 once it is there
          tmp.push(move);
        }
        possibleMoves[label].moves = tmp;
      }
    }
    let move = this.algorithm1(possibleMoves, prevItemWasHigh);
    return [move, !prevItemWasHigh];
  }

  algorithm1(possibleMoves, prevItemWasHigh) {
    let move;
    // const h = possibleMoves.highest;
    // const l = possibleMoves.lowest;
    // const f = possibleMoves.fallback;
    let selected;
    if (prevItemWasHigh) {
      // if (possibleMoves.highest.moves.length) move = possibleMoves.highest.moves.slice(-1);
      if (possibleMoves.highest) selected = possibleMoves.highest;
      // else if (possibleMoves.lowest.moves.length) move = possibleMoves.lowest.moves.slice(-1);
      else if (possibleMoves.lowest) selected = possibleMoves.lowest;
      else selected = possibleMoves.fallback;
    }
    else {
      // if (possibleMoves.lowest.moves.length) move = possibleMoves.lowest.moves.slice(-1);
      // else if (possibleMoves.highest.moves.length) move = possibleMoves.highest.moves.slice(-1);
      if (possibleMoves.lowest) selected = possibleMoves.lowest;
      else if (possibleMoves.highest) selected = possibleMoves.highest;
      else selected = possibleMoves.fallback;
    }
    move = [selected.homeTower, ...selected.moves.slice(-1)];
    return move;
  }

  algorithm2(possibleMoves, prevItemWasHigh) {
    let move;
    if (prevItemWasHigh) {
      if (possibleMoves.highest.moves.length) move = possibleMoves.highest.moves.slice(-1);
      else if (possibleMoves.lowest.moves.length) move = possibleMoves.lowest.moves.slice(-1);
      else move = possibleMoves.fallback.slice(-1);
    }
    else {
      if (possibleMoves.lowest.moves.length) move = possibleMoves.lowest.moves.slice(-1);
      else if (possibleMoves.highest.moves.length) move = possibleMoves.highest.moves.slice(-1);
      else move = possibleMoves.fallback.moves.slice(-1);
    }
    return move;
  }
/*
change logic:
    1) get all possible moves
  2) drop illegal ones
  3) drop prev moved item
  4) sort into high/low/fallback

  */

  // getHighestLowest() {
  //   // logic: highest is highest number unless only one choice and it is 1 (i.e. first move)
  //   // if only one choice, empty slot is assigned null
  //   let highest, lowest, fallback;
  //   const liveItems = this.allLiveItems();
  //   console.log(">>live items:", liveItems.length, liveItems)
  //   const liveItemsCount = liveItems.length;
  //   if (liveItems[0].item === 1) [highest, lowest, fallback] = [null, ...liveItems, null];
  //   // * 1 is always considered low, even if it is the only option
  //   else if (liveItemsCount === 3) [highest, fallback, lowest] = liveItems;
  //   else if (liveItemsCount === 2) [highest, lowest, fallback] = [...liveItems, null];
  //   else [highest, lowest, fallback] = [...liveItems, null, null];
  //   const results = [highest, lowest, fallback];
  //   // console.log("RAW highest/lowest", results);
  //   return results;
  // }


  getLegalMoves() {
    let liveItems = this.allLiveItems();
    const lastMovedItem = this.movesLog.slice(-1)[0]?.item;
    let unsortedPossMoves = {};
    for (let live of liveItems) {
      if (live.item === lastMovedItem) {
        console.log("**** Just dropped:", live.item)
        continue;
      }
      // const availableTowers = this.getAvailableTowers(live) ;
      const moves = this.getAvailableTowers(live).map(tower => new Address(live.item, tower));
      const homeTower = live.tower;
      const content = {
        homeTower: homeTower,
        item: live.item,
        moves: moves
      }
      unsortedPossMoves[live.item] = content;
    }

    // *Now sort into highest/lowest/fallback: copy object and assign 'highest' etc.
    const availableItems = Object.keys(unsortedPossMoves).sort();
    const availableItemsCount = availableItems.length;
    // console.log("gavailable items:", availableItems);
    let labels;
    if (availableItemsCount === 1) {
      if (availableItems[0] == 1) labels = ["lowest"];
      else labels = ["highest"];
    }
    else if (availableItemsCount === 2) labels = ["lowest", "highest"];
    else labels = ["lowest", "highest", "fallback"];
    let possibleMoves = {};
    for (let i=0;i<availableItems.length;i++) {
      possibleMoves[labels[i]] = unsortedPossMoves[availableItems[i]];
    }
    return possibleMoves;
  }

  showPossMoves(possMoves) {
    // console.log(">>", possMoves, Object.keys(possMoves))
    let result = [];
    for (let label of Object.keys(possMoves)) {
      const labelSet = possMoves[label];
      // console.log("???", label, label[0], labelSet, labelSet.homeTower, labelSet.moves)
      let line = `${label}=`;
      if (labelSet.homeTower > -1) {
        for (let move of labelSet.moves){
          line += "" + move.show();
        }
      }
      else line += "Ø";
      result.push(line);
    }
    return result.join(", ");
  }

  getAvailableTowers({tower: itemTower, item}) {
    let results = [];
    for (let i=0; i < this.towers.length; i++) {
      const currTower = this.towers[i];
      // console.log(".... tower:", i, currTower.show(), itemTower === i ? `${currTower.peek()}->`: (currTower.isEmpty || currTower.peek() > item));
      if (itemTower === i) continue;
      if (currTower.isEmpty || currTower.peek() > item) results.push(i);
    }
    // console.log("RAW available towers:", itemTower, item, results);
    return results;
  }

  allLiveItems() {
    let results = [];
    for (let i=0; i<this.towers.length; i++) {
      const head = this.towers[i].peek();
      if (head) results.push(new Address(head, i));
    }
    if (results.length > 1) results.sort((a, b) => b.item - a.item);
    // console.log("RAW live items", results)
    return results;
  }

  isValidMove(move) {
    // checks move and returns source tower of item if valid
    let result = { isOK: false, value: -1 };
    const maxLength = this.max;
    const sourceTowerId = this.findLive(move.item);
    const itemIsAvailable = sourceTowerId > -1;
    // console.log("!!", move, this.towers)
    const targetTowerLen = this.towers[move.tower].length;
    const targetTowerHasRoom = targetTowerLen === 0 || targetTowerLen < maxLength;
    const targetHead = this.towers[move.tower].peek();
    const targetCanAccept = targetTowerLen === 0 || targetHead > move.item;
    // console.log("VALID?", item, {itemIsAvailable}, {targetTowerLen}, {targetTowerHasRoom}, {targetHead}, {targetCanAccept}, {maxLength});
    if (itemIsAvailable && targetTowerHasRoom && targetCanAccept) {
      result.isOK = true;
      result.value = sourceTowerId;
    }
    return result;
  }

  findLive(item) {
    // returns index of tower if first element is 'item', else -1 (i.e. if it can be moved)
    let result = -1;
    for (let i=0; i<this.towers.length; i++) {
      if (this.towers[i].peek() === item) result = i;
    }
    return result;
  }

  findAny(item) {
    // returns index of tower & pos of el in stack for any element; empty arr if not found
    let result = [];
    for (let i=0; i<this.towers.length; i++) {
      const pos = this.towers[i].find(item);
      if (pos > -1) {
        result = [i, pos];
        break;
      }
    }
    return result;
  }

  checkSolution(solution) {
    // checks against solution presented as array of three arrays representing each stack
    let result = { isOK: false, value: [] };
    // for (let i in this.towers) {
    for (let i=0; i<this.towers.length; i++) {
      const isSame = JSON.stringify(this.towers[i].dump) === JSON.stringify(solution[i]);
      // console.log(`tower ${i}: [${this.towers[i].dump}] == [${solution[i]}] is ${isSame}`);
      result.value.push(isSame);
    }
    result.isOK = result.value.every(n => n);
    // console.log("solution is:", result);
    return result;
  }

  show() {
    // const TOP = String.fromCharCode(9573);
    // const BTM = String.fromCharCode(9576);
    // const VRT = String.fromCharCode(9553);
    const TOP = "_";
    const BTM = "^";
    const VRT = "|";
    for (let i = 0; i < this.max; i++) {
      let lineNo = this.max - i;
      let displayStr = "";
      for (let tower of this.towers) {

        displayStr += (tower.length >= lineNo) ? tower.valueAt(tower.length - lineNo) : VRT;
        displayStr += "\t";
      }
      console.log(displayStr)
    }
    // console.log(`\n${BTM}\t${BTM}\t${BTM}\t`);
    console.log("=========");
    console.log("A\tB\tC");
  }

  showHorizontal() {
    for (let i=0; i < 3; i++) {
      // console.log(`\t${i}: ${this.towers[i].show()}`)
      // console.log(`\t${i}: ${this.towers[i].dump}`)
      console.log(`\t${i}: ${this.towers[i].showReverse()}`)
    }
  }

  checkTowers(disks) {
    let result = "";
    if (disks.length !== 3) result = "Only 3 towers allowed";
    else {
      // for (let i in disks) {
      for (let i=0; i<this.disks.length; i++) {
        result = this.assertTowerValid(disks[i]);
        if (result) break;
      }
      if (!result) {
        let norm = disks.flat(Infinity).sort();
        this.max = Math.max(...norm);
        let range = [];
        for (let i = 1; i < this.max + 1; i++) range.push(i);
        if (JSON.stringify(norm) !== JSON.stringify(range)) result = "There are plates missing in the total sequence.";
      }
    }
    return result;

  }


  assertTowerValid(arr) {
    // for (let i in arr) {
    for (let i=0; i < arr.length; i++) {
      if (arr[i] === 0) return "Plates must have integer values greater than 0.";
      if (i > 0 && arr[i] - 1 !== arr[i - 1]) return "Plates must be in ascending order.";
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
    return this.contents[0] ?? null;
  }

  find(item) {
    const result = this.contents.indexOf(item);
    // console.log("stack find:", result);
    return result;
  }

  show() {
    const displayStr = (this.contents.length) ? `${this.peek()},[${this.contents.slice(1)}]` : "[]";
    return displayStr;
  }

  showReverse() {
    let displayStr = "";
    if (this.contents.length === 1) displayStr = this.peek();
    else if (this.contents.length > 1) displayStr = `[${this.contents.slice(1).reverse()},]${this.peek()}`;
    return displayStr;
  }

  valueAt(i) {
    return this.contents[i];
  }

  get isEmpty() {
    return this.contents.length === 0;
  }

  get length() {
    return this.contents.length;
  }

  get dump() {
    return this.contents;
  }
}

class Address {
  constructor(item, tower) {
    // if ((target < 1) || (destination < 0 || target > 2)) {
    //   throw new ValidationError(`Move out of bounds. ${target}, ${destination}`)
    // }
    // Removed validation as this happens in Towers
    this.coords = { item: item, tower: tower };
  }
  get item() {
    return this.coords.item;
  }

  get tower() {
    return this.coords.tower;
  }

  show() {
    return `[${this.item}, ${this.tower}]`;
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
// y.show();
// console.assert(y.isValidMove(new Address(2, 1)).isOK);
// console.assert(y.isValidMove(new Address(3, 0)).isOK);
// console.assert(y.isValidMove(new Address(3, 1)).isOK);
// y.move(3,1);
// y.effectMove(1, 2);
// y.show();
// y.checkSolution([[2, 3, 4, 5], [], [1]]);
// y.checkSolution([[], [1, 2, 3, 4, 5], []]);
// console.log("all live items:",y.allLiveItems());
// const z = new Address(1, 2);
// console.log(z.item, z.tower, z);
// for (let i=0;i<3;i++) console.log(`tower ${"ABC"[i]} is empty: ${y.towers[i].isEmpty}`);
// console.log("finally:", y.getLegalMoves());
y.solve();
y.show();