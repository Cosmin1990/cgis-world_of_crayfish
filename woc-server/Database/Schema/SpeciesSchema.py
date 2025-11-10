from typing import Optional
from pydantic import BaseModel, Field
from Database.Schema.PaginatedResponseSchema import PaginatedResponse


class SpeciesSchema(BaseModel):
    species_name: str = Field(..., max_length=255)
    official_id: int

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