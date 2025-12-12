from typing import Optional, List
from enum import Enum

from pydantic import BaseModel, Field, field_validator

from Database.Schema.PaginatedResponseSchema import PaginatedResponse
from Database.Model.Record import Record


# Define an enumeration for accuracy types
class RecordAccuracy(str, Enum):
    high = 'High'
    medium = 'Medium'
    low = 'Low'
    
class ConfidentialityLevel(str, Enum):
    _0 = '0'
    _1 = '1'
    
    
class RecordSchema(BaseModel):
    woc_id: str = Field(..., min_length=5, max_length=255)
    
    doi: Optional[str] = Field(None, max_length=255)
    # url: Optional[str] = Field(None)
    url: Optional[str] = Field(None, max_length=65535)
    citation: Optional[str] = Field(None)
    
    coord_x: float = Field(..., ge=-90, le=90)
    coord_y: float = Field(..., ge=-180, le=180)

    accuracy: RecordAccuracy
    
    crayfish_scientific_name: str = Field(..., min_length=5, max_length=255)
    status: str = Field(..., min_length=4, max_length=255)
    year_of_record: int = Field(..., ge=1700)
    ncbi_coi_accession_code: Optional[str] = Field(None, max_length=255)
    ncbi_16s_accession_code: Optional[str] = Field(None, max_length=255)
    ncbi_sra_accession_code: Optional[str] = Field(None, max_length=255)
    claim_extinction: Optional[str] = Field(None, max_length=255)

    pathogen_symbiont_scientific_name: Optional[str] = Field(None, max_length=255)
    pathogen_ncbi_coi_accession_code: Optional[str] = Field(None, max_length=255)
    pathogen_ncbi_16s_accession_code: Optional[str] = Field(None, max_length=255)
    pathogen_genotype_group: Optional[str] = Field(None, max_length=255)
    pathogen_haplotype: Optional[str] = Field(None, max_length=255)
    pathogen_year_of_record: Optional[int] = Field(None, ge=1700)

    comments: Optional[str] = Field(None)
    confidentialiaty_level: ConfidentialityLevel
    contributor: Optional[str] = Field(None, max_length=255)
    
    class Config:
        from_attributes = True


class RecordLocationOutDTO(BaseModel):
    latitude: float
    longitude: float

    class Config:
        from_attributes = True


class RecordOutDTO(BaseModel):
    id: int
    woc_id: str
    doi: Optional[str]
    url: Optional[str]
    citation: Optional[str]
    coord_x: float
    coord_y: float
    accuracy: RecordAccuracy
    crayfish_scientific_name: str
    status: str
    year_of_record: int
    ncbi_coi_accession_code: Optional[str]
    ncbi_16s_accession_code: Optional[str]
    ncbi_sra_accession_code: Optional[str]
    claim_extinction: Optional[str]
    pathogen_symbiont_scientific_name: Optional[str]
    pathogen_ncbi_coi_accession_code: Optional[str]
    pathogen_ncbi_16s_accession_code: Optional[str]
    pathogen_genotype_group: Optional[str]
    pathogen_haplotype: Optional[str]
    pathogen_year_of_record: Optional[int]
    comments: Optional[str]
    confidentialiaty_level: ConfidentialityLevel
    contributor: Optional[str]

    class Config:
        from_attributes = True