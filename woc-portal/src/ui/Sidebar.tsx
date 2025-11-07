import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Record from "../model/Record";


function Sidebar() {

    const navigate = useNavigate();

    const [allSpecies, setAllSpecies] = useState<Array<string>>([]);
    const [selectedSpecies, setSelectedSpecies] = useState<string>("")
    const [selectedRecord, setselectedRecord] = useState<Record>();

    useEffect(() => {
       fetch(`${process.env.REACT_APP_API_BASE_URL}/records/species_names`).then((response) => response.json())
        .then((data) => {
          setAllSpecies(data);
          if (data.length > 0) {
            setSelectedSpecies(data[0]);
          }
          // console.log(data)
        })
        .catch((error) => {
          console.error("Error fetching species:", error);
        });
    }, []); // empty dependency array = runs only once on mount

  const handleDisplaySelection = () => {
      console.log("Button pressed, navigating to:", selectedSpecies);
      navigate("/details/"+selectedSpecies);
  };

  return (
    <div className="sidebar">
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", justifyContent: "center" }}>
            <h2 className="sidebar-home-link"
              onClick={() => navigate("/signin")}
            >
              Sign in
            </h2>
            <h2 className="sidebar-home-link"> / </h2>
            <h2 className="sidebar-home-link"
              onClick={() => navigate("/register")}
            >
              Register
            </h2>
        </div>
        <img
            src={process.env.REACT_APP_PUBLIC_URL + "/woc_logo.png"}
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
            >
                <label className="form-label form-element"> Crayfish genus: </label>
                <select
                    className="selector form-element"
                    name="crayfish-genus"
                    value={selectedSpecies}
                    onChange={(e) => setSelectedSpecies(e.target.value)}
                >
                    {allSpecies!.map(species => (
                        <option key={species}>{species}</option>
                    ))}
                </select>

                <label className="form-label form-element"> Crayfish species: </label>
                <select className="selector form-element" name="crayfish-sopecies">
                </select>

                <br></br>
                <button type="button" className="display-button form-element" onClick={handleDisplaySelection}>Display selection</button>
            </form>
        </div>

    </div>
  );
}

export default Sidebar;