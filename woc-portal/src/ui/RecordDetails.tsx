import React, { useState, useEffect, useRef } from "react";


import { useParams } from "react-router-dom";
import Record from "../model/Record";
import Species from "../model/Species";
import Citation from "../model/Citation";
import RecordDetailsTable from "./RecordDetailsTable";
import PhotoArea from "./PhotoArea";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Assessment from "../model/Assessment";


// MapComponent with memoization and dynamic center update
interface MapComponentProps {
  latitude: number | undefined;
  longitude: number | undefined;
}

const MapComponent = React.memo(({ latitude, longitude }: MapComponentProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

//   // Update map center and marker when coordinates change
//   useEffect(() => {
//     if (mapRef.current && latitude && longitude) {
//       const newCenter: L.LatLngExpression = [latitude, longitude];
//       mapRef.current.setView(newCenter, 13);
//       if (markerRef.current) {
//         markerRef.current.setLatLng(newCenter);
//       }
//     }
//   }, [latitude, longitude]);

  return (

      <MapContainer
        center={[45.0, 24.65] as L.LatLngExpression} // Initial fallback center
        zoom={6}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
        key="static-map" // Static key to prevent reinitialization
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {/* {latitude && longitude && (
          <Marker
            position={[latitude, longitude]}
            ref={markerRef}
          />
        )} */}
      </MapContainer>

  );
});

// Helper function to recursively extract scientific names from taxonomy object
function extractScientificNames(node: any): string[] {
  const names: string[] = [];

  function traverse(current: any) {
    if (!current) return;
    if (current.scientificname) {
      names.push(current.scientificname);
    }
    if (current.child) {
      traverse(current.child);
    }
  }

  traverse(node);
  return names;
}

function RecordDetails() {
  const { speciesName } = useParams();
  const effectRan = useRef(false);

  const [selectedRecord, setSelectedRecord] = useState<Record>();
  const [selectedSpecies, setSelectedSpecies] = useState<Species>();
  const [selectedSpeciesCode, setSelectedSpeciesCode] = useState<number>();
  const [selectedSpeciesTaxonomy, setselectedSpeciesTaxonomy] = useState<string []>( [] );
  const [selectedSpeciesEndangermentLevel, setselectedSpeciesEndangermentLevel] = useState<string> ();

    const [selectedSpeciesCitation, setSelectedSpeciesCitation] = useState<Citation>();

  useEffect(() => {
    // if (effectRan.current) return;
    // effectRan.current = true;

    if (speciesName) {
      // Fetch record data
      fetch(`${process.env.REACT_APP_API_BASE_URL}/records/species/` + speciesName)
        .then((response) => response.json())
        .then((data) => {
          const record: Record = data as Record;
          setSelectedRecord(record);
        })
        .catch((error) => {
          console.error("Error fetching species:", error);
        });

      // Fetch species data
      fetch(`${process.env.REACT_APP_API_BASE_URL}/species/` + speciesName)
        .then((response) => {
          if (response.ok) {
            return response.json();
          } else if (response.status === 404) {
            throw new Error("404");
          } else {
            console.error(`Error fetching species: HTTP status ${response.status}`);
            throw new Error("Non-404 error");
          }
        })
        .then((data) => {
          const species_data: Species = data as Species;
          setSelectedSpecies(species_data);
          setSelectedSpeciesCode(species_data.official_id);
          console.log("Loaded from Local Database Cache");
          console.log(species_data);
        })
        .catch((error) => {
          if (error.message === "404") {
            console.error(error);
            console.log("Species not found in local Database");
            console.log("Calling DECANET API:");

            fetch(
              `${process.env.REACT_APP_DECANET_API_BASE_URL}/AphiaIDByName/` +
                speciesName +
                "?marine_only=false&extant_only=true"
            )
              .then((response) => response.json())
              .then((data) => {
                const speciesCode: number = data as number;
                setSelectedSpeciesCode(speciesCode);
                console.log("API response: Species code:", speciesCode);

                let s = new Species(0, speciesName, speciesCode);
                fetch(`${process.env.REACT_APP_API_BASE_URL}/species/new`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(s),
                })
                  .then((response) => response.json())
                  .then((savedSpecies) => {
                    console.log("Species saved to DB:", savedSpecies);
                  })
                  .catch((error) => {
                    console.error("Error saving species to DB:", error);
                  });
              })
              .catch((error) => {
                console.error("Error fetching species:", error);
              });
          }
        });

    }
  }, [speciesName]);

