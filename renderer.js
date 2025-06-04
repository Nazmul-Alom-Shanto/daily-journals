
document.documentElement.style.setProperty("--sidebar-width", localStorage.getItem("sidebar-width"));
document.documentElement.style.setProperty("--view-width", localStorage.getItem("view-width"));
  
// DOM
const viewTitle = document.querySelector('.view-title');
const viewNote = document.querySelector('.view-note');
const viewDate = document.querySelector('.curr-date');
const viewBodyContainer = document.querySelector(".view-body-container");

const editTitle = document.querySelector('.note-title-input');
const editBody = document.querySelector('.note-body-input');
const saveNoteBTN = document.querySelector('.note-save-btn');
const editBodyContainer = document.querySelector(".edit-body-container");

let rawPassword = localStorage.getItem("passwordSetStatus") === 'skip' ? "1111": '';
let sessionCount = sessionStorage.getItem("count") ? Number(sessionStorage.getItem("count")) : 0;

const deleteWarning = document.querySelector(".delete-warning");
const deleteWarningTitle = document.querySelector(".in-progress-delete-note-title");
const deleteWarningConfirm =  document.getElementById("delete-note-btn-yes");
const deleteWarningCancel =  document.getElementById("delete-note-btn-no");

const newNoteBtn = document.querySelector('#new-note');

const currentDate = new Date().toISOString().slice(0, 10);

const sidebar = document.querySelector(".sidebar");
const view = document.querySelector(".view");

const settingsIcon = document.querySelector("#settings");

const resizer = document.querySelector(".resizer");
let isDragging = false;

const loader = document.querySelector(".loader");

let notes = sessionStorage.getItem("notes") ? JSON.parse(sessionStorage.getItem("notes")) : {data: []};

let saveLocationDate = currentDate; // today or "2025-05-25" // must
let saveLocationIndex = 0;
try {
    const todayEntry = notes?.data?.find(entry => entry.date === currentDate);
    saveLocationIndex = todayEntry ? todayEntry.notes.length : 0;
} catch (error) {
    saveLocationIndex = 0;
}


let deleteLocationDate = "";
let deleteLocationIndex = 0;

const monthMap = {
    "01": "January",
    "02": "February",
    "03": "March",
    "04": "April",
    "05": "May",
    "06": "June",
    "07": "July",
    "08": "August",
    "09": "September",
    "10": "October",
    "11": "November",
    "12": "December"
}

if(!localStorage.getItem("passwordSetStatus")) {
    setPasswordWizerd();
} else if(localStorage.getItem("passwordSetStatus") !== 'skip' && !sessionStorage.getItem("allowed")) {
    passwordProtection();
} else {
    (async () => {
        await password();
        await init();
    })();
}
async function passwordProtection() { 
    sessionStorage.setItem("firstRun", "true");
    const protection = document.createElement("div");
    protection.className = "protection";
    protection.innerHTML = `
        <div class="protection-container">
            <p>Enter password</p>
            <div class="password-container">
                <input type="password" class="password-input">
                <button class="password-btn"><i class="fa-solid fa-arrow-right"></i></button>
            </div>
        </div>
    `
    document.body.appendChild(protection);

    const passwordInput = protection.querySelector(".password-input");
    // fucus on password input
    protection.querySelector(".password-input").focus();
    protection.querySelector(".password-btn").addEventListener("click", async() => {
        
        rawPassword = passwordInput.value;
        const confirmPassword = await ipcRenderer.invoke("confirm-password",rawPassword);
        if(!confirmPassword) {
            showWarningMessage("Incorrect Password");
            return;
        }
        await init();
        protection.remove();
    })

}
async function init() {
    const allowed = await ipcRenderer.invoke("confirm-password",rawPassword);
    if(allowed) {
        sessionStorage.setItem("allowed","true");
        if(!sessionStorage.getItem("notes")){
            if(!rawPassword){
                if(localStorage.getItem("passwordSetStatus") === 'skip') {
                    rawPassword = '1111';
                } else {
                  await enterPasswordOnTheFlyWizard();
                }
            }
            const loadedData = await loadNotes(rawPassword);
            if(loadedData.success && loadedData.data.success){
            sessionStorage.setItem("notes",JSON.stringify(loadedData.data.data));
            notes = loadedData.data.data;        
            } else {
                console.error("Something went wrong when loading notes",loadedData.error);
                showWarningMessage("Something went wrong when loading notes");
            }
        } else {
                notes = JSON.parse(sessionStorage.getItem("notes"));  

        }
        notes = sessionStorage.getItem("notes") ? JSON.parse(sessionStorage.getItem("notes")) : {data: []};
        notes = notes === null ? {data: []} : notes;
        updateSidebar(notes);
        saveLocationDate = currentDate;
        try{
            const todayEntry = notes?.data?.find(entry => entry.date === currentDate);
            saveLocationIndex = todayEntry ? todayEntry.notes.length : 0;
        } catch (error) {
            saveLocationIndex = 0;
        }
}else{
    showWarningMessage("Incorrect password");
}   
}

