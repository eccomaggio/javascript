    "use strict";
    console.clear();
    const versionNumber = "7.0";
    const versionDetails = "*New GEPT wordlist; edits 'in place'; *advises on preferred spellings; *recognizes negative prefixes and superfluous hyphens; *custom level strike-through; *preserves original spacing/punctuation; includes GZ6K high school list\n[nerdy]\n+all html output now escaped through Tag.stringify(); +implemented all functions as classes; +font size now saved between sessions; +kids now displays levelstats";
    const versionInfo = document.getElementById("version-no");
    versionInfo.innerHTML = `Version ${versionNumber}`;
    versionInfo.title += `\n${versionDetails}.`;
    document.title = `LTTC Wordlist Tool (V.${versionNumber})`;