useEffect(() => {
    // // Fetch citation record data
    fetch(`${process.env.REACT_APP_DECANET_API_BASE_URL}/AphiaSourcesByAphiaID/` + selectedSpeciesCode)
    .then((response) => response.json())
    .then((data) => {
        const records: Citation[] = data as Citation[];
        if (records.length>0){
            setSelectedSpeciesCitation(records[0]);
            console.log(records[0]);
        }
    })
    .catch((error) => {
        console.error("Error fetching species:", error);
    });


    // Fetch taxonomy data
    fetch(`${process.env.REACT_APP_DECANET_API_BASE_URL}/AphiaClassificationByAphiaID/` + selectedSpeciesCode)
    .then((response) => response.json())
    .then((data) => {
        const names = extractScientificNames(data);
        setselectedSpeciesTaxonomy(names);
        console.log("Extracted taxonomy:", names);
    })
    .catch((error) => {
        console.error("Error fetching species:", error);
    });


    // Only run if speciesName exists and is non-empty
    if (speciesName) {
      // Parse genus and species epithet
      const [genusName, speciesEpithet] = speciesName.split(" ");

      // Fetch Endangerment Assessment data
      fetch(`${process.env.REACT_APP_API_BASE_URL}/iucn/taxa?genus=${genusName}&species=${speciesEpithet}`)
        .then((response) => response.json())
        .then((data) => {
          const assessment: Assessment = data as Assessment;
          if (assessment && assessment.danger_level !== selectedSpeciesEndangermentLevel) {
            setselectedSpeciesEndangermentLevel(assessment.danger_level);
            console.log("Species:", assessment.scientific_name);
            console.log("Danger LEVEL:", assessment.danger_level);
          }
        })
        .catch((error) => {
          console.error("Error fetching species:", error);
        });
    }
}, [selectedSpecies, selectedSpeciesCode]);


  return (
    <div className="dashboard" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", color: "navy" }}>
      {/* <h1 style={{ marginTop: "0.1em", marginBottom: "0.3em" }}>
        Record details for {speciesName}:
      </h1> */}

      {selectedRecord && (
        <>
            {/* <RecordDetailsTable selectedRecord={selectedRecord} /> */}
            
               { selectedSpeciesCitation && (
                    <>
                        {/* RECORD Reference */}
                        <h2 style={{ marginTop: "0.1em", marginBottom: "0.3em", textAlign: "left" }}>
                            {speciesName} 
                        </h2>
                        <h3 style={{ marginTop: "0.1em", marginBottom: "0.3em", textAlign: "left" }}>
                            {selectedSpeciesCitation.reference}
                        </h3>
                        <h3 style={{ marginTop: "0.1em", marginBottom: "0.3em" }}>
                            <a href={selectedSpeciesCitation.url} target="_blank" rel="noopener noreferrer">
                                {selectedSpeciesCitation.url}
                            </a>
                        </h3>
                        <h3 style={{ marginTop: "0.1em", marginBottom: "0.3em", textAlign: "left" }}>
                            {selectedSpeciesCitation.doi}
                        </h3>

                        {/* Taxonomy */}
                        <div style={{ backgroundColor: "lightgreen", padding: "1em", borderRadius: "8px", marginTop: "1em", width: "99%" }}>
                          <ul style={{ display: "flex", flexWrap: "wrap", gap: "0.5em", listStyleType: "disc", paddingLeft: "1.5em", margin: 0 }}>
                            {selectedSpeciesTaxonomy.map((name, index) => (
                              <li key={index} style={{ marginRight: "1em" }}>{name}</li>
                            ))}
                          </ul>
                          <div style={{ marginTop: "0.5em" }}>
                            <a href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                navigator.clipboard.writeText(selectedSpeciesTaxonomy.join(", "));
                                // alert("Taxonomy copied to clipboard!");
                              }}
                              style={{ color: "blue", textDecoration: "underline", cursor: "pointer" }}
                            >
                              Copy taxonomy
                            </a>
                          </div>
                        </div>

                       {selectedSpeciesEndangermentLevel && (
                         <div style={{ width: "100%", marginTop: "1em" }}>
                           <div className="acknowledgement">
                             API calls powered by: IUCN 2025. IUCN Red List of Threatened Species. Version 2025-2 &lt;www.iucnredlist.org&gt;
                           </div>
                           <img
                             src={process.env.REACT_APP_PUBLIC_URL + `/levels/${selectedSpeciesEndangermentLevel}.svg`}
                             alt="Endangerment Level"
                             style={{
                               width: "70%",
                               height: "auto",
                               display: "block",
                               margin: "0 auto",
                               transform: "scaleY(0.99)",
                             }}
                           />
                         </div>
                       )}

                    </>
      
                )}
      {/* K1gqHaXiz8LrWrriLbahrf7Bviunq8tfpmvx       */}
   
{/* 
            <div style={{ marginTop: "1em", fontWeight: "bold" }}>
                {selectedSpecies ? (
                <>
                    Species Name: {selectedSpecies.species_name} <br />
                    Species Code (AphiaID): {selectedSpecies.official_id}
                </>
                ) : (
                <span>Loading species info...</span>
                )}
            </div> */}

            <div style={{ display: "flex", width: "100%", height: "70vh", gap: "1em", marginTop: "1em", alignItems: "stretch" }}>
              <div style={{ flex: "0 0 30%", maxHeight: "100%", overflowY: "auto" }}>
                <PhotoArea />
              </div>
              
              <div style={{ flex: "0 0 70%", height: "100%" }}>
                <MapComponent latitude={45.0} longitude={24.15} />
              </div>
            </div>

        </>
      )}
    </div>
  );
}