async function enterPasswordOnTheFlyWizard(message = "Password is required to encrypt & decrypt notes on the way", temp = false){
    return new Promise((resolve) => {
        const enterPasswordContainer = document.createElement("div");
        enterPasswordContainer.className = "enter-password-on-the-fly-container";
        enterPasswordContainer.innerHTML = `
            <div class="enter-password-on-the-fly">
                <h2>Enter password</h2>
                <p>${message}</p>
                <div class="password-container">
                    <input type="password" class="password-input">
                    <button class="password-btn"><i class="fa-solid fa-arrow-right"></i></button>
                </div>
                <!--span class="skip-btn">I don't have a password</span-->
            </div>
            `
            document.body.appendChild(enterPasswordContainer);
            const passwordInput = enterPasswordContainer.querySelector(".password-input");
            // focus on password input
            passwordInput.focus();
            enterPasswordContainer.querySelector(".password-btn").addEventListener("click", async() => {
                enteredPassword = passwordInput.value;
                if(enteredPassword){
                    if(temp){
                        resolve(enteredPassword);
                        enterPasswordContainer.remove(); 
                    } else {
                        const allowed = await ipcRenderer.invoke("confirm-password",enteredPassword);
                        if(allowed) {
                            enterPasswordContainer.remove();
                            localStorage.setItem("passwordSetStatus","set");
                            resolve(enteredPassword);
                            
                        } else {
                            passwordInput.value = "";
                            showWarningMessage("Incorrect password");
                        }
                    }
            }
            });    
    });
}

updateSidebar(notes);

// shortcuts for password btn
document.addEventListener("keydown", (e) => {
    if(e.key === "Enter" && (document.activeElement === document.querySelector(".password-input") || 
    document.activeElement === document.querySelector(".password-btn"))) {
        document.querySelector(".password-btn").click();
    }
})

// functions

// function to merge to notes;
async function merge(note1, note2){
    try {
        const merged = {};
        [...note1.data, ...note2.data].forEach((entry) => {
            const date = entry.date;
            if(!merged[date]){
                merged[date] = [];
            }
            entry.notes.forEach((note) => {
                const isDuplicate = merged[date].some((n)=> {
                    return  n.title === note.title && n.body === note.body;
                })

                if(!isDuplicate){
                    merged[date].push(note);
                }
            });
        });
        return {success : true, merged: {
            data : Object.entries(merged).map(([date,notes]) => ({date,notes})),
        }}
    } catch (err){
        return {success : false, message : err.message}
    }
} 
  async function password() {
    if(localStorage.getItem("passwordSetStatus") === "skip") {
        return "shanto";
    }
    const allowed = await ipcRenderer.invoke("confirm-password",rawPassword);
    if(!allowed) {
        rawPassword = await enterPasswordOnTheFlyWizard();
        return rawPassword;
    } else {
        return rawPassword;
    }
}
async function  hashSHA256(password) {
    const hash = await ipcRenderer.invoke("hash-password", password);
    return hash;
}

async function writeNotes(notes) {
    try {
        const result = await window.ipcRenderer.invoke("write-notes", notes, rawPassword);

        if (result.success) {
           showWarningMessage("Note saved successfully", "#4CAF50");
        } else {
            showWarningMessage(`Failed to save note: ${result.error || "Unknown error"}`);
            console.warn(`Failed to save note: ${result.error || "Unknown error"}`);
            alert(`Failed to save note: ${result.error || "Unknown error"}`);
        }
    } catch (err) {
        console.error("writeNotes invocation failed:", err);
        showWarningMessage(`Error saving note: ${err.message}`);
        alert(`Error saving note: ${err.message}`);
    }
}

