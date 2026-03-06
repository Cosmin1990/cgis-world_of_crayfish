import React, { useState } from 'react';
import { Routes, Route } from "react-router-dom";
import './App.css';
import Sidebar from './ui/Sidebar';
import Dashboard from './ui/Dashboard';
import Register from './ui/Register';
import SignIn from './ui/SignIn';
import About from './ui/About';
import Cite from './ui/Cite';
import Join from './ui/Join';
import RecordDetails from './ui/RecordDetails';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      className="App"
      style={{
        display: 'flex',
        height: '100vh',
        width: '100%',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div
        style={{
          flex: 1,
          height: '100vh',
          width: '100%',
          overflow: 'auto',
          position: 'relative'
        }}
      >
        <button
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(true)}
        >
          ☰
        </button>

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/register" element={<Register />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/join" element={<Join />} />
          <Route path="/about" element={<About />} />
          <Route path="/cite" element={<Cite />} />
          <Route
            path="/details/:speciesName"
            element={<RecordDetails key={window.location.pathname} />}
          />
        </Routes>
      </div>
    </div>
  );
}

export default App;