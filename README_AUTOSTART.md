Autostart and setup for askollama (Linux)

1) System prerequisites
- Install Rust toolchain and build essentials:
  sudo apt update
  sudo apt install -y build-essential pkg-config libssl-dev
- Install Tesseract OCR:
  sudo apt install -y tesseract-ocr
- Ensure Node.js and yarn/npm/pnpm installed to build frontend.

2) Build and run (dev)
- Start the frontend dev server (from repo root):
  npm install
  npm run dev
- In another terminal, run tauri dev (this will build and run the native app):
  npm run tauri

3) Autostart (XDG autostart)
Create a .desktop file in ~/.config/autostart/askollama.desktop pointing to the installed app binary. Example:

[Desktop Entry]
Type=Application
Name=askollama
Exec=/path/to/askollama
X-GNOME-Autostart-enabled=true

Place it in ~/.config/autostart/ to enable start on desktop session login.

4) Systemd (optional)
If you prefer a systemd user service, create ~/.config/systemd/user/askollama.service:

[Unit]
Description=askollama overlay service

[Service]
Type=simple
ExecStart=/path/to/askollama
Restart=on-failure

[Install]
WantedBy=default.target

Enable and start with:
  systemctl --user enable --now askollama

Notes:
- Ollama must be running locally for explanation functionality; configure the endpoint in src-tauri/src/lib.rs if different.
- The app expects tesseract available on PATH.
