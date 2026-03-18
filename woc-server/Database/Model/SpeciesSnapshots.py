from sqlalchemy import Column, String, Integer, ForeignKey
from Database.DBConnection import db
from sqlalchemy.orm import relationship

Base = db.Model
class SpeciesSnapshots(Base):
    __tablename__ = "SpeciesSnapshots"

    species_id = Column(Integer, ForeignKey("Species.id"), primary_key=True)
    snapshot_id = Column(Integer, ForeignKey("Snapshots.id"), primary_key=True)
    indigenous_aoo = Column(Integer, nullable=True)
    indigenous_records = Column(Integer, nullable=True)
    non_indigenous_aoo = Column(Integer, nullable=True)
    non_indigenous_records = Column(Integer, nullable=True)

    species = relationship("Species", back_populates="species_snapshots")
    snapshot = relationship("Snapshots", back_populates="species_snapshots")
