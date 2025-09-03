import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import { listen } from "@tauri-apps/api/event";
import "./App.css";
import Overlay from "./Overlay";

function App() {
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);

  useEffect(() => {
    const unlistenOcr = listen<string>("screenshot:ocr", (e) => {
      setOcrText(e.payload as string);
    });
    const unlistenExp = listen<string>("screenshot:explanation", (e) => {
      setExplanation(e.payload as string);
    });

    return () => {
      unlistenOcr.then((u) => u());
      unlistenExp.then((u) => u());
    };
  }, []);

  return (
    <main className="container">
      <h1>askollama</h1>
      <p>Running in background. Take a screenshot to see results.</p>
      <div className="row">
        <a href="https://vitejs.dev" target="_blank">
          <img src="/vite.svg" className="logo vite" alt="Vite logo" />
        </a>
        <a href="https://tauri.app" target="_blank">
          <img src="/tauri.svg" className="logo tauri" alt="Tauri logo" />
        </a>
        <a href="https://reactjs.org" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>

      <Overlay ocrText={ocrText} explanation={explanation} />
    </main>
  );
}

export default App;
