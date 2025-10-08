import React, { useState } from "react";
import { useNavigate } from "react-router-dom";


function Sidebar() {

    const navigate = useNavigate();


  return (
    <div className="sidebar">
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", justifyContent: "center" }}>
            <h1 className="sidebar-home-link"
              onClick={() => navigate("/signin")}
            >
              Sign in
            </h1>
            <h1 className="sidebar-home-link"> / </h1>
            <h1 className="sidebar-home-link"
              onClick={() => navigate("/register")}
            >
              Register
            </h1>
        </div>
        <img
            src="/woc_logo.png"
            alt="Logo"
            className="sidebar-logo"
        />
        <h2 className="sidebar-home-link" onClick={() => navigate("/")}> Home </h2>
        <h2 className="sidebar-home-link" onClick={() => navigate("/cite")}> How to cite us </h2>
        <h2 className="sidebar-home-link" onClick={() => navigate("/about")}> About </h2>
        <h2 className="sidebar-home-link" onClick={() => navigate("/join")}> Join us </h2>

        <div className="sidebar-overlay">

            <h2>Species selector</h2>
            <form className="species-selector"
                   onSubmit={(e) => {
                        e.preventDefault(); // prevent form submission
                        navigate("/details"); // navigate to details page
                    }}
            >
                <label className="form-label form-element"> Crayfish genus: </label>
                <select className="selector form-element" name="crayfish-genus">
                </select>

                <label className="form-label form-element"> Crayfish species: </label>
                <select className="selector form-element" name="crayfish-sopecies">
                </select>

                <br></br>
                <button type="submit" className="display-button form-element">Display selection</button>
            </form>
        </div>

    </div>
  );
}

export default Sidebar;