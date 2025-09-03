import React, { useEffect, useState } from "react";

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
          <button onClick={() => setVisible(false)}>×</button>
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
                onClick={() => {
                  // For now just append prompt locally; will wire to backend later
                  setReply((r) => (r ? r + "\n\nUser prompt: " + prompt : "User prompt: " + prompt));
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
