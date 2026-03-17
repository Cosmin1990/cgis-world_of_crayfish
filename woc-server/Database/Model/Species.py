from sqlalchemy import Column, String, Integer
from Database.DBConnection import db
from sqlalchemy.orm import relationship

Base = db.Model


class Species(Base):
    __tablename__ = "Species"

    id = Column(Integer, primary_key=True)
    species_name = Column(String(255), nullable=False)

    species_snapshots = relationship(
        "SpeciesSnapshots",
        back_populates="species",
        cascade="all, delete-orphan"
    )

    def get_species_id(self):
        return self.id

    def toSerializableObject(self):
        return {"name": self.species_name}