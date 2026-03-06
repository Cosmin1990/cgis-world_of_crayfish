import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Sidebar.css";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function Sidebar({ isOpen, onClose }: SidebarProps) {
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
    onClose(); // închide sidebar-ul după selecție pe mobil
  };

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? "show" : ""}`}
        onClick={onClose}
      />

      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <button className="sidebar-close" onClick={onClose}>
          ✕
        </button>

        <div className="sidebar-auth">
          <span onClick={() => window.location.href = "https://world.crayfish.ro"}>
            Home
          </span>
        </div>

        <img
          src={process.env.REACT_APP_PUBLIC_URL + "/woc_logo.png"}
          alt="Logo"
          className="sidebar-logo"
        />

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
    </>
  );
}

export default Sidebar;