async function loadNotes(password){
    const notes = await ipcRenderer.invoke("load-notes", password);
    if(notes.success) {
        return notes;
    } else {
        showWarningMessage(`Something went wrong when Loading note from main: ${notes.message}`);
        return null;
    }
  
}

function showWarningMessage(message, bg = '#f44336', ) {
    let container = document.querySelector(".warning-message-container");
    if (!container) {
        container = document.createElement("div");
        container.className = "warning-message-container";
        container.style.position = "fixed";
        container.style.top = "40px";
        container.style.right = "20px";
        container.style.zIndex = "9999";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.gap = "10px";
        document.body.appendChild(container);
    }

    const warning = document.createElement("div");
    warning.className = "warning-message";
    warning.textContent = message;
    warning.style.background = bg; // red
    warning.style.color = "#fff";
    warning.style.padding = "10px 20px";
    warning.style.borderRadius = "8px";
    warning.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
    warning.style.fontFamily = "sans-serif";
    warning.style.transition = "opacity 0.3s";
    warning.style.opacity = "1";

    console.warn("Warn:", message);
    container.appendChild(warning);

    setTimeout(() => {
        warning.style.opacity = "0";
        setTimeout(() => {
            warning.remove();
        }, 300);
    }, 3000);
}

// function to convert date to badge shown in sidebar
function dateToSidebarBadge(date) {
    if(date === currentDate) {
        return "Today"
    } else if(date === new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().slice(0, 10)) {
        return "Yesterday"
    }
   
    const  [,month,day] = date.split("-");
    return `${monthMap[month]} ${day}`
    }

// badge for view
function dateToViewBadge(date) {
    const [year,month,day] = date.split("-");
    return  `${monthMap[month]} ${day}, ${year}`
}

// update view
function updateView(title, body, date) {
    viewTitle.textContent = title;
    viewNote.textContent = body;
    viewDate.textContent = dateToViewBadge(date);
}

function updateEdit(title, body) {
    editTitle.value = title;
    editBody.value = body;
}

function showDeleteWarning(title) {
    deleteWarning.style.display = "flex";
    deleteWarningTitle.textContent = title;
}

// settings wizerd
let settingsWizerdEl; 
let hideTimeout = null;

// showSettingsWizerd();
function settingsWizerd() {
    settingsWizerdEl = document.createElement("div");
    settingsWizerdEl.className = 'settings';
    settingsWizerdEl.innerHTML = `
        <ul>
            <li class="change-pass">Change Password</li>
            <li class="export-import">Export/Import</li>
            <li class="user-guide">User Guide</li>
            <li class="about-app">About</li>
        </ul>
    `;
   
    // Action on clicking 'Change Password'
    settingsWizerdEl.querySelector(".change-pass").addEventListener('click', () => setPasswordWizerd());
    settingsWizerdEl.querySelector('.about-app').addEventListener('click', () => AboutWizerd());
    settingsWizerdEl.querySelector('.user-guide').addEventListener('click', () => UserInstructionWizerd());
    settingsWizerdEl.querySelector('.export-import').addEventListener('click', () => ExportImportWizerd());
    document.body.appendChild(settingsWizerdEl);
    settingsWizerdEl.addEventListener('mouseleave', hideSettingsWizerd);
    settingsWizerdEl.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
}

function showSettingsWizerd() {
    if(!settingsWizerdEl) settingsWizerd(); // create if not exist
    clearTimeout(hideTimeout);
    const react = settingsIcon.getBoundingClientRect();
    settingsWizerdEl.style.top = `${react.bottom + 10}px`;
    settingsWizerdEl.style.left = `${react.left - 190}px`;
    settingsWizerdEl.style.display = 'block';
}

function hideSettingsWizerd() {
    hideTimeout = setTimeout(() => {
        if(settingsWizerdEl) settingsWizerdEl.style.display = "none";
    }, 200);
}
// hover over settings icon
settingsIcon.addEventListener('mouseenter', showSettingsWizerd);
settingsIcon.addEventListener('mouseleave', hideSettingsWizerd);

