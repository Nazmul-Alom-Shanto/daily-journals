const { app, ipcMain, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const crypto = require('crypto');
const keytar = require('keytar');
const { AsyncLocalStorage } = require('async_hooks');
const { time, timeStamp } = require('console');
const { channel } = require('diagnostics_channel');


const SERVICE = 'DAILY_JOURNAL';
const ACCOUNT = 'USER_PASSWORD_HASHED';

const filePath = path.join(app.getPath("userData"), "data.json");

function ensureStorageExistance() {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({ "salt": "47Fawee36bFNNcabjFj4AA==", "iv": "2rZ276YB89vUYa7VHUDsKQ==", "encryptedData": "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" }));
    }
}
ensureStorageExistance();
async function setDefaultPassswordIfNotSet() {
    const password = await keytar.getPassword(SERVICE, ACCOUNT);
    if (!password) {
        await keytar.setPassword(SERVICE, ACCOUNT, hashSHA256('shanto'));
    }
}

setDefaultPassswordIfNotSet();
function encryptData(plaintext, password) {
    // if plaintext is an object, stringify it
    const data = typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext);
    // generate random salt and iv
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(16);

    // drive random key from the password and salt
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

    // Encrypt
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    // return all needed info as base64 strings
    return JSON.stringify({
        salt: salt.toString('base64'),
        iv: iv.toString('base64'),
        encryptedData: encrypted
    });
}

/// Decrypt encrypted json with password
function decryptData(encryptedJsonStr, password) {
    try {
        const { salt, iv, encryptedData } = JSON.parse(encryptedJsonStr);
        // convert base64 to buffer
        const saltBuf = Buffer.from(salt, 'base64');
        const ivBuf = Buffer.from(iv, 'base64');
        // Derive the key with the same peremeter
        const key = crypto.pbkdf2Sync(password, saltBuf, 100000, 32, 'sha256');
        // Decrypt 
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, ivBuf);
        let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return { success: true, data: JSON.parse(decrypted) };
    }
    catch (err) {
        console.warn("Error decrypting data", err);
        return { success: false, message: err.message };
    }
}
const decrypted = decryptData(fs.readFileSync(filePath).toString(), '4444');
// async function hashSHA256(password) {
//     const passwordHash =  crypto.createHash('sha256').update(password).digest('hex');
//     if (passwordHash) {
//         const check = typeof passwordHash === 'string' ? passwordHash : JSON.stringify(passwordHash);
//         return check;
//     }
// }
async function  hashSHA256(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

async function getHash() {
    const password = await keytar.getPassword(SERVICE, ACCOUNT);
    return password;
}

ipcMain.handle("set-password", async (event, oldPassword, password) => {
    try {
        const realHash = await keytar.getPassword(SERVICE, ACCOUNT);
        const oldHash = await hashSHA256(oldPassword);
        const currentHash = await hashSHA256(password);
        if(realHash && oldHash === realHash && oldHash !== currentHash) {
        const setHash = await keytar.setPassword(SERVICE, ACCOUNT, currentHash);
        return { success: true, message: setHash };
        } else {
            return { success: false, message: "Invalid Password or Password already set" };
        }
     
    } catch (err) {
        return { success: false, message: err.message };
    }
})
// async  function temp() {
//     try{
//         await keytar.setPassword(SERVICE, ACCOUNT, hashSHA256('shanto'));
//         console.log("password set");
//     } catch (err){
//         console.log("password set failed");
//     }
// };
// temp();
ipcMain.handle("temp", async () => {
    try {
        await keytar.setPassword(SERVICE, ACCOUNT, (await hashSHA256('shanto')));
        return { success: true };
    } catch (err) {
        return { success: false, message: err.message };
    }
});

ipcMain.handle("set-default-password", async() => {
    try {
        const setHash = await keytar.setPassword(SERVICE, ACCOUNT, hashSHA256('shanto'));
        return { success: true, message: setHash };
    } catch (err) {
        return { success: false, message: err.message };
    }
})

ipcMain.handle("confirm-password", async (event, password) => {
    if (await hashSHA256(password) === await keytar.getPassword(SERVICE,ACCOUNT)) {
        return true;
    }
    return false;
})
ipcMain.handle("is-password-set", async () => {
    if (await getHash() !== null) {
        return true;
    }
    return false;
})

ipcMain.handle("change-encryption", async (event, oldPassword, newPassword) => {
    try {
        const raw = await fsp.readFile(filePath);
        const decrypted = decryptData(raw.toString(), oldPassword);
        const encrypted = encryptData(decrypted.data, newPassword);
        await fsp.writeFile(filePath, encrypted, 'utf8'); // await ensures it finishes
        return { success: true };
    } catch (err) {
        return { success: false, message: err.message };
    }
})

ipcMain.handle("load-notes", async (event, rawPassword) => {
    try {
        const fileBuffer = fs.readFileSync(filePath);
        const decrypted = decryptData(fileBuffer.toString(), rawPassword);

        return {
            success: true,
            data: decrypted
        }
    }
    catch (err) {
        console.error("Failed to load notes:", err);
        return {
            success: false,
            data: []
        };

    }
})

ipcMain.handle("write-notes", async (event, notes, rawPassword) => {
    try {
        const encrypted = encryptData(notes, rawPassword);
        await fsp.writeFile(filePath, encrypted, 'utf8'); // await ensures it finishes
        return { success: true };
    } catch (err) {
        return { success: false, message: err.message };
    }
});
const iconPath = path.join(__dirname, 'icon.ico');
function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: true
        },
        icon: path.join(__dirname, "icon.ico")

    });
    win.loadFile('index.html');

}

