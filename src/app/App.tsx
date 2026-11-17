import { ErrorBoundary } from "./ErrorBoundary";
import React, { Suspense } from 'react';
import "../App.css";
import { BrowserRouter, useRoutes } from 'react-router-dom';
import routes from "./routes";
import { Toaster } from "../components/ui/toast";


const AppRoutes = () => {
    const routing = useRoutes(routes);
    return routing;
};

function App() {
  return (
    <React.Fragment>
      <ErrorBoundary><BrowserRouter>
        <Toaster>
          <Suspense fallback={<div role="status" className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">Loading workspace…</div>}><AppRoutes /></Suspense>
        </Toaster>
      </BrowserRouter></ErrorBoundary>
    </React.Fragment>
  );
}

export default App;
