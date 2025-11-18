import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";

import Record from "../model/Record";
import Species from "../model/Species";
import Citation from "../model/Citation";
import Assessment from "../model/Assessment";

import RecordDetailsTable from "./RecordDetailsTable";
import PhotoArea from "./PhotoArea";

import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// ======================= MapComponent =======================

interface MapComponentProps {
  latitude: number | undefined;
  longitude: number | undefined;
}

const MapComponent = React.memo(({ latitude, longitude }: MapComponentProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Force Leaflet to recalculate map size after mount (fixes blank space)
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current!.invalidateSize();
      }, 0);
    }
  }, []);

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
      key="static-map"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {/* If you want a marker, uncomment this and the effect above */}
      {/* {latitude && longitude && (
        <Marker
          position={[latitude, longitude]}
          ref={markerRef}
        />
      )} */}
    </MapContainer>
  );
});

// ======================= Helper: taxonomy names =======================

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

// ======================= Main Component =======================

function RecordDetails() {
  const [taxonomyClicked, setTaxonomyClicked] = useState(false);
  const { speciesName } = useParams();
  const effectRan = useRef(false);

  const [selectedRecord, setSelectedRecord] = useState<Record>();
  const [selectedSpecies, setSelectedSpecies] = useState<Species>();
  const [selectedSpeciesCode, setSelectedSpeciesCode] = useState<number>();
  const [selectedSpeciesTaxonomy, setselectedSpeciesTaxonomy] = useState<string[]>([]);
  const [selectedSpeciesEndangermentLevel, setselectedSpeciesEndangermentLevel] = useState<
    string | undefined
  >();
  const [selectedSpeciesCitation, setSelectedSpeciesCitation] = useState<Citation>();

  // ------------------- First effect: record + species + AphiaID -------------------

  useEffect(() => {
    if (!speciesName) return;

    // Fetch record data
    fetch(`${process.env.REACT_APP_API_BASE_URL}/records/species/` + speciesName)
      .then((response) => response.json())
      .then((data) => {
        const record: Record = data as Record;
        setSelectedRecord(record);
      })
      .catch((error) => {
        console.error("Error fetching species record:", error);
      });

    // Fetch species data from local DB
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

          // Fetch AphiaID by species name from external DECANET API
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

              const s = new Species(0, speciesName, speciesCode);
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
              console.error("Error fetching species from DECANET:", error);
            });
        }
      });
  }, [speciesName]);

  // ------------------- Second effect: citation + taxonomy + IUCN -------------------

  useEffect(() => {
    if (!selectedSpeciesCode) return;

    // 1) Fetch citation from your backend proxy for AphiaRecordByAphiaID
    fetch(`${process.env.REACT_APP_API_BASE_URL}/AphiaRecordByAphiaID/` + selectedSpeciesCode)
      .then((response) => response.json())
      .then((data) => {
        // Backend returns: { aphia_id, scientific_name, citation, url }
        const citation = new Citation(
          Number(data.aphia_id) || 0, // source_id
          "taxonomy source", // use
          data.authority ?? "", // reference
          data.url ??
            `https://www.marinespecies.org/aphia.php?p=taxdetails&id=${selectedSpeciesCode}`, // url
          "" // doi – unknown here
          // page, link, fulltext are optional
        );

        setSelectedSpeciesCitation(citation);
        console.log("Citation from AphiaRecordByAphiaID:", citation);
      })
      .catch((error) => {
        console.error("Error fetching AphiaRecordByAphiaID:", error);
      });

    // 2) Fetch taxonomy data from AphiaClassificationByAphiaID
    fetch(`${process.env.REACT_APP_API_BASE_URL}/AphiaClassificationByAphiaID/` + selectedSpeciesCode)
      .then((response) => response.json())
      .then((data) => {
        const names = extractScientificNames(data);
        setselectedSpeciesTaxonomy(names);
        console.log("Extracted taxonomy:", names);
      })
      .catch((error) => {
        console.error("Error fetching taxonomy:", error);
      });

    // 3) Fetch IUCN assessment
    if (speciesName) {
      const [genusName, speciesEpithet] = speciesName.split(" ");

      fetch(
        `${process.env.REACT_APP_API_BASE_URL}/iucn/taxa?genus=${genusName}&species=${speciesEpithet}`
      )
        .then((response) => response.json())
        .then((data) => {
          const assessment: Assessment = data as Assessment;
          console.log(assessment)
          if (assessment && assessment.danger_level) {
            setselectedSpeciesEndangermentLevel(assessment.danger_level);
            console.log("Species:", assessment.scientific_name);
            console.log("Danger LEVEL:", assessment.danger_level);
          } else {
            setselectedSpeciesEndangermentLevel(undefined);
          }
        })
        .catch((error) => {
          console.error("Error fetching IUCN assessment:", error);
        });
    }
  }, [selectedSpecies, selectedSpeciesCode, speciesName, selectedSpeciesEndangermentLevel]);

  // ======================= Render =======================

  return (
 <div
   className="dashboard right-side"
   style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", overflow: "visible" }}
 >
      {/* <h1 style={{ marginTop: "0.1em", marginBottom: "0.3em" }}>
        Record details for {speciesName}:
      </h1> */}

      {selectedRecord && (
        <>
          {/* Example: if you want the table back */}
          {/* <RecordDetailsTable selectedRecord={selectedRecord} /> */}

          {/* ----------- Citation / Reference block (depends on citation only) ----------- */}
          {selectedSpeciesCitation && (
            <>
              <h2 style={{ marginTop: "0.1em", marginBottom: "0.3em", textAlign: "left" }}>
                {speciesName}
              </h2>
              <h3 style={{ marginTop: "0.1em", marginBottom: "0.3em", textAlign: "left" }}>
                {selectedSpeciesCitation.reference}
              </h3>
              <h3 style={{ marginTop: "0.1em", marginBottom: "0.3em" }}>
                <a
                  href={selectedSpeciesCitation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {selectedSpeciesCitation.url}
                </a>
              </h3>
              <h3 style={{ marginTop: "0.1em", marginBottom: "0.3em", textAlign: "left" }}>
                {selectedSpeciesCitation.doi}
              </h3>
            </>
          )}

          {/* ----------- Taxonomy block (independent of citation) ----------- */}
          {selectedSpeciesTaxonomy.length > 0 && (
            <div
              style={{
                backgroundColor: "lightgreen",
                padding: "1em",
                borderRadius: "8px",
                marginTop: "1em",
                width: "99%",
              }}
            >
              <ul
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.5em",
                  listStyleType: "disc",
                  paddingLeft: "1.5em",
                  margin: 0,
                }}
              >
                {selectedSpeciesTaxonomy.map((name, index) => (
                  <li key={index} style={{ marginRight: "1em" }}>
                    {name}
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: "0.5em" }}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    navigator.clipboard.writeText(selectedSpeciesTaxonomy.join(", "));
                  }}
                  style={{
                    color: "blue",
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  Copy taxonomy
                </a>
              </div>
            </div>
          )}

          {/* ----------- IUCN endangerment block (independent as well) ----------- */}
          {selectedSpeciesEndangermentLevel && (
            <div style={{ width: "100%", marginTop: "1em" }}>
              <div className="acknowledgement">
                API calls powered by: IUCN 2025. IUCN Red List of Threatened Species. Version
                2025-2 &lt;www.iucnredlist.org&gt;
              </div>
              <img
                src={
                  process.env.REACT_APP_PUBLIC_URL +
                  `/levels/${selectedSpeciesEndangermentLevel}.svg`
                }
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

          {/* ----------- Photos + Map ----------- */}
          <div
            style={{
              display: "flex",
              width: "100%",
              height: "70vh",
              gap: "1em",
              marginTop: "1em",
              alignItems: "stretch",
            }}
          >
            <div style={{ flex: "0 0 30%", maxHeight: "100%", overflowY: "auto" }}>
              <PhotoArea />
            </div>

            <div style={{ flex: "0 0 70%", height: "100%" }}>
              {/* Use real coords from selectedRecord if you have them */}
              <MapComponent latitude={45.0} longitude={24.15} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default RecordDetails;
