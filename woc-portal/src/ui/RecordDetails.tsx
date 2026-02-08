import React, { useState, useEffect, useRef, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm"; 
import { useParams } from "react-router-dom";

import Record from "../model/Record";
import Species from "../model/Species";
import Citation from "../model/Citation";
import Assessment from "../model/Assessment";
import Narrative from "../model/Narrative";

import MapComponent from "./LayeredMap";
import GeoLocation from '../model/GeoLocation';
import PhotoArea from "./PhotoArea";

import "leaflet/dist/leaflet.css";

import { FiletypeJson } from "react-bootstrap-icons";  // PascalCase component name
import { FiletypeCsv, Book, FiletypeYml, JournalCheck  } from "react-bootstrap-icons";  // or just use <i> if font-based

import "./RecordDetails.css";
import { BoxArrowUpRight } from "react-bootstrap-icons";

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
  const [selectedSpeciesEndangermentLevel, setselectedSpeciesEndangermentLevel] = useState<string | undefined>();
  const [selectedSpeciesCitation, setSelectedSpeciesCitation] = useState<Citation>();
  const [selectedSpeciesLocations, setSelectedSpeciesLocations] = useState<GeoLocation []>( [] ); 
  const [confirmedSpeciesDirectory, setConfirmedSpeciesDirectory] = useState<boolean> (false);

  const [AOOObject, setAOOObject] = useState<any>();
  const [EOOObject, setEOOObject] = useState<any>();
  const [BasinObject, setBasinObject] = useState<any>();

  const [isViewAllOpen, setIsViewAllOpen ] = useState<boolean>(false)
  const [narrative, setNarrative ] = useState<Narrative>()

  const [copied, setCopied] = useState(false);

  const copyTaxonomy = async () => {
    const text = selectedSpeciesTaxonomy.join(", ");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

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

    // Fetch Species Locations
    fetch(`${process.env.REACT_APP_API_BASE_URL}/records/species/` + speciesName + "/locations")
      .then((response) => response.json())
      .then((data) => {
        const locations: GeoLocation[] = data as GeoLocation[];
        // setSelectedSpeciesLocations(locations);
        setSelectedSpeciesLocations([...locations]); // spread ensures new reference
      })
      .catch((error) => {
        console.error("Error fetching species locations:", error);
      });

    // Confirm the existence of a species directory
    fetch(`${process.env.REACT_APP_API_BASE_URL}/species/confirmation/` + speciesName)
       .then((response) => {
          if (response.status === 201) {
            setConfirmedSpeciesDirectory(true);

            // Fetch species geolocations geojsons if directory confirmed
            fetch(`${process.env.REACT_APP_API_BASE_URL}/species/geolocations/` + speciesName)
              .then((response) => response.json())
              .then((data) => {
                // Assume the response has AOO, Basin, EOO geojson strings
                setAOOObject(data["AOO"]);
                setBasinObject(data["basins"]);
                setEOOObject(data["EOO"]);
                console.log("###############################################################")
                console.log(data["AOO"])
                console.log(data)
              })
              .catch((error) => {
                console.error("Error fetching species geolocations geojsons:", error);
              });  

          } else {
            setConfirmedSpeciesDirectory(false);
          }
          return response.json(); // optional, only if you need the response body
      })
      .catch((error) => {
        console.error("Error confirming species directory:", error);
        setConfirmedSpeciesDirectory(false);
      });

      

    // Fetch Species Narrative
    fetch(`${process.env.REACT_APP_API_BASE_URL}/species/narrative/` + speciesName)
      .then((response) => response.json())
      .then((data) => {
        const speciesNarrative: Narrative = data as Narrative;
        setNarrative(speciesNarrative)
      })
      .catch((error) => {
        console.error("Error fetching species locations:", error);
      });
      

  }, [speciesName]);

  useEffect(() => {
  if (!speciesName) return;

  // Reset previous data to force updates
  setAOOObject(null);
  setBasinObject(null);
  setEOOObject(null);

  fetch(`${process.env.REACT_APP_API_BASE_URL}/species/geolocations/${speciesName}`)
    .then(res => res.json())
    .then(data => {
      setAOOObject(data["AOO"]);
      setBasinObject(data["basins"]);
      setEOOObject(data["EOO"]);
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


  const downloadBibliographyFile = (format: string) => {
    const url = `${process.env.REACT_APP_API_BASE_URL}/species/bibliography/${speciesName}/${format}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // ======================= Render =======================

  return (
 <div className="record-page dashboard right-side">

      {selectedRecord && (
        <>
          {/* Example: if you want the table back */}
          {/* <RecordDetailsTable selectedRecord={selectedRecord} /> */}

          {/* ----------- Citation / Reference block (depends on citation only) ----------- */}
          {selectedSpeciesCitation && (
            <header className="card">
                <h1 className="species-title">
                  {speciesName}

                  <a
                    href={selectedSpeciesCitation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="external-icon"
                    aria-label="View on WoRMS"
                    title="View on WoRMS"
                  >
                    <BoxArrowUpRight size={20} />
                  </a>
                </h1>

                <p className="subtitle">
                  {selectedSpeciesCitation.reference}
                </p>

                <p className="subtitle">
                  {selectedSpeciesCitation.doi}
                </p>
              </header>
          )}

          {/* ----------- Taxonomy block (independent of citation) ----------- */}
          {selectedSpeciesTaxonomy.length > 0 && (
              <section className="card">
                <h2>Taxonomy</h2>

                <div className="taxonomy-list">
                  {selectedSpeciesTaxonomy.map((name, i) => (
                    <span key={i} className="taxonomy-chip">
                      {name}
                    </span>
                  ))}
                </div>

                <div className="taxonomy-actions">
                  <button className="btn-outline" onClick={copyTaxonomy}>
                  {copied ? "Copied ✔" : "Copy taxonomy"}
                </button>

                </div>

              </section>
            )}

          {/* ----------- IUCN endangerment block (independent as well) ----------- */}
          {selectedSpeciesEndangermentLevel && (
  <section className="card">
    <h2>Conservation status</h2>

    <img
      className="iucn-badge"
      src={`${process.env.REACT_APP_PUBLIC_URL}/levels/${selectedSpeciesEndangermentLevel}.svg`}
      alt="IUCN"
    />

    <p className="acknowledgement">
      API calls powered by: IUCN Red List of Threatened Species (2025)
    </p>
  </section>
)}

          {/* ----------- Photos + Map ----------- */}
          <section className="media-grid">
  <div className="media-panel">
    <PhotoArea />
  </div>

  <div className="media-panel">
    <MapComponent
      points={selectedSpeciesLocations}
      AOOObject={AOOObject}
      BasinObject={BasinObject}
      EOOObject={EOOObject}
    />
  </div>
</section>


          {/* Species Narrative */}
          {narrative && (
  <section className="card">
    <h2>Narrative</h2>

    <div className={`narrative ${isViewAllOpen ? "open" : ""}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {isViewAllOpen ? narrative.full : narrative.short}
      </ReactMarkdown>
    </div>

    <button
      className="btn-modern"
      onClick={() => setIsViewAllOpen(!isViewAllOpen)}
    >
      {isViewAllOpen ? "Hide details" : "Read full description"}
    </button>
  </section>
)}

          {/* Bibliography */}
          <section className="card">
  <h2>Bibliography</h2>

  <div className="button-row">
    <button className="btn-modern" onClick={() => downloadBibliographyFile("json")}>
      <FiletypeJson /> JSON
    </button>

    <button className="btn-modern" onClick={() => downloadBibliographyFile("csv")}>
      <FiletypeCsv /> CSV
    </button>

    <button className="btn-modern" onClick={() => downloadBibliographyFile("bib")}>
      <Book /> BibTeX
    </button>

    <button className="btn-modern" onClick={() => downloadBibliographyFile("cff")}>
      <JournalCheck /> CFF
    </button>
  </div>
</section>

        {confirmedSpeciesDirectory && (
  <section className="card">
    <h2>Species archive</h2>

    <a
      className="btn-modern"
      href={`${process.env.REACT_APP_API_BASE_URL}/species/archive/${speciesName}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      Download archive
    </a>
  </section>
)}

        </>
      )}
    </div>
  );
}

export default RecordDetails;
