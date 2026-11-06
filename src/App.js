import React from 'react';
import './App.css';
import { BrowserRouter, useRoutes } from 'react-router-dom';
import routes from "./routes";
import { Toaster } from "./components/ui/toast";


const AppRoutes = () => {
    const routing = useRoutes(routes);
    return routing;
};

function App() {
  return (
    <React.Fragment>
      <BrowserRouter>
        <Toaster>
          <AppRoutes />
        </Toaster>
      </BrowserRouter>
    </React.Fragment>
  );
}

export default App;
