import React from "react";
import { useNavigate } from "react-router-dom";

function Sidebar() {

  const navigate = useNavigate();

  return (
    <div className="sidebar">
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", justifyContent: "center" }}>
            <h3 className="sidebar-home-link"
              onClick={() => navigate("/signin")}
            >
              Sign in
            </h3>
            <h3 className="sidebar-home-link"> / </h3>
            <h3 className="sidebar-home-link"
              onClick={() => navigate("/register")}
            >
              Register
            </h3>
        </div>
        <img
            src="/woc_logo.png"
            alt="Logo"
            className="sidebar-logo"
        />
        <a href="/" className="sidebar-home-link"><h2>Home</h2></a>
        {/* <h2>Menu</h2> */}
        {/* <ul style={{ listStyle: "none", padding: 0 }}> */}
            {/* <li>Home</li> */}
            {/* <li>Dashboard</li>
            <li>Settings</li> */}
        {/* </ul> */}
    </div>
  );
}

export default Sidebar;