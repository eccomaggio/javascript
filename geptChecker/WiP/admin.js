    console.clear();
    "use strict";
    const versionNumber = "6-5.0";
    const versionDetails = "New GEPT wordlist; edits 'in place'; advises on preferred spellings; recognizes negative prefixes and superfluous hyphens; custom level strike-through; preserves original spacing/punctuation";
    const versionInfo = document.getElementById("version-no");
    versionInfo.innerHTML = `Version ${versionNumber}`;
    versionInfo.title += `\n${versionDetails}.`;
    document.title = `LTTC Wordlist Tool (V.${versionNumber})`;
