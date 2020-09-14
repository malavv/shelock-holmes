function save(key, data) {
    if (data == undefined || data == null || typeof data === "string" && data.trim() == "") {
        log("Nothign to save");
        return;
    }
    let setObj = {};
    setObj[key] = JSON.parse(data);
    chrome.storage.sync.set(setObj, () => { console.log(`Key ${key} is set as ${JSON.stringify(data)}`); });
}

function onSetupClicked() {
    let log = (txt) => document.getElementById("log").innerText = txt;
    const value = document.getElementById('config').value;
    log(`Set Cfg clicked with config: ${value}`);
    save("cfg", value);
}

getCatByMls = (data, mls) => {
    if (data.trash.includes(mls)) return 0;
    if (data.maybe.includes(mls)) return 1;
    if (data.likey.includes(mls)) return 2;
    return 3; // Unknown
}

function saveInFirestore(db, mls, type) {
    switch (type) {
        case 0: 
            db.collection("houses").doc(Number(mls).toString()).set({mls: mls, type: "trash"});
            return;
        case 1: 
            db.collection("houses").doc(Number(mls).toString()).set({mls: mls, type: "maybe"});
            return;
        case 2: 
            db.collection("houses").doc(Number(mls).toString()).set({mls: mls, type: "likey"});
            return;
        default: 
            db.collection("houses").doc(Number(mls).toString()).delete();
            return;
    }
}

function saveNewHouseType(db, mls, type) {
    // update in firestore
    saveInFirestore(db, mls, type);
}

function setModel(dat, db) {
    // Set Config (Always-ish should be present)
    document.getElementById('config').value = JSON.stringify(dat.cfg, null, 2);

    // Set MLS Title
    document.getElementById('mls').innerText = dat.house ? Number(dat.house.mls).toString() : "";

    // Set Types
    let types = [document.getElementById("T"), document.getElementById("M"), document.getElementById("L"), document.getElementById("U")];
    types.forEach((el, idx) => {
        if (dat.house === null) {
            el.removeAttribute("selected");
            return;
        }
        
        // Selected Type
        if (dat.house.type == idx) {
            el.setAttribute("selected", "");
        } else {
            el.removeAttribute("selected");
        }

        // Add save on click
        el.addEventListener('click', function() {
            types.forEach(el => el.removeAttribute("selected"))
            types[idx].setAttribute("selected", "");
            saveNewHouseType(db, dat.house.mls, idx);
            return false;
        })
    })
}

function getHouse(mls, pack) {
    return (mls === null) ? null : { mls: mls, type: getCatByMls(pack, mls) };
}

function getMlsFromTabs(tabs) {
    const url = tabs[0].url;
    const matches = url.match(/\d{2,}/g);

    if (matches === null)
        return null;

    return Number.parseInt(matches[0]);
}

(function() {

    function onDomContentLoaded() {
        // Controls
        let mlsNum = document.getElementById('mls');
        let types = [document.getElementById("T"), document.getElementById("M"), document.getElementById("L"), document.getElementById("U")];
        let setupBtn = document.getElementById('setup');
        let cfgArea = document.getElementById('config');
        let log = (txt) => document.getElementById("log").innerText = txt;
        let dat = { house: null, cfg: null }; // Initial empty details

        // Connecting elements
        setupBtn.addEventListener("click", function(el, ev) { onSetupClicked(); return false; })

        // Set basic view model
        setModel(dat);

        // Config
        chrome.storage.sync.get("cfg", result => { cfgArea.value = JSON.stringify(result.cfg, null, 2); });

        // Type
        document.getElementById("T").setAttribute("selected", "selected");

        // Set correct types
        if (!mls) return false;

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {      
            // Get house data pack and set type
            chrome.storage.sync.get(["cfg", "data"], result => {

                firebase.initializeApp(result.cfg);

                // Get DB Object
                let db = firebase.firestore();

                // Data Model for Popup
                let dat = {
                    house: getHouse(getMlsFromTabs(tabs), result.data),
                    //house: null,
                    cfg: result.cfg
                }
                setModel(dat, db);
            });
        });
    }

    document.addEventListener('DOMContentLoaded', onDomContentLoaded);
})();
  