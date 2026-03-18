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

type SpeciesSnapshot = {
  snapshot_id: number;
  snapshot_name: string;
  snapshot_date?: string | null;
  indigenous_aoo?: number | null;
  non_indigenous_aoo?: number | null;
  indigenous_records?: number | null;
  non_indigenous_records?: number | null;
};

type SpeciesSnapshotsResponse = {
  species_id: number;
  species_name: string;
  snapshots: SpeciesSnapshot[];
};

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

  const [speciesSnapshots, setSpeciesSnapshots] = useState<SpeciesSnapshot[]>([]);
  const [selectedSnapshotIndex, setSelectedSnapshotIndex] = useState(0);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);

  const encodedSpeciesName = encodeURIComponent(speciesName ?? "");

  const activeSnapshot =
    speciesSnapshots.length > 0
      ? speciesSnapshots[Math.min(selectedSnapshotIndex, speciesSnapshots.length - 1)]
      : null;

  const activeSnapshotId = activeSnapshot?.snapshot_id;

  const snapshotQueryParam = activeSnapshotId ? `?snapshot_id=${activeSnapshotId}` : "";

  const sebManifestUrl = `${process.env.REACT_APP_API_BASE_URL}/species/manifest2/${encodedSpeciesName}${snapshotQueryParam}`;
  const sebManifestDownloadUrl = `${process.env.REACT_APP_API_BASE_URL}/species/manifest/${encodedSpeciesName}${snapshotQueryParam}`;

  const CHANGE_THRESHOLD_PERCENT = 5;

  const hasIndigenousSnapshots = speciesSnapshots.some(
    (snapshot) => (snapshot.indigenous_aoo ?? 0) !== 0
  );

  const hasNonIndigenousSnapshots = speciesSnapshots.some(
    (snapshot) => (snapshot.non_indigenous_aoo ?? 0) !== 0
  );

  const activeIndigenousValue =
    activeSnapshot && (activeSnapshot.indigenous_aoo ?? 0) !== 0
      ? activeSnapshot.indigenous_aoo
      : null;

  const activeNonIndigenousValue =
    activeSnapshot && (activeSnapshot.non_indigenous_aoo ?? 0) !== 0
      ? activeSnapshot.non_indigenous_aoo
      : null;

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

  const formatSnapshotDate = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
  };

  const getDeltaPercent = (
    currentValue?: number | null,
    previousValue?: number | null
  ): number | null => {
    if (currentValue == null || previousValue == null) return null;

    if (previousValue === 0) {
      if (currentValue === 0) return 0;
      return null;
    }

    return ((currentValue - previousValue) / previousValue) * 100;
  };

  const getIndigenousTileStatus = (index: number) => {
    if (index === 0) return "stable";

    const current = speciesSnapshots[index];
    const previous = speciesSnapshots[index - 1];
    const delta = getDeltaPercent(current?.indigenous_aoo, previous?.indigenous_aoo);

    if (delta == null) return "stable";
    if (delta >= CHANGE_THRESHOLD_PERCENT) return "increase";
    if (delta <= -CHANGE_THRESHOLD_PERCENT) return "decrease";
    return "stable";
  };

  const getNonIndigenousTileStatus = (index: number) => {
    if (index === 0) return "stable";

    const current = speciesSnapshots[index];
    const previous = speciesSnapshots[index - 1];
    const delta = getDeltaPercent(
      current?.non_indigenous_aoo,
      previous?.non_indigenous_aoo
    );

    if (delta == null) return "stable";
    if (delta >= CHANGE_THRESHOLD_PERCENT) return "increase";
    if (delta <= -CHANGE_THRESHOLD_PERCENT) return "decrease";
    return "stable";
  };

  const getIndigenousTileColor = (index: number) => {
    const status = getIndigenousTileStatus(index);
    if (status === "increase") return "#198754";
    if (status === "decrease") return "#dc3545";
    return "#0d6efd";
  };

  const getNonIndigenousTileColor = (index: number) => {
    const status = getNonIndigenousTileStatus(index);
    if (status === "increase") return "#dc3545";
    if (status === "decrease") return "#198754";
    return "#0d6efd";
  };

  const getIndigenousDeltaLabel = (index: number) => {
    if (index === 0) return "Stable";

    const current = speciesSnapshots[index];
    const previous = speciesSnapshots[index - 1];
    const delta = getDeltaPercent(current?.indigenous_aoo, previous?.indigenous_aoo);

    if (delta == null) return "Stable";
    if (delta >= CHANGE_THRESHOLD_PERCENT) return `Increase (${delta.toFixed(1)}%)`;
    if (delta <= -CHANGE_THRESHOLD_PERCENT) return `Decrease (${delta.toFixed(1)}%)`;
    return `Stable (${delta.toFixed(1)}%)`;
  };

  const getNonIndigenousDeltaLabel = (index: number) => {
    if (index === 0) return "Stable";

    const current = speciesSnapshots[index];
    const previous = speciesSnapshots[index - 1];
    const delta = getDeltaPercent(
      current?.non_indigenous_aoo,
      previous?.non_indigenous_aoo
    );

    if (delta == null) return "Stable";
    if (delta >= CHANGE_THRESHOLD_PERCENT) return `Increase (${delta.toFixed(1)}%)`;
    if (delta <= -CHANGE_THRESHOLD_PERCENT) return `Decrease (${delta.toFixed(1)}%)`;
    return `Stable (${delta.toFixed(1)}%)`;
  };

  const getIndigenousTooltip = (snapshot: SpeciesSnapshot, index: number) => {
  const parts = [
    snapshot.snapshot_name +
      (snapshot.snapshot_date ? ` (${formatSnapshotDate(snapshot.snapshot_date)})` : ""),
    getIndigenousDeltaLabel(index),
  ];

  if (snapshot.indigenous_aoo != null) {
    parts.push(`Indigenous AOO: ${snapshot.indigenous_aoo}`);
  }

  if (snapshot.indigenous_records != null) {
    parts.push(`Indigenous records: ${snapshot.indigenous_records}`);
  }

  return parts.join("\n");
};

