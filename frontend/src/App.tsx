import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

interface ApiResponse {
  success: boolean;
  message: string;
  timestamp: string;
  data: any;
}

function App() {
  const [count, setCount] = useState(0);
  const [apiData, setApiData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFromApi = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:3001/api/hello");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: ApiResponse = await response.json();
      setApiData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React + Backend API</h1>

      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>

      <div className="card">
        <h2>Backend API Connection</h2>
        <button onClick={fetchFromApi} disabled={loading}>
          {loading ? "Loading..." : "Fetch from Backend"}
        </button>

        {error && (
          <div style={{ color: "red", marginTop: "10px" }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {apiData && (
          <div style={{ marginTop: "10px", textAlign: "left" }}>
            <h3>API Response:</h3>
            <pre
              style={{
                background: "#f4f4f4",
                padding: "10px",
                borderRadius: "4px",
                fontSize: "12px",
                overflow: "auto",
              }}
            >
              {JSON.stringify(apiData, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
