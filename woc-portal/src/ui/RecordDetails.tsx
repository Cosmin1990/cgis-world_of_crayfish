import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useParams } from "react-router-dom";

import Record from "../model/Record";
import Citation from "../model/Citation";
import Assessment from "../model/Assessment";
import Narrative from "../model/Narrative";

import MapComponent from "./LayeredMap";
import GeoLocation from "../model/GeoLocation";

import "leaflet/dist/leaflet.css";

import {
  FiletypeJson,
  FiletypeCsv,
  Book,
  JournalCheck,
  BoxArrowUpRight,
} from "react-bootstrap-icons";

import "./RecordDetails.css";

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

  const [selectedRecord, setSelectedRecord] = useState<Record>();
  const [selectedSpeciesCode, setSelectedSpeciesCode] = useState<number>();
  const [selectedSpeciesTaxonomy, setSelectedSpeciesTaxonomy] = useState<string[]>([]);
  const [selectedSpeciesEndangermentLevel, setSelectedSpeciesEndangermentLevel] =
    useState<string | undefined>();
  const [selectedSpeciesCitation, setSelectedSpeciesCitation] = useState<Citation>();
  const [selectedSpeciesLocations, setSelectedSpeciesLocations] = useState<GeoLocation[]>([]);
  const [confirmedSpeciesDirectory, setConfirmedSpeciesDirectory] = useState<boolean>(false);

  const [AOOObject, setAOOObject] = useState<any>(null);
  const [EOOObject, setEOOObject] = useState<any>(null);
  const [BasinObject, setBasinObject] = useState<any>(null);

  const [isViewAllOpen, setIsViewAllOpen] = useState<boolean>(false);
  const [narrative, setNarrative] = useState<Narrative>();

  const [copied, setCopied] = useState(false);
  const [sebLinkCopied, setSebLinkCopied] = useState(false);

  const encodedSpeciesName = encodeURIComponent(speciesName ?? "");
  const sebManifestUrl = `${process.env.REACT_APP_API_BASE_URL}species/manifest2/${encodedSpeciesName}`;
  const sebManifestDownloadUrl = `${process.env.REACT_APP_API_BASE_URL}species/manifest/${encodedSpeciesName}`;

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

  const copySebManifestLink = async () => {
    try {
      await navigator.clipboard.writeText(sebManifestUrl);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = sebManifestUrl;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setSebLinkCopied(true);
    setTimeout(() => setSebLinkCopied(false), 1500);
  };

  // ------------------- Base species data -------------------

  useEffect(() => {
    if (!speciesName) return;

    setSelectedRecord(undefined);
    setSelectedSpeciesCode(undefined);
    setSelectedSpeciesTaxonomy([]);
    setSelectedSpeciesEndangermentLevel(undefined);
    setSelectedSpeciesCitation(undefined);
    setSelectedSpeciesLocations([]);
    setConfirmedSpeciesDirectory(false);
    setAOOObject(null);
    setBasinObject(null);
    setEOOObject(null);
    setNarrative(undefined);
    setIsViewAllOpen(false);

    fetch(`${process.env.REACT_APP_API_BASE_URL}/records/species/${speciesName}`)
      .then((response) => response.json())
      .then((data) => {
        const record: Record = data as Record;
        setSelectedRecord(record);
      })
      .catch((error) => {
        console.error("Error fetching species record:", error);
      });

    fetch(
      `${process.env.REACT_APP_DECANET_API_BASE_URL}/AphiaIDByName/${speciesName}?marine_only=false&extant_only=true`
    )
      .then((response) => response.json())
      .then((data) => {
        const speciesCode = Number(data);

        if (!Number.isFinite(speciesCode) || speciesCode <= 0) {
          throw new Error(`Invalid DECANET AphiaID: ${data}`);
        }

        setSelectedSpeciesCode(speciesCode);
        console.log("DECANET AphiaID:", speciesCode);
      })
      .catch((error) => {
        console.error("Error fetching AphiaID from DECANET:", error);
        setSelectedSpeciesCode(undefined);
      });

    fetch(`${process.env.REACT_APP_API_BASE_URL}/records/species/${speciesName}/locations`)
      .then((response) => response.json())
      .then((data) => {
        const locations: GeoLocation[] = data as GeoLocation[];
        setSelectedSpeciesLocations([...locations]);
      })
      .catch((error) => {
        console.error("Error fetching species locations:", error);
      });

    fetch(`${process.env.REACT_APP_API_BASE_URL}/species/confirmation/${speciesName}`)
      .then((response) => {
        if (response.status === 201) {
          setConfirmedSpeciesDirectory(true);

          fetch(`${process.env.REACT_APP_API_BASE_URL}/species/geolocations/${speciesName}`)
            .then((response) => response.json())
            .then((data) => {
              setAOOObject(data["AOO"] ?? null);
              setBasinObject(data["basins"] ?? null);
              setEOOObject(data["EOO"] ?? null);
            })
            .catch((error) => {
              console.error("Error fetching species geolocations geojsons:", error);
            });
        } else {
          setConfirmedSpeciesDirectory(false);
        }
      })
      .catch((error) => {
        console.error("Error confirming species directory:", error);
        setConfirmedSpeciesDirectory(false);
      });

    fetch(`${process.env.REACT_APP_API_BASE_URL}/species/narrative/${speciesName}`)
      .then((response) => response.json())
      .then((data) => {
        const speciesNarrative: Narrative = data as Narrative;
        setNarrative(speciesNarrative);
      })
      .catch((error) => {
        console.error("Error fetching species narrative:", error);
      });
  }, [speciesName]);

  // ------------------- WoRMS citation + taxonomy from DECANET AphiaID -------------------

  useEffect(() => {
    if (!selectedSpeciesCode) return;

    fetch(`${process.env.REACT_APP_API_BASE_URL}/AphiaRecordByAphiaID/${selectedSpeciesCode}`)
      .then((response) => response.json())
      .then((data) => {
        const citation = new Citation(
          Number(data.aphia_id) || 0,
          "taxonomy source",
          data.authority ?? "",
          data.url ??
            `https://www.marinespecies.org/aphia.php?p=taxdetails&id=${selectedSpeciesCode}`,
          ""
        );

        setSelectedSpeciesCitation(citation);
        console.log("Citation from AphiaRecordByAphiaID:", citation);
      })
      .catch((error) => {
        console.error("Error fetching AphiaRecordByAphiaID:", error);
        setSelectedSpeciesCitation(undefined);
      });

    fetch(`${process.env.REACT_APP_API_BASE_URL}/AphiaClassificationByAphiaID/${selectedSpeciesCode}`)
      .then((response) => response.json())
      .then((data) => {
        const names = extractScientificNames(data);
        setSelectedSpeciesTaxonomy(names);
        console.log("Extracted taxonomy:", names);
      })
      .catch((error) => {
        console.error("Error fetching taxonomy:", error);
        setSelectedSpeciesTaxonomy([]);
      });
  }, [selectedSpeciesCode]);

  // ------------------- IUCN from species name -------------------

  useEffect(() => {
    if (!speciesName) return;

    const [genusName, speciesEpithet] = speciesName.trim().split(/\s+/);

    if (!genusName || !speciesEpithet) {
      setSelectedSpeciesEndangermentLevel(undefined);
      return;
    }

    setSelectedSpeciesEndangermentLevel(undefined);

    fetch(
      `${process.env.REACT_APP_API_BASE_URL}/iucn/taxa?genus=${encodeURIComponent(
        genusName
      )}&species=${encodeURIComponent(speciesEpithet)}`
    )
      .then((response) => response.json())
      .then((data) => {
        const assessment: Assessment = data as Assessment;

        if (assessment?.danger_level) {
          setSelectedSpeciesEndangermentLevel(assessment.danger_level);
        } else {
          setSelectedSpeciesEndangermentLevel(undefined);
        }
      })
      .catch((error) => {
        console.error("Error fetching IUCN assessment:", error);
        setSelectedSpeciesEndangermentLevel(undefined);
      });
  }, [speciesName]);

  const downloadBibliographyFile = (format: string) => {
    const url = `${process.env.REACT_APP_API_BASE_URL}/species/bibliography/${speciesName}/${format}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="record-page dashboard right-side">
      {speciesName && (
        <header className="card">
          <h1 className="species-title">
            {speciesName}

            {selectedSpeciesCitation?.url && (
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
            )}
          </h1>

          {selectedSpeciesCitation?.reference && (
            <p className="subtitle">{selectedSpeciesCitation.reference}</p>
          )}

          {selectedSpeciesCitation?.doi && (
            <p className="subtitle">{selectedSpeciesCitation.doi}</p>
          )}
        </header>
      )}

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

      <section className="map-only">
        <MapComponent
          points={selectedSpeciesLocations}
          AOOObject={AOOObject}
          BasinObject={BasinObject}
          EOOObject={EOOObject}
        />
      </section>

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

      {speciesName && (
        <section className="card">
          <h2>Species Exposure Bundle manifest</h2>

          <p className="subtitle">
            AI-readable manifest for programmatic access to species resources.
          </p>

          <div className="button-row">
            <button className="btn-modern" onClick={copySebManifestLink}>
              {sebLinkCopied ? "Copied link ✔" : "Copy manifest link"}
            </button>

            <a
              className="btn-modern"
              href={sebManifestDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open / Download manifest
            </a>
          </div>
        </section>
      )}
    </div>
  );
}

export default RecordDetails;