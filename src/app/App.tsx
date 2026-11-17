import { ErrorBoundary } from "./ErrorBoundary";
import React, { Suspense } from 'react';
import "../App.css";
import { BrowserRouter, useRoutes } from 'react-router-dom';
import routes from "./routes";
import { Toaster } from "../components/ui/toast";
import { ThemeProvider } from "../theme/ThemeProvider";
import LoadingMask from "../shared/services/LoadingMask";


const AppRoutes = () => {
    const routing = useRoutes(routes);
    return routing;
};

function App() {
  return (
    <React.Fragment>
      <ErrorBoundary><BrowserRouter>
        <ThemeProvider>
          <Toaster>
          <Suspense fallback={<div className="app-wrapper app-bootstrap-loading"><LoadingMask loading layout label="Loading your workspace" /></div>}><AppRoutes /></Suspense>
          </Toaster>
        </ThemeProvider>
      </BrowserRouter></ErrorBoundary>
    </React.Fragment>
  );
}

export default App;