document.addEventListener('DOMContentLoaded', () => {
    if(!settingsWizerdEl) return;
    settingsWizerdEl.addEventListener('mouseenter', () => clearTimeout(hideTimeout)); 
    settingsWizerdEl.addEventListener('mouseleave', hideTimeout);
});

// About the app
function AboutWizerd() {
    const about = document.createElement("div");
    about.className = 'about';

    about.innerHTML = `
        <div class="container">
            <i class="vanish-about fa-solid fa-xmark" title="Close"></i>
            <h1>About This App</h1>
            <p>
              Welcome to your personal Daily Journal App — a simple, secure, and distraction-free space to collect your thoughts, track your goals, and reflect on your daily progress.
            </p>
            <p>
              Designed specifically for desktop environments, this app allows you to easily create, edit, and browse journal entries with an intuitive sidebar. All your notes are encrypted and stored locally in a lightweight JSON format for speed and privacy.
            </p>
            <p>
              Whether you're tracking personal recovery goals, planning your day, or just reflecting on life — this app is made to keep you focused and inspired.
            </p>
            <a href="https://nazmul-alom-shanto.github.io/" target="_blank" class="btn-dev">About the Developer</a>
        </div>
    `;

    // Attach event listener to only the close icon
    about.querySelector('.vanish-about').addEventListener('click', () => {
        about.remove();
    });
    document.body.appendChild(about);
}

// user instruction
function UserInstructionWizerd() {
    const instruction = document.createElement("div");
    instruction.className = 'about'; // Reuse same class for modal backdrop

    instruction.innerHTML = `
            <div class="container">
            <i class="vanish-about fa-solid fa-xmark" title="Close"></i>
            <h1>How to Use This App</h1>
            <p>
              This is your personal offline Daily Journal App. You can write and save your journal entries safely on your own computer.
            </p>
            <ul style="line-height: 1.8;">
              <li><strong>Default Password:</strong> <code>shanto</code></li>
              <li>Make sure to remember your new password if you change it.</li>
              <li>All data is stored locally in a JSON file – nothing leaves your device.</li>
              <li>Use the sidebar to browse, search, and manage your saved notes by title or date.</li>
              <li>You can also use this app for tracking recovery goals, habits, or anything meaningful to you.</li>
              <li>If the app seems stuck, try refreshing your browser (your notes will still be there).</li>
            </ul>
            <p>Stay consistent and make it part of your daily reflection routine. This tool is yours — private, secure, and fully offline.</p>
        </div>
    `;

    // Close only when clicking the icon
    instruction.querySelector('.vanish-about').addEventListener('click', () => {
        instruction.remove();
    });

    document.body.appendChild(instruction);
}

