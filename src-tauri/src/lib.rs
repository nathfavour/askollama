// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::{Arc, Mutex};

use notify::{RecommendedWatcher, RecursiveMode, Result as NotifyResult, Watcher, EventKind};
use std::time::Duration;
use tauri::Manager;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Settings {
    pub screenshots_dir: Option<String>,
    pub auto_prompt: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            screenshots_dir: None,
            auto_prompt: true,
        }
    }
}

#[tauri::command]
fn get_settings(state: tauri::State<'_, AppState>) -> Settings {
    state.settings.lock().unwrap().clone()
}

#[tauri::command]
fn set_settings(state: tauri::State<'_, AppState>, s: Settings) {
    *state.settings.lock().unwrap() = s;
}

#[derive(Clone)]
struct AppState {
    settings: Arc<Mutex<Settings>>,
}

fn spawn_watcher(app_handle: tauri::AppHandle, settings: Arc<Mutex<Settings>>) {
    std::thread::spawn(move || {
        // Use a tokio runtime for async HTTP requests
        let rt = tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build()
            .expect("failed to build runtime");

        // Determine screenshots dir (XDG default or user override)
        let default_dir = dirs::picture_dir().unwrap_or_else(|| PathBuf::from("/tmp"));
        let mut watch_dir = default_dir.join("Screenshots");
        if let Some(dir) = &*settings.lock().unwrap() {
            if let Some(sd) = &dir.screenshots_dir {
                watch_dir = PathBuf::from(sd);
            }
        }

        // Create watcher
        let (tx, rx) = std::sync::mpsc::channel();
        let mut watcher: RecommendedWatcher = Watcher::new_immediate(move |res| {
            tx.send(res).ok();
        }).expect("failed to create watcher");

        if let Err(e) = watcher.watch(&watch_dir, RecursiveMode::NonRecursive) {
            eprintln!("failed to watch {}: {}", watch_dir.display(), e);
            return;
        }

        loop {
            match rx.recv() {
                Ok(Ok(event)) => {
                    // Only handle create events
                    if matches!(event.kind, EventKind::Create(_)) {
                        if let Some(path) = event.paths.get(0) {
                            let path = path.clone();
                            let app = app_handle.clone();
                            let settings = settings.clone();
                            rt.spawn(async move {
                                // Small debounce
                                tokio::time::sleep(Duration::from_millis(200)).await;
                                if let Ok(text) = run_tesseract(&path).await {
                                    let _ = app.emit_all("screenshot:ocr", text.clone());
                                    // If auto_prompt is enabled, call Ollama
                                    let auto = settings.lock().unwrap().auto_prompt;
                                    if auto {
                                        if let Ok(explanation) = call_ollama(&text).await {
                                            let _ = app.emit_all("screenshot:explanation", explanation);
                                        }
                                    }
                                }
                            });
                        }
                    }
                }
                Ok(Err(e)) => {
                    eprintln!("watch error: {:?}", e);
                }
                Err(_) => break,
            }
        }
    });
}

async fn run_tesseract(path: &PathBuf) -> Result<String, String> {
    // Check tesseract exists
    if which::which("tesseract").is_err() {
        return Err("tesseract not found in PATH".into());
    }

    // tesseract <image> stdout -l eng
    let output = tokio::process::Command::new("tesseract")
        .arg(path)
        .arg("stdout")
        .arg("-l")
        .arg("eng")
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
        .await
        .map_err(|e| format!("failed to run tesseract: {}", e))?;

    if !output.status.success() {
        return Err("tesseract failed".into());
    }

    let text = String::from_utf8_lossy(&output.stdout).to_string();
    Ok(text)
}

async fn call_ollama(ocr_text: &str) -> Result<String, String> {
    // Assume Ollama is running locally at http://localhost:11434
    let client = reqwest::Client::new();
    let url = "http://127.0.0.1:11434/v1/complete";
    #[derive(serde::Serialize)]
    struct Req<'a> {
        model: &'a str,
        prompt: String,
        max_tokens: usize,
    }

    let prompt = format!("You are an assistant. Explain the following screenshot text in a concise, user-friendly way:\n\n{}", ocr_text);

    let req = Req { model: "llama2", prompt, max_tokens: 512 };

    let res = client
        .post(url)
        .json(&req)
        .send()
        .await
        .map_err(|e| format!("failed to call Ollama: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("ollama returned error: {}", res.status()));
    }

    let text = res.text().await.map_err(|e| format!("failed to read response: {}", e))?;
    Ok(text)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let settings = Arc::new(Mutex::new(Settings::default()));
    let app_state = AppState { settings: settings.clone() };

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![get_settings, set_settings]);

    let app = builder.build(tauri::generate_context!()).expect("error while building tauri app");

    // Spawn the watcher after app handle exists
    spawn_watcher(app.handle(), settings);

    app.run(|_app_handle, _event| {});
}
