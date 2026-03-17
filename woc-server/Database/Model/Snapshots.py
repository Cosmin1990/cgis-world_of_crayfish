from datetime import datetime

from sqlalchemy import Column, String, Integer, text, DateTime, Date
from Database.DBConnection import db
from sqlalchemy.orm import relationship

Base = db.Model
class Snapshots(Base):
    __tablename__ = "Snapshots"

    id = Column(Integer, primary_key=True)
    snapshot_name = Column(String(255), nullable=False)
    snapshot_date = Column(Date, server_default=text("current_timestamp()"))

    species_snapshots = relationship(
        "SpeciesSnapshots",
        back_populates="snapshot",
        cascade="all, delete-orphan"
    )

    def get_snapshot_id(self):
        return self.id

    def toSerializableObject(self):
        return {
            "id": self.id,
            "name": self.snapshot_name
        }