// Export and import wizerd
function ExportImportWizerd() {
    const modal = document.createElement("div");
    modal.className = "about"; 
    modal.innerHTML = `
      <div class="container">
        <i class="vanish-about fa-solid fa-xmark" title="Close"></i>
        <h1>Import & Export Notes</h1>
        <p>
          You can export your notes as a backup and import them later. For privacy, exported files can be encrypted or plain.
        </p>
        <div>
          <button class="export-btn-decrypted">⬇ Export Decrypted</button>
          <button class="export-btn-encrypted">⬇ Export Encrypted</button>
          <label for="importFile" class="import-btn">⬆ Import Notes</label>
          <input type="file" id="importFile" accept=".json">
        </div>
      </div>
    `;

    // Close modal
    modal.querySelector(".vanish-about").addEventListener("click", () => {
      modal.remove();
    });
    // Exporn file;
    modal.querySelector(".export-btn-encrypted").addEventListener("click", async () => {
        const password = await enterPasswordOnTheFlyWizard("Enter password for encryption, it can be diffrent from your current password, but it is required when you will import this again", true);
        const exportEncrypted = await ipcRenderer.invoke("export-encrypted", notes, password);
        if(exportEncrypted.success) {
            showWarningMessage("File exported successfully",'green');
        } else {
            showWarningMessage(exportEncrypted.message);
        }
    });

    modal.querySelector(".export-btn-decrypted").addEventListener("click", async () => {
        const exportDecrypted = await ipcRenderer.invoke("export-decrypted", notes);
        if(exportDecrypted.success) {
            showWarningMessage("File exported successfully", 'green');   
        } else {
            showWarningMessage(exportDecrypted.message);
        }

    });
    // Import handler
    modal.querySelector("#importFile").addEventListener("change", async function () {
      const file = this.files[0];
      let data;
      if (!file) return;
  
      const reader = new FileReader();
      reader.onload = async function (e) {
        let content = e.target.result;
  
        try {
          // Try parsing as plain first
        data = JSON.parse(content);
        } catch (err) {
            showWarningMessage("Invalid Json" + err.message);
        }
        try {
        // if encrypted
        if(data.mode === "encrypted") {
            const password = await enterPasswordOnTheFlyWizard("Enter the password for decryption", true)
            const check = await ipcRenderer.invoke("encryption-check", data.data, password);
            if(check.success){
                const  mergeResult = await merge(check.data , notes);
                if( mergeResult.success) {
                    showWarningMessage("Note Sucessfully decrypted & merged", 'green');
                     notes =   mergeResult.merged;
                    updateSidebar(notes);
                } else {
                    showWarningMessage("Something went wrong when marging the notes, " + mergeResult.message);
                }
            } else {
                showWarningMessage("Something went wrong when decrypting the notes, password is invalid or file may have beed corrupted");
            }
        } else if (data.mode === "decrypted") {
            const  mergeResult = await merge(data.data , notes);
            if( mergeResult.success) {
                showWarningMessage("Note Sucessfully decrypted & merged", 'green');
                notes =  mergeResult.merged;
                updateSidebar(notes);
            } else {
                showWarningMessage("Something went wrong when marging the notes" + mergeResult.message);
            }
        } else {
            throw new Error("Invalid file format, file is corrupted");
        }
        
        } catch (err) {
          showWarningMessage(err.message);
        }
  
        this.value = "";
      };
  
      reader.readAsText(file);
    });
  
    document.body.appendChild(modal);
  }
  
// password wizerd
function setPasswordWizerd() {
    const setPassword = document.createElement("div");
    setPassword.className = "set-password";
    setPassword.innerHTML = `
        <i class="vanish-set-password fa-solid fa-xmark" title='Close'></i>
        <div class="set-password-container">
            <p>Set password</p>
            <div class="password-container">
                <input type="password" class="password-input-old" placeholder="Old Password">
                <input type="password" class="password-input" placeholder="New Password">
                <input type="password" class="password-input-confirm" placeholder="Confirm Password">
            </div>
            <div class="password-btn-container">
                <button class="password-btn-skip">Skip</button>
                <button class="password-btn-set">Let's go</button>
            </div>
        </div>
    `;
    document.body.appendChild(setPassword);
    document.querySelector(".password-input").focus();

    setPassword.querySelector(".password-btn-set").addEventListener("click", async () => {
        const passwordOld = setPassword.querySelector(".password-input-old").value;
        const password = setPassword.querySelector(".password-input").value;
        const passwordConfirm = setPassword.querySelector(".password-input-confirm").value;
        const confirmPasswordOld = await ipcRenderer.invoke("confirm-password", passwordOld);
        if (!confirmPasswordOld) {
            setPassword.querySelector(".password-input").value = "";
            setPassword.querySelector(".password-input-confirm").value = "";
            showWarningMessage("Incorrect old password");
            return;
        }

        if (password !== passwordConfirm) {
            setPassword.querySelector(".password-input").value = "";
            setPassword.querySelector(".password-input-confirm").value = "";
            showWarningMessage("Password and confirm password don't match");
            return;
        }

        const result = await ipcRenderer.invoke("set-password", passwordOld, password);
        if (result.success) {
            const encryptionChange = await ipcRenderer.invoke("change-encryption", passwordOld, password);
            if (encryptionChange.success) {
                showWarningMessage("File encrypted successfully", "green");
                localStorage.setItem("passwordSetStatus", "set");
                window.location.reload();
            } else {
                showWarningMessage(`Failed to encrypt file: ${encryptionChange.message}`);
            }
        } else {
            showWarningMessage(`Failed to set password: ${result.message}`);
        }
    });

    setPassword.querySelector(".password-btn-skip").addEventListener("click", async() => {
        localStorage.setItem("passwordSetStatus", "skip");
        const currentPassword = await ipcRenderer.invoke("set-default-password");
        if (currentPassword.success) {
            showWarningMessage("Default password set successfully", "green");
            window.location.reload();
        } else {
            showWarningMessage(`Failed to set default password: ${currentPassword.message}`);
            return;
        }
        document.body.removeChild(setPassword);
    });
    setPassword.querySelector('.vanish-set-password').addEventListener('click', () => {
        document.body.removeChild(setPassword);
    });
}

