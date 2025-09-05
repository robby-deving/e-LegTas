import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store/index'; // Explicit path to the index file
import { PermissionProvider } from './contexts/PermissionContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <PermissionProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </PermissionProvider>
      </PersistGate>
    </Provider>
  </React.StrictMode>
);
