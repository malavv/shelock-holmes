console.info("[holmes] : content script loaded")

const TMLU = ["🧻", "📌", "🔥", "❔"];
const delayMs = 1500;
let lastPackage = null;

// Get unique property number
getMlsNumber = card => {
    let el = card.getElementsByClassName("a-more-detail")[0];
    return el ? Number.parseInt(el.getAttribute("data-mlsnumber")) : -1;
}

// Get Personal Category for this property (like to trash)
getCatByMls = (data, mls) => {
    if (data.trash.includes(mls)) return 0;
    if (data.maybe.includes(mls)) return 1;
    if (data.likey.includes(mls)) return 2;
    return 3; // Unknown
}

// Adds a marker to the correct category
setCat = (card, cat) => {
    if (cat < 0 || cat >= TMLU.length)
        throw new Error("Invalid House Category");

    let price = card.getElementsByClassName("price")[0];
    price.innerHTML = price.innerHTML + ` - ${TMLU[cat]}`;

    if (cat == 0)
        card.style.opacity = 0.5;
}

// Actually runs this for all properties
processPage = () => {
    let house_data = lastPackage;
    [...document.getElementsByClassName("thumbnailItem")]
        .filter(card => card != undefined && card != null)
        .forEach(card => setCat(card, getCatByMls(house_data, getMlsNumber(card))));
}

// Add controls to trigger re-processing on back and next page
for (let el of document.getElementsByClassName("next"))
    el.addEventListener("click", () => setTimeout(processPage, delayMs));
for (let el of document.getElementsByClassName("previous"))
    el.addEventListener("click", () => setTimeout(processPage, delayMs));

// Ask for a resync, and process page.
chrome.runtime.sendMessage({ "type": "data" }, resp => {
    console.log("[holmes] : data synced");
    lastPackage = resp;
    processPage();
});