import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./Sidebar.css";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SpeciesItem {
  genus: string;
  species: string;
  fullName: string;
}

function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();

  const [allSpecies, setAllSpecies] = useState<SpeciesItem[]>([]);
  const [selectedGenus, setSelectedGenus] = useState<string>("");
  const [selectedSpecies, setSelectedSpecies] = useState<string>("");

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_BASE_URL}/records/species_names`)
      .then((response) => response.json())
      .then((data: string[]) => {
        const parsedData: SpeciesItem[] = data.map((fullName) => {
          const parts = fullName.trim().split(/\s+/);
          return {
            genus: parts[0] || "",
            species: parts.slice(1).join(" ") || "",
            fullName,
          };
        });

        setAllSpecies(parsedData);

        if (parsedData.length > 0) {
          setSelectedGenus(parsedData[0].genus);
          setSelectedSpecies(parsedData[0].species);
        }
      })
      .catch((error) => {
        console.error("Error fetching species:", error);
      });
  }, []);

  const uniqueGenera = useMemo(() => {
    const genera = allSpecies.map((item) => item.genus);
    return genera.filter((genus, index) => genera.indexOf(genus) === index);
  }, [allSpecies]);

  const speciesForSelectedGenus = useMemo(() => {
    return allSpecies.filter((item) => item.genus === selectedGenus);
  }, [allSpecies, selectedGenus]);

  useEffect(() => {
    if (speciesForSelectedGenus.length > 0) {
      const exists = speciesForSelectedGenus.some(
        (item) => item.species === selectedSpecies
      );

      if (!exists) {
        setSelectedSpecies(speciesForSelectedGenus[0].species);
      }
    } else {
      setSelectedSpecies("");
    }
  }, [speciesForSelectedGenus, selectedSpecies]);

  const handleGenusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGenus = e.target.value;
    setSelectedGenus(newGenus);

    const firstSpeciesForGenus = allSpecies.find(
      (item) => item.genus === newGenus
    );

    setSelectedSpecies(firstSpeciesForGenus ? firstSpeciesForGenus.species : "");
  };

  const handleSpeciesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSpecies(e.target.value);
  };

  const handleDisplaySelection = () => {
    const selectedItem = allSpecies.find(
      (item) =>
        item.genus === selectedGenus && item.species === selectedSpecies
    );

    if (selectedItem) {
      navigate("/details/" + encodeURIComponent(selectedItem.fullName));
      onClose();
    }
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
          <span onClick={() => (window.location.href = "https://world.crayfish.ro")}>
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
          <select value={selectedGenus} onChange={handleGenusChange}>
            {uniqueGenera.map((genus) => (
              <option key={genus} value={genus}>
                {genus}
              </option>
            ))}
          </select>

          <label>Crayfish species</label>
          <select value={selectedSpecies} onChange={handleSpeciesChange}>
            {speciesForSelectedGenus.map((item) => (
              <option key={item.fullName} value={item.species}>
                {item.species}
              </option>
            ))}
          </select>

          <button
            className="btn-modern"
            onClick={handleDisplaySelection}
            disabled={!selectedGenus || !selectedSpecies}
          >
            Display selection
          </button>
        </section>
      </aside>
    </>
  );
}

export default Sidebar;