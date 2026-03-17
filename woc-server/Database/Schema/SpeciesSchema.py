from datetime import date
from typing import Optional
from pydantic import BaseModel, Field
from Database.Schema.PaginatedResponseSchema import PaginatedResponse


class SpeciesSchema(BaseModel):
    species_name: str = Field(..., max_length=255)

    class Config:
        from_attributes = True


class SpeciesInDTO(SpeciesSchema):
    pass


class SpeciesOutDTO(SpeciesSchema):
    id: int

    class Config:
        from_attributes = True


class SpeciesPaginatedDTO(PaginatedResponse):
    items: list[SpeciesOutDTO]
    pass


class SpeciesSnapshotItemDTO(BaseModel):
    snapshot_id: int
    snapshot_name: str
    snapshot_date: Optional[date] = None
    indigenous_aoo: Optional[int] = None
    non_indigenous_aoo: Optional[int] = None

    class Config:
        from_attributes = True


class SpeciesSnapshotsOutDTO(BaseModel):
    species_id: int
    species_name: str
    snapshots: list[SpeciesSnapshotItemDTO]

    class Config:
        from_attributes = True