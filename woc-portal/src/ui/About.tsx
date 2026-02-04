import React from "react";
// import { FiletypeJson } from "react-bootstrap-icons";  // PascalCase component name
// import { FiletypeCsv, Book, FiletypeYml } from "react-bootstrap-icons";  // or just use <i> if font-based
// import { JournalCheck } from "react-bootstrap-icons";

function About (){
    return(
        <div className="dashboard" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" , color: "navy"}}>
            {/* <h1>Dashboard</h1> */}
            <h1 style={{ marginTop: "0.1em", marginBottom: "0.3em" }}>
               About
            </h1>
        {/* Button using react-bootstrap-icons */}

        </div>
    );

}

export default About;