// update sidebar
function updateSidebar(notes) {

    const sidebarBody = document.querySelector('.sidebar-body');
    sidebarBody.innerHTML = "";
    const TotalDayNotes = notes?.data?.length; // must
    for(let i = TotalDayNotes - 1; i >= 0; i--) {
        const dateNote = notes.data[i];
        const dateBadge = document.createElement("h3");
        dateBadge.className = "date";
        dateBadge.textContent = dateToSidebarBadge(dateNote.date);
        sidebarBody.appendChild(dateBadge);
        for(let j = dateNote.notes.length - 1; j >= 0; j--) {
            const note = dateNote.notes[j];
            const index = j;
            const sidebarTitle = document.createElement("button");
            sidebarTitle.id = `${dateNote.date}+${index}`
            sidebarTitle.setAttribute("data-title" , note.title);
            sidebarTitle.setAttribute("data-body", note.body);
            sidebarTitle.setAttribute("data-date", dateNote.date);
            sidebarTitle.className = "note-title";
            const menuBtn = document.createElement("button");
            menuBtn.className = "menu-btn";
            menuBtn.innerHTML = `<i class="fa-solid fa-ellipsis-vertical"></i>`;
            const sidebarTitleInner = document.createElement("span");
            sidebarTitleInner.textContent = note.title;
            sidebarTitleInner.className = "note-title-inner";
            sidebarTitle.appendChild(sidebarTitleInner);
            sidebarTitle.appendChild(menuBtn);
            const currId = `${dateNote.date}+${index}`;
            const menu = document.createElement("div");
            menu.className = "menu";
            menu.innerHTML = `<ul class="menu-list">
                    <li class="edit-btn" id="edit-btn+${currId}">
                        <i class="fa-solid fa-pen-to-square"></i>
                        Edit
                    </li>
                    <li class="delete-btn" id="delete-btn+${currId}">
                        <i class="fa-solid fa-trash-can"></i>
                        Delete
                    </li>
            </ul>`
            menu.querySelector(".edit-btn").onclick = function() {
                viewBodyContainer.style.zIndex = "0";
                editBodyContainer.style.zIndex = "100";
                const sidebarTitle = this.parentElement.parentElement.parentElement;
                [saveLocationDate, saveLocationIndex] = sidebarTitle.id.split("+");
                saveLocationIndex = Number(saveLocationIndex);
                updateEdit(sidebarTitle.dataset.title, sidebarTitle.dataset.body);
            }

            menu.querySelector(".delete-btn").onclick = function() {
                const sidebarTitle = this.parentElement.parentElement.parentElement;
                [ deleteLocationDate, deleteLocationIndex] = sidebarTitle.id.split("+");
                deleteLocationIndex = Number(deleteLocationIndex);
                showDeleteWarning(sidebarTitle.dataset.title);
            }

            sidebarTitle.onclick = function(e) {
                const menu = this.querySelector(".menu");
                if(menu.contains(e.target)) return;
                updateView(this.dataset.title, this.dataset.body, this.dataset.date);
                sidebarTitle.classList.add("active");            
                viewBodyContainer.style.zIndex = "100";
                editBodyContainer.style.zIndex = "0";
                document.querySelectorAll(".note-title").forEach(title => {
                    title.classList.remove("active");
                });
                this.classList.add("active");
            }

            sidebarTitle.appendChild(menu);
            sidebarBody.appendChild(sidebarTitle);
            menuBtn.addEventListener("click", function(event) {
                event.stopPropagation();
                const menu = this.nextElementSibling;
                if(menu.style.display === "block") {
                    menu.style.display = "none";
                } else {
                    menu.style.display = "block";
                }
            });
            }
        }
     document.querySelectorAll(".note-title")[1]?.click();
    }    

