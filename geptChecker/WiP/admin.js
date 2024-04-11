    console.clear();
    "use strict";
    // document.getElementById("version-no").innerHTML = "Version 5-0.2"
    const versionNumber = "6-1.1";
    const versionDetails = "Incorporates new GEPT wordlist & advises on preferred spellings";
    const versionInfo = document.getElementById("version-no");
    // versionDetails.innerHTML = "Version 6-1.1";
    // versionDetails.title += "\nIncorporates new GEPT wordlist and British spelling.";
    versionInfo.innerHTML = `Version ${versionNumber}`;
    versionInfo.title += `\n${versionDetails}.`;
    document.title = `LTTC Wordlist Tool (V.${versionNumber})`;
