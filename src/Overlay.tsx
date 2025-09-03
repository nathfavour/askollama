import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";

type Props = {
  ocrText: string | null;
  explanation: string | null;
};

export default function Overlay({ ocrText, explanation }: Props) {
  const [visible, setVisible] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState<string | null>(null);

  useEffect(() => {
    if (ocrText) {
      setVisible(true);
      setReply(null);
    }
    if (explanation) {
      setReply(explanation);
    }
  }, [ocrText, explanation]);

  if (!visible) return null;

  return (
    <div className="overlay-container" onClick={() => setVisible(false)}>
      <div className="overlay" onClick={(e) => e.stopPropagation()}>
        <div className="overlay-header">
          <h3>Screenshot assistant</h3>
          <div>
            <button onClick={() => setVisible(false)}>×</button>
          </div>
        </div>
        <div className="overlay-body">
          <div className="ocr-block">
            <strong>Extracted text</strong>
            <pre>{ocrText}</pre>
          </div>

          <div className="chat-block">
            <strong>Assistant</strong>
            <div className="assistant-reply">{reply ?? "Waiting for explanation..."}</div>
            <input
              placeholder="Add a custom prompt (e.g. convert time to GST)"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <div className="chat-actions">
                <button
                  onClick={async () => {
                    try {
                      const res: string = await invoke("explain_with_prompt", { ocr_text: ocrText ?? "", prompt });
                      setReply(res);
                    } catch (e) {
                      setReply("Error sending prompt: " + String(e));
                    }
                  }}
                >
                  Send
                </button>
            </div>
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <button
                  onClick={async () => {
                    try {
                      await invoke("save_settings_to_disk");
                      setReply((r) => (r ? r + "\n\nSettings saved." : "Settings saved."));
                    } catch (e) {
                      setReply("Failed to save settings: " + String(e));
                    }
                  }}
                >
                  Save settings
                </button>
                <button
                  onClick={async () => {
                    try {
                      const s: any = await invoke("load_settings_from_disk");
                      setReply(JSON.stringify(s, null, 2));
                    } catch (e) {
                      setReply("Failed to load settings: " + String(e));
                    }
                  }}
                >
                  Load settings
                </button>
              </div>

              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <button
                  onClick={async () => {
                    try {
                      const path: string = await invoke("enable_autostart");
                      setReply("Autostart .desktop written: " + path);
                    } catch (e) {
                      setReply("Failed to enable autostart: " + String(e));
                    }
                  }}
                >
                  Enable autostart
                </button>
                <button
                  onClick={async () => {
                    try {
                      await invoke("disable_autostart");
                      setReply("Autostart disabled");
                    } catch (e) {
                      setReply("Failed to disable autostart: " + String(e));
                    }
                  }}
                >
                  Disable autostart
                </button>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}
