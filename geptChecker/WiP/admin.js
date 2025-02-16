    "use strict";
    console.clear();
    const versionNumber = "8.2.2";
    const versionDetails = "* Includes GZ6K & ref2k lists; stores db as sparse array to reduce file size; edits 'in place'; *advises on preferred spellings; *recognizes negative prefixes and superfluous hyphens; *custom level strike-through; *preserves original spacing/punctuation";
    const versionInfo = document.getElementById("version-no");
    versionInfo.innerHTML = `Version ${versionNumber}`;
    versionInfo.title += `\n${versionDetails}.`;
    document.title = `LTTC Wordlist Tool (V.${versionNumber})`;
