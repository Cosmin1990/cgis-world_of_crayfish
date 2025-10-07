import React from 'react';
import { BrowserRouter } from "react-router-dom";
import './App.css';
import Sidebar from './ui/Sidebar';
import Dashboard from './ui/Dashboard';


function App() {
  return (

        <BrowserRouter>
            <div className="App" style={{ display: 'flex', height: '100vh' }}>
                <Sidebar />
                <Dashboard />
            </div>
        </BrowserRouter>
  );
}

export default App;
