import React from 'react';
import '@fontsource-variable/albert-sans';
import '@fontsource-variable/aleo';
import '@fontsource-variable/inter';
import ReactDOM from 'react-dom/client';
import "./index.css";
import "./styles/tokens.css";
import "./theme.css";
import "./styles/forms.css";
import "./styles/tables.css";
import "./minimal.css";
import App from "./app/App";

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

