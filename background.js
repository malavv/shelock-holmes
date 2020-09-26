/**
 * Ensures a synced storage key exists. Won't overwride an existing value.
 * <p>
 * See this in background.html, logs won't show on main page.
 * </p>
 * @param {string} key 
 * @param {any} def_value 
 */
function ensureDefaultExists(key, def_value) {
    chrome.storage.sync.get(key, result => {
        if (result[key] != undefined && result[key] != null) { 
            console.log(`key present {${key}:${JSON.stringify(result[key])}}`);
            return; // Don't Overwrite
        }
        let setObj = {};
        setObj[key] = def_value;
        chrome.storage.sync.set(setObj, () => { console.log(`Key ${key} is default ${JSON.stringify(def_value)}`); });
    });
}

function enableExtensionForUrlContains(pattern) {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
        chrome.declarativeContent.onPageChanged.addRules([{
            conditions: [new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: pattern } })], 
            actions: [new chrome.declarativeContent.ShowPageAction()]
        }]);
    });
}

function listHousesFromStore(db) {
    let res = [];
    return new Promise((resolve, reject) => {
        db.collection("houses").get()
            .then(querySnapshot => {
                if (querySnapshot.empty) {
                    resolve(res);
                    return;
                }
                querySnapshot.forEach(doc => { res.push(Object.assign({}, doc.data())); });
                resolve(res);
                return;
        });
    });
}

function saveToSync(key, data) {
    if (data == undefined || data == null || typeof data === "string" && data.trim() == "") {
        log("Nothign to save");
        return;
    }
    let setObj = {};
    setObj[key] = data;
    chrome.storage.sync.set(setObj, () => { console.log(`Key ${key} is set as ${JSON.stringify(data)}`); });
}

function onMsg(app, db, sendResp, type, data) {
    switch(type) {
        case 'data':
            return onDataSyncRequested(db, sendResp);
        default:
            console.warn(`[holmes] unrecognized msg type ${type}`);
            return;
    }
}

function onDataSyncRequested(db, sendResp) {
    listHousesFromStore(db)
        // Stream of Houses to Packed Format
        .then(houses => houses.reduce((obj, el) => { obj[el.type].push(el.mls); return obj; }, { "trash": [], "maybe": [], "likey": [] }))
        .then(pack => {
            console.log('[holmes] house pack', pack);

            // Sync firestore to user cloud storage
            setTimeout(() => saveToSync('data', pack), 10)

            // Send synced house data
            sendResp(pack);
        });
}

// Global Variables
let app = null;
let db = null;

// When the extension is installed or upgraded.
chrome.runtime.onInstalled.addListener(() => {

    // Have Extension Enabled on Centris
    enableExtensionForUrlContains('www.centris');

    // Make sure defaults exists
    ensureDefaultExists('cfg', {
        "apiKey": "### FIREBASE API KEY ###",
        "authDomain": "### FIREBASE AUTH DOMAIN ###",
        "projectId": "### CLOUD FIRESTORE PROJECT ID ###"
    });
    ensureDefaultExists('data', { "trash": [], "maybe": [], "likey": [] });

    // Start Synchronization
    chrome.storage.sync.get(['cfg', 'data'], result => { 

        // Initialize app.
        app = firebase.initializeApp(result.cfg);

        // Get DB Object
        db = firebase.firestore();
    });
});

// Open Message Queue for Content Script
chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    console.log("Received %o from %o, frame", msg, sender.tab, sender.frameId);

    onMsg(app, db, sendResponse, msg.type, msg.data);
    return true;
});