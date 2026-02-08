import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Record from "../model/Record";
import "./Sidebar.css";

function Sidebar() {
  const navigate = useNavigate();

  const [allSpecies, setAllSpecies] = useState<string[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<string>("");

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_BASE_URL}/records/species_names`)
      .then((response) => response.json())
      .then((data) => {
        setAllSpecies(data);
        if (data.length > 0) setSelectedSpecies(data[0]);
      })
      .catch((error) => {
        console.error("Error fetching species:", error);
      });
  }, []);

  const handleDisplaySelection = () => {
    navigate("/details/" + selectedSpecies);
  };

  return (
    <aside className="sidebar">

      {/* Auth links */}
      <div className="sidebar-auth">
        <span onClick={() => navigate("/signin")}>Sign in</span>
        <span className="divider">/</span>
        <span onClick={() => navigate("/register")}>Register</span>
      </div>

      {/* Logo */}
      <img
        src={process.env.REACT_APP_PUBLIC_URL + "/woc_logo.png"}
        alt="Logo"
        className="sidebar-logo"
      />

      {/* Navigation */}
      <nav className="sidebar-nav">
        <button onClick={() => navigate("/")}>Home</button>
        <button onClick={() => navigate("/cite")}>How to cite us</button>
        <button onClick={() => navigate("/about")}>About</button>
        <button onClick={() => navigate("/join")}>Join us</button>
      </nav>

      {/* Species selector */}
      <section className="sidebar-card">
        <h3>Species selector</h3>

        <label>Crayfish genus</label>
        <select
          value={selectedSpecies}
          onChange={(e) => setSelectedSpecies(e.target.value)}
        >
          {allSpecies.map((species) => (
            <option key={species}>{species}</option>
          ))}
        </select>

        <label className="disabled">Crayfish species</label>
        <select disabled />

        <button
          className="btn-modern"
          onClick={handleDisplaySelection}
          disabled={!selectedSpecies}
        >
          Display selection
        </button>
      </section>

    </aside>
  );
}

export default Sidebar;
