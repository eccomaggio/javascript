// console.log("supplement found!")
// <option value="3">高中6K字-108版</option>
// import { makeGZ6Kdb } from "./dbGZ6K.js";

const gz6k_option = document.createElement("option");
const gz6k_text = document.createTextNode("高中6K字-108版");
gz6k_option.appendChild(gz6k_text);
gz6k_option.setAttribute("value", "3");
HTM.selectDb.appendChild(gz6k_option);
HTM.GZ_level.innerHTML = '<fieldset id="t1_gz6k">\
              <legend id="t1_gz6k_legend">高中6K字</legend>\
              <div id="t1_gz6k_inputs" class="line-el line">\
                <label for="t1_gz6k_11">all\
                  <input type="radio" name="gz6k" id="t1_gz6k_11" value="100">\
                </label>\
                <label for="t1_gz6k_1">1\
                  <input type="checkbox" name="gz6k" id="t1_gz6k_1" value="1">\
                </label>\
                <label for="t1_gz6k_2">2\
                  <input type="checkbox" name="gz6k" id="t1_gz6k_2" value="2">\
                </label>\
                <label for="t1_gz6k_3">3\
                  <input type="checkbox" name="gz6k" id="t1_gz6k_3" value="3">\
                </label>\
                <label for="t1_gz6k_4">4\
                  <input type="checkbox" name="gz6k" id="t1_gz6k_4" value="4">\
                </label>\
                <label for="t1_gz6k_5">5\
                  <input type="checkbox" name="gz6k" id="t1_gz6k_5" value="5">\
                </label>\
                <label for="t1_gz6k_6">6\
                  <input type="checkbox" name="gz6k" id="t1_gz6k_6" value="6">\
                </label>\
              </div>\
            </fieldset>';

// app.wordlist.defaults.push(
const extras = [
    {name: "GZ6K",
    factory: makeGZ6Kdb,
    toShow: [HTM.GZ_level],
    css: {
      _light: "#42b883",
      _medium: "#347474",
      _dark: "#35495e",
      _accent: "#ff7e67"
    }}
];

console.log("debug >>",app.wordlist.defaults)