export default RecordDetails;




// ========================================================= MOCKUP DATA - Replace API CALLS ===============================================

// MOCKUP DATA - test to avoid LIMITED API CALLS
    // const citation = new Citation(
    //     278488,
    //     "taxonomy source",
    //     "Crandall, K.A.; De Grave, S. (2017). An updated classification of the freshwater crayfishes (Decapoda: Astacidea) of the world, with a complete species list. Journal of Crustacean Biology. 37: 615-653.",
    //     "https://www.marinespecies.org/aphia.php?p=sourcedetails&id=278488",
    //     "10.1093/jcbiol/rux070",
    //     undefined,
    //     undefined,
    //     undefined,
    // );
    // setSelectedSpeciesCitation(citation);
    // console.log(citation);

    // MOCKUP DATA - test to avoid LIMITED API CALLS
    // const mockData = {
    //   "AphiaID": 1,
    //   "rank": "Superdomain",
    //   "scientificname": "Biota",
    //   "child": {
    //     "AphiaID": 2,
    //     "rank": "Kingdom",
    //     "scientificname": "Animalia",
    //     "child": {
    //       "AphiaID": 1065,
    //       "rank": "Phylum",
    //       "scientificname": "Arthropoda",
    //       "child": {
    //         "AphiaID": 1066,
    //         "rank": "Subphylum",
    //         "scientificname": "Crustacea",
    //         "child": {
    //           "AphiaID": 845959,
    //           "rank": "Superclass",
    //           "scientificname": "Multicrustacea",
    //           "child": {
                // "AphiaID": 1071,
                // "rank": "Class",
                // "scientificname": "Malacostraca",
                // "child": {
                //   "AphiaID": 1086,
                //   "rank": "Subclass",
                //   "scientificname": "Eumalacostraca",
                //   "child": {
                //     "AphiaID": 1089,
                //     "rank": "Superorder",
                //     "scientificname": "Eucarida",
                //     "child": {
                //       "AphiaID": 1130,
                //       "rank": "Order",
                //       "scientificname": "Decapoda",
                //       "child": {
                //         "AphiaID": 106670,
                //         "rank": "Suborder",
                //         "scientificname": "Pleocyemata",
                //         "child": {
                //           "AphiaID": 106672,
                //           "rank": "Infraorder",
                //           "scientificname": "Astacidea",
                //           "child": {
                //             "AphiaID": 196146,
                //             "rank": "Superfamily",
                //             "scientificname": "Astacoidea",
                //             "child": {
                //               "AphiaID": 234095,
                //               "rank": "Family",
                //               "scientificname": "Cambaridae",
    //                           "child": {
    //                             "AphiaID": 885050,
    //                             "rank": "Genus",
    //                             "scientificname": "Cambarus",
    //                             "child": {
    //                               "AphiaID": 885721,
    //                               "rank": "Species",
    //                               "scientificname": "Cambarus bartonii",
    //                               "child": null
    //                             }
    //                           }
    //                         }
    //                       }
    //                     }
    //                   }
    //                 }
    //               }
    //             }
    //           }
    //         }
    //       }
    //     }
    //   }
    // };
    // const names = extractScientificNames(mockData);
    // setselectedSpeciesTaxonomy(names);
    // console.log("Mocked taxonomy:", names);