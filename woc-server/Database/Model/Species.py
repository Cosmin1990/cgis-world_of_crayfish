from sqlalchemy import Column, String, Integer
from Database.DBConnection import db

Base = db.Model


class Species(Base):
    __tablename__ = "Species"

    id = Column(Integer, primary_key=True)
    species_name = Column(String(255), nullable=False)
    official_id = Column(Integer(), nullable=True)

    def get_species_id(self):
        return self.id

    def toSerializableObject(self):
        return {"name": self.species_name, "id": self.official_id}