newNoteBtn.addEventListener("click", function(){
    saveLocationDate = currentDate;
    try {
        const tergetEntry = notes.data.find(entry => entry.date === saveLocationDate);
        saveLocationIndex = tergetEntry.notes.length;
    } catch {
        saveLocationIndex = 0;
    }
    updateEdit("","");
    viewBodyContainer.style.zIndex = "0";
    editBodyContainer.style.zIndex = "100";
    document.querySelectorAll(".note-title").forEach(title => {
        title.classList.remove("active");
    });
    this.classList.add("active");
});

document.addEventListener("click", function(e){
    document.querySelectorAll(".menu").forEach(menu => {
        const isMenuBtn = e.target.closest(".menu-btn");
        const isInsideMenu = menu.contains(e.target);

        if (!isMenuBtn && !isInsideMenu) {
            menu.style.display = "none";[]
        }
    });
});

deleteWarningCancel.addEventListener("click", function() {
    deleteWarning.style.display = "none";
});
 
deleteWarningConfirm.addEventListener("click", function() {
    const tergetEntry = notes.data.find(entry => entry.date === deleteLocationDate);
    tergetEntry.notes.splice(deleteLocationIndex, 1);
    const filteredNotes = notes.data.filter(entry => entry.notes.length > 0);
    if(filteredNotes.length !== notes.data.length){
   // fs.writeFileSync("data.json", JSON.stringify(notes));
    sessionStorage.setItem("notes", JSON.stringify(notes));
    }
    notes.data = filteredNotes;
    deleteWarning.style.display = "none";
    (async () => {
        writeNotes(notes);
    })();
    updateSidebar(notes);
});

saveNoteBTN.addEventListener("click", function() {
    viewBodyContainer.style.zIndex = "100";
    editBodyContainer.style.zIndex = "0";
    document.querySelector("#new-note").classList.remove("active");
    const modifiedNote = {
        id: `${saveLocationDate}+${saveLocationIndex}`,
        title: editTitle.value || "Untitled",
        body: editBody.value,
    }
    const tergetEntry = notes.data.find(entry => entry.date === saveLocationDate);
    if(tergetEntry) {
        if(saveLocationIndex < tergetEntry.notes.length) {
            tergetEntry.notes[saveLocationIndex] = modifiedNote;
        } else {
            tergetEntry.notes.push(modifiedNote);
        }
    } else {
        notes.data.push({
            date: saveLocationDate,
            notes: [modifiedNote]
        });
    }
    sessionStorage.setItem("notes", JSON.stringify(notes));
    (async () => {
        writeNotes(notes);
    })();
    sessionStorage.setItem("notes", JSON.stringify(notes));
    updateSidebar(notes);   
});

resizer.addEventListener("mousedown", (e)=> {
    isDragging = true;
    e.preventDefault();
    document.body.style.cursor = "ew-resize";
})

document.addEventListener("mousemove", (e) => {
    if(!isDragging) return;
    if(isDragging) e.preventDefault();
    const minWidth = 15;
    const maxWidth = 45;
    const currWidth = (e.clientX * 100)/window.innerWidth; 
    if(currWidth < minWidth) return;
    if(currWidth > maxWidth) return;
    document.documentElement.style.setProperty("--sidebar-width", `${currWidth}vw`);
    document.documentElement.style.setProperty("--view-width", `${100 - currWidth}vw`);
    localStorage.setItem("sidebar-width", `${currWidth}vw`);
    localStorage.setItem("view-width", `${100 - currWidth}vw`);
});

document.addEventListener("mouseup", (e) => {
    isDragging = false;
    document.body.style.cursor = "default";
});

window.addEventListener("load", function() {
    this.setTimeout(() => {
        loader.remove();
    },500);
});

// prevent reload shortcut
window.addEventListener('keydown', (e) => {
    if(e.ctrlKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
    }
});

(async () => {
    const tem = await ipcRenderer.invoke("temp");
    if(tem.success) {
        console.log("password success");
    } else {
        console.log("password failed" + tem.message);
    }
})();

