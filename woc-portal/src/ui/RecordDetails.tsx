import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Record from "../model/Record";
import RecordDetailsTable from "./RecordDetailsTable";


function RecordDetails (){
    const { speciesName } = useParams();

    const [selectedRecord, setselectedRecord] = useState<Record>();

    useEffect(() => {
        if(speciesName){
           fetch(`${process.env.REACT_APP_API_BASE_URL}/records/species/`+speciesName) // example endpoint
            .then((response) => response.json())
            .then((data) => {
              
              const record: Record = data as Record;
              setselectedRecord(record);
            })
            .catch((error) => {
              console.error("Error fetching species:", error);
            });
        }  
    }, [speciesName]); // empty dependency array = runs only once on mount
    
    

    return(
        <div className="dashboard" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" , color: "navy"}}>
            {/* <h1>Dashboard</h1> */}
            <h1 style={{ marginTop: "0.1em", marginBottom: "0.3em" }}>
               Record details for {speciesName}:
            </h1>

            {selectedRecord && (
                <RecordDetailsTable selectedRecord={selectedRecord}/>
            )}

        </div>
    );
}

export default RecordDetails;