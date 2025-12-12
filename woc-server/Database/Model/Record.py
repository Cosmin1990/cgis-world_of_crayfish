# coding: utf-8
from sqlalchemy import Column, String, Float, Integer, DateTime, Enum, text, Text
from sqlalchemy.dialects.mysql import INTEGER, TINYINT


from Database.DBConnection import db


Base = db.Model


class Record(Base):
    __tablename__ = "Record"
    
    id = Column(INTEGER(11), primary_key=True)
    
    woc_id = Column(String(255), unique=True, nullable=False)
    
    # Navy blue columns
    doi = Column(String(255), nullable=True)
    url = Column(Text, nullable=True)
    citation = Column(Text, nullable=True)
    
    # Orange columns
    coord_x = Column(Float, nullable=False)
    coord_y = Column(Float, nullable=False)
    accuracy = Column(Enum('High', 'Medium', 'Low'), nullable=False, server_default=text("'High'"))
    
    # Green olumns
    crayfish_scientific_name = Column(String(255), nullable=False)
    # status = Column(Enum('Native', 'Alien', 'Introduced'), nullable=False, server_default=text("'Native'"))
    status = Column(String(255), nullable=False)
    year_of_record = Column(Integer, nullable=False)
    ncbi_coi_accession_code = Column(String(255), nullable=True)
    ncbi_16s_accession_code = Column(String(255), nullable=True)
    ncbi_sra_accession_code = Column(String(255), nullable=True)
    claim_extinction = Column(String(255), nullable=True)
    
    # Red columns
    pathogen_symbiont_scientific_name = Column(String(255), nullable=True)
    pathogen_ncbi_coi_accession_code = Column(String(255), nullable=True)
    pathogen_ncbi_16s_accession_code = Column(String(255), nullable=True)
    pathogen_genotype_group = Column(String(255), nullable=True)
    pathogen_haplotype = Column(String(255), nullable=True)
    pathogen_year_of_record = Column(Integer, nullable=True)
    
    # Blue columns
    comments = Column(Text, nullable=True)
    confidentialiaty_level = Column(Enum('0', '1'), server_default=text("'0'"))
    contributor = Column(String(255), nullable=False)
    
    created_on = Column(DateTime, server_default=text("current_timestamp()"))
    
    
    def get_record_id(self):
        return self.id