ipcMain.handle('export-encrypted', async (event, notes, rawPassword) => {
    try {
        const exportPayload = {...notes, timeStamp: new Date().toISOString(), status : "valid"
            , hash : hashSHA256(rawPassword)
        };
        const encrypted = encryptData(exportPayload, rawPassword);
        const {filePath, canceled} = await dialog.showSaveDialog({
            title: 'Export encrypted data',
            filters: [
                { name: 'JSON', extensions: ['json'] }
            ],
            defaultPath: 'data-encrypted.json'
        })
        if (canceled || !filePath) {
            return { success: false, message: 'User canceled the export' };
        }
        const data = { mode: 'encrypted', data: encrypted };
        await fsp.writeFile(filePath, JSON.stringify(data), 'utf-8');
        return { success: true, message: 'Data exported successfully' };
    } catch (err) {
        return { success: false, message: err.message };
    }
});

ipcMain.handle('export-decrypted', async (event,notes) => {
    try {
        const {filePath, canceled} = await dialog.showSaveDialog({
            title : 'Export decrypted data',
            filters : [
                {name : 'JSON', extensions : ['json']}
            ],
            defaultPath : 'data-decrypted.json'
        });
        if(!filePath || canceled) {
            return { success : false, message : 'User canceled the export'};
        }
        const data = { 
            timeStamp : new Date().toISOString(),
            
            mode : 'decrypted',
            data : notes}
        await fsp.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
        return { success : true, message : 'Data exported successfully'};
    } catch (err) {
        return { success : false, message : err.message};
    }
})
ipcMain.handle("encryption-check", async(event, notes, password) => {
    try {
        const raw = typeof notes === 'string' ? notes : JSON.stringify(notes);
        const decrypted = decryptData(raw, password);
        if(!decrypted.success){
            throw new Error("Encryption Failed, Password is invalid" + decrypted.message);
            
        }
        if(decrypted.data.status !== "valid"){
            throw new Error("File may have been corrupted");
        }
        return {success : true, data : decrypted.data};
    } catch (err) {
        return {success : false, message : err.message};
    }
})
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, focus the main window
        if (BrowserWindow.getAllWindows().length > 0) {
            const win = BrowserWindow.getAllWindows()[0];
            if (win.isMinimized()) win.restore();
            win.focus();
        }
    });


app.whenReady().then(() => {
    ensureStorageExistance();
    createWindow();
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
})
}