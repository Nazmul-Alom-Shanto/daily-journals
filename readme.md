# 📝 Daily Journals

A privacy-focused, offline-first journaling app designed to store personal thoughts, reflections, and notes securely — using strong local encryption.

> ✨ Version `1.0.0` — MVP: Fully offline, data is encrypted.

---

## 🔐 Features

- **100% Offline** – No internet needed. Your data stays on your device.
- **Encrypted Storage** – All journal entries are stored in a single, strongly encrypted `.json` file.
- **Password Protection** – App access requires a password to prevent unauthorized reading.
- **Date-Based Entries** – Entries are stored by date. Dates are fixed to preserve journal integrity.
- **Edit/Delete Support** – Entries can be edited or deleted at any time.
- **Import/Export Options**:
  - Export journals with or without a custom password-based encryption
  - Import encrypted or plain JSON backups easily

---

## ⚙️ Setup

> Requires: Node.js

```bash
# Clone the repo
git clone https://github.com/Nazmul-Alom-Shanto/daily-journals.git
cd daily-journals

# Install dependencies (if any)
npm install

# Run the app (example)
npm start