const getNonIndigenousTooltip = (snapshot: SpeciesSnapshot, index: number) => {
  const parts = [
    snapshot.snapshot_name +
      (snapshot.snapshot_date ? ` (${formatSnapshotDate(snapshot.snapshot_date)})` : ""),
    getNonIndigenousDeltaLabel(index),
  ];

  if (snapshot.non_indigenous_aoo != null) {
    parts.push(`Non-indigenous AOO: ${snapshot.non_indigenous_aoo}`);
  }

  if (snapshot.non_indigenous_records != null) {
    parts.push(`Non-indigenous records: ${snapshot.non_indigenous_records}`);
  }

  return parts.join("\n");
};

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

    setSpeciesSnapshots([]);
    setSelectedSnapshotIndex(0);
    setSnapshotsLoading(true);

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
      })
      .catch((error) => {
        console.error("Error fetching AphiaID from DECANET:", error);
        setSelectedSpeciesCode(undefined);
      });

    fetch(`${process.env.REACT_APP_API_BASE_URL}/species/${speciesName}/snapshots`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch snapshots for ${speciesName}`);
        }
        return response.json();
      })
      .then((data: SpeciesSnapshotsResponse) => {
        const snapshots = data.snapshots ?? [];
        setSpeciesSnapshots(snapshots);
        setSelectedSnapshotIndex(snapshots.length > 0 ? snapshots.length - 1 : 0);
      })
      .catch((error) => {
        console.error("Error fetching species snapshots:", error);
        setSpeciesSnapshots([]);
      })
      .finally(() => {
        setSnapshotsLoading(false);
      });
  }, [speciesName]);

  useEffect(() => {
    if (!speciesName || !activeSnapshotId) return;

    setSelectedSpeciesLocations([]);
    setConfirmedSpeciesDirectory(false);
    setAOOObject(null);
    setBasinObject(null);
    setEOOObject(null);
    setNarrative(undefined);

    fetch(
      `${process.env.REACT_APP_API_BASE_URL}/records/species/${speciesName}/locations?snapshot_id=${activeSnapshotId}`
    )
      .then((response) => response.json())
      .then((data) => {
        const locations: GeoLocation[] = data as GeoLocation[];
        setSelectedSpeciesLocations([...locations]);
      })
      .catch((error) => {
        console.error("Error fetching species locations:", error);
      });

    fetch(
      `${process.env.REACT_APP_API_BASE_URL}/species/geolocations/${speciesName}?snapshot_id=${activeSnapshotId}`
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("No geolocations for selected snapshot");
        }
        return response.json();
      })
      .then((data) => {
        setConfirmedSpeciesDirectory(true);
        setAOOObject(data["AOO"] ?? null);
        setBasinObject(data["basins"] ?? null);
        setEOOObject(data["EOO"] ?? null);
      })
      .catch((error) => {
        console.error("Error fetching species geolocations geojsons:", error);
        setConfirmedSpeciesDirectory(false);
        setAOOObject(null);
        setBasinObject(null);
        setEOOObject(null);
      });

    fetch(
      `${process.env.REACT_APP_API_BASE_URL}/species/narrative/${speciesName}?snapshot_id=${activeSnapshotId}`
    )
      .then((response) => response.json())
      .then((data) => {
        const speciesNarrative: Narrative = data as Narrative;
        setNarrative(speciesNarrative);
      })
      .catch((error) => {
        console.error("Error fetching species narrative:", error);
      });
  }, [speciesName, activeSnapshotId]);

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
      })
      .catch((error) => {
        console.error("Error fetching AphiaRecordByAphiaID:", error);
        setSelectedSpeciesCitation(undefined);
      });

    fetch(
      `${process.env.REACT_APP_API_BASE_URL}/AphiaClassificationByAphiaID/${selectedSpeciesCode}`
    )
      .then((response) => response.json())
      .then((data) => {
        const names = extractScientificNames(data);
        setSelectedSpeciesTaxonomy(names);
      })
      .catch((error) => {
        console.error("Error fetching taxonomy:", error);
        setSelectedSpeciesTaxonomy([]);
      });
  }, [selectedSpeciesCode]);

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
    const url = `${process.env.REACT_APP_API_BASE_URL}/species/bibliography/${speciesName}/${format}${
      activeSnapshotId ? `?snapshot_id=${activeSnapshotId}` : ""
    }`;
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

          <div style={{ marginTop: "12px", textAlign: "left" }}>
            {snapshotsLoading && <p className="subtitle">Loading snapshots...</p>}

            {!snapshotsLoading && speciesSnapshots.length > 0 && activeSnapshot && (
              <>
                {hasIndigenousSnapshots && (
                  <div style={{ marginBottom: "14px" }}>
                    <div style={{ fontWeight: 600, marginBottom: "6px", color: "#198754" }}>
                      Indigenous timeline
                    </div>

                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {speciesSnapshots.map((snapshot, index) => {
                        if ((snapshot.indigenous_aoo ?? 0) === 0) return null;

                        const tileColor = getIndigenousTileColor(index);
                        const isSelected = index === selectedSnapshotIndex;

                        return (
                          <button
                            key={`indigenous-${snapshot.snapshot_id}`}
                            type="button"
                            onClick={() => setSelectedSnapshotIndex(index)}
                            title={getIndigenousTooltip(snapshot, index)}
                            style={{
                              width: "14px",
                              height: "14px",
                              border: isSelected
                                ? `2px solid ${tileColor}`
                                : `1px solid ${tileColor}`,
                              borderRadius: "2px",
                              backgroundColor: tileColor,
                              cursor: "pointer",
                              padding: 0,
                              opacity: isSelected ? 1 : 0.85,
                              boxShadow: isSelected
                                ? "0 0 0 2px rgba(0,0,0,0.15)"
                                : "none",
                            }}
                          />
                        );
                      })}
                    </div>

                    
                  </div>
                )}

                {hasNonIndigenousSnapshots && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: "6px", color: "#dc3545" }}>
                      Non-indigenous timeline
                    </div>

                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {speciesSnapshots.map((snapshot, index) => {
                        if ((snapshot.non_indigenous_aoo ?? 0) === 0) return null;

                        const tileColor = getNonIndigenousTileColor(index);
                        const isSelected = index === selectedSnapshotIndex;

                        return (
                          <button
                            key={`non-indigenous-${snapshot.snapshot_id}`}
                            type="button"
                            onClick={() => setSelectedSnapshotIndex(index)}
                            title={getNonIndigenousTooltip(snapshot, index)}
                            style={{
                              width: "14px",
                              height: "14px",
                              border: isSelected
                                ? `2px solid ${tileColor}`
                                : `1px solid ${tileColor}`,
                              borderRadius: "2px",
                              backgroundColor: tileColor,
                              cursor: "pointer",
                              padding: 0,
                              opacity: isSelected ? 1 : 0.85,
                              boxShadow: isSelected
                                ? "0 0 0 2px rgba(0,0,0,0.15)"
                                : "none",
                            }}
                          />
                        );
                      })}
                    </div>

                    
                  </div>
                )}

                <div style={{ marginTop: "10px", fontSize: "13px", color: "#666" }}>
                  <div>
                    <strong>Snapshot:</strong> {activeSnapshot.snapshot_name}
                  </div>
                  {activeSnapshot.snapshot_date && (
                    <div>
                      <strong>Date:</strong> {formatSnapshotDate(activeSnapshot.snapshot_date)}
                    </div>
                  )}
                </div>

                {(hasIndigenousSnapshots || hasNonIndigenousSnapshots) && (
                  <div
                    style={{
                      marginTop: "12px",
                      display: "flex",
                      gap: "16px",
                      flexWrap: "wrap",
                      fontSize: "13px",
                      color: "#555",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          backgroundColor: "#0d6efd",
                          display: "inline-block",
                          borderRadius: "2px",
                        }}
                      />
                      Stable
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          backgroundColor: "#198754",
                          display: "inline-block",
                          borderRadius: "2px",
                        }}
                      />
                      Increase / beneficial decrease
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          backgroundColor: "#dc3545",
                          display: "inline-block",
                          borderRadius: "2px",
                        }}
                      />
                      Decrease / harmful increase
                    </div>
                  </div>
                )}
              </>
            )}

            {!snapshotsLoading && speciesSnapshots.length === 0 && (
              <p className="subtitle">No snapshots available.</p>
            )}
          </div>
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
          key={activeSnapshotId ?? "no-snapshot"}
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
            href={`${process.env.REACT_APP_API_BASE_URL}/species/archive/${speciesName}${
              activeSnapshotId ? `?snapshot_id=${activeSnapshotId}` : ""
            }`}
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