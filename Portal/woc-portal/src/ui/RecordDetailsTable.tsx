

import React from "react";
import Record from "../model/Record";

interface RecordDetailsTableProps {
  selectedRecord: Record;
}

const RecordDetailsTable: React.FC<RecordDetailsTableProps> = ({ selectedRecord }) => {
  if (!selectedRecord) return null;

  const tableStyle: React.CSSProperties = {
    borderCollapse: "collapse",
    width: "80%",
    color: "black",
    border: "1px solid #ccc",
    backgroundColor: "white",
  };

  const cellStyle: React.CSSProperties = {
    padding: "4px 8px",
    border: "1px solid #ccc",
  };

  const labelCellStyle: React.CSSProperties = {
    ...cellStyle,
    backgroundColor: "#f0f0f0",
    fontWeight: "bold",
  };

  return (
    <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
      <table style={tableStyle}>
        <tbody>
          <tr><td style={labelCellStyle}>WOC ID:</td><td style={cellStyle}>{selectedRecord.woc_id}</td></tr>
          <tr><td style={labelCellStyle}>DOI:</td><td style={cellStyle}>{selectedRecord.doi}</td></tr>
          <tr><td style={labelCellStyle}>URL:</td><td style={cellStyle}>{selectedRecord.url}</td></tr>
          <tr><td style={labelCellStyle}>Citation:</td><td style={cellStyle}>{selectedRecord.citation}</td></tr>
          <tr><td style={labelCellStyle}>Coord X:</td><td style={cellStyle}>{selectedRecord.coord_x}</td></tr>
          <tr><td style={labelCellStyle}>Coord Y:</td><td style={cellStyle}>{selectedRecord.coord_y}</td></tr>
          <tr><td style={labelCellStyle}>Accuracy:</td><td style={cellStyle}>{selectedRecord.accuracy}</td></tr>
          <tr><td style={labelCellStyle}>Crayfish scientific name:</td><td style={cellStyle}>{selectedRecord.crayfish_scientific_name}</td></tr>
          <tr><td style={labelCellStyle}>Status:</td><td style={cellStyle}>{selectedRecord.status}</td></tr>
          <tr><td style={labelCellStyle}>Year of record:</td><td style={cellStyle}>{selectedRecord.year_of_record}</td></tr>
          <tr><td style={labelCellStyle}>NCBI COI Accession:</td><td style={cellStyle}>{selectedRecord.ncbi_coi_accession_code}</td></tr>
          <tr><td style={labelCellStyle}>NCBI 16S Accession:</td><td style={cellStyle}>{selectedRecord.ncbi_16s_accession_code}</td></tr>
          <tr><td style={labelCellStyle}>NCBI SRA Accession:</td><td style={cellStyle}>{selectedRecord.ncbi_sra_accession_code}</td></tr>
          <tr><td style={labelCellStyle}>Claim extinction:</td><td style={cellStyle}>{selectedRecord.claim_extinction}</td></tr>
        </tbody>
      </table>

      <table style={tableStyle}>
        <tbody>
          <tr><td style={labelCellStyle}>Pathogen symbiont name:</td><td style={cellStyle}>{selectedRecord.pathogen_symbiont_scientific_name}</td></tr>
          <tr><td style={labelCellStyle}>Pathogen NCBI COI:</td><td style={cellStyle}>{selectedRecord.pathogen_ncbi_coi_accession_code}</td></tr>
          <tr><td style={labelCellStyle}>Pathogen NCBI 16S:</td><td style={cellStyle}>{selectedRecord.pathogen_ncbi_16s_accession_code}</td></tr>
          <tr><td style={labelCellStyle}>Pathogen genotype group:</td><td style={cellStyle}>{selectedRecord.pathogen_genotype_group}</td></tr>
          <tr><td style={labelCellStyle}>Pathogen haplotype:</td><td style={cellStyle}>{selectedRecord.pathogen_haplotype}</td></tr>
          <tr><td style={labelCellStyle}>Pathogen year:</td><td style={cellStyle}>{selectedRecord.pathogen_year_of_record}</td></tr>
          <tr><td style={labelCellStyle}>Comments:</td><td style={cellStyle}>{selectedRecord.comments}</td></tr>
          <tr><td style={labelCellStyle}>Confidentiality level:</td><td style={cellStyle}>{selectedRecord.confidentialiaty_level}</td></tr>
          <tr><td style={labelCellStyle}>Contributor:</td><td style={cellStyle}>{selectedRecord.contributor}</td></tr>
        </tbody>
      </table>
    </div>
  );
};

export default RecordDetailsTable;