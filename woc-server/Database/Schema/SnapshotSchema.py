from datetime import date
from pydantic import BaseModel, Field
from Database.Schema.PaginatedResponseSchema import PaginatedResponse


class SnapshotSchema(BaseModel):
    snapshot_name: str = Field(..., max_length=255)
    snapshot_date: date

    class Config:
        from_attributes = True


class SnapshotInDTO(SnapshotSchema):
    pass


class SnapshotOutDTO(SnapshotSchema):
    id: int

    class Config:
        from_attributes = True


class SnapshotPaginatedDTO(PaginatedResponse):
    items: list[SnapshotOutDTO]
    pass