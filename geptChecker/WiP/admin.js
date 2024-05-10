    console.clear();
    "use strict";
    const versionNumber = "6-4.3";
    const versionDetails = "New GEPT wordlist; edits 'in place'; advises on preferred spellings; recognizes negative prefixes and superfluous hyphens; custom level strike-through";
    const versionInfo = document.getElementById("version-no");
    versionInfo.innerHTML = `Version ${versionNumber}`;
    versionInfo.title += `\n${versionDetails}.`;
    document.title = `LTTC Wordlist Tool (V.${versionNumber})`;
