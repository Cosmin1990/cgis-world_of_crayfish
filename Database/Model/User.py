# coding: utf-8
from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, text
from sqlalchemy.dialects.mysql import INTEGER, TINYINT


from Database.DBConnection import db


Base = db.Model


class User(Base):
    __tablename__ = "User"
    
    id = Column(INTEGER(11), primary_key=True)
    username = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    salt = Column(String(255), nullable=True)
    email = Column(String(255), unique=True, nullable=False)
    affiliation = Column(String(255))
    role = Column(Enum('visitor', 'specialist', 'admin'), server_default=text("'visitor'"))
    created_on = Column(DateTime, server_default=text("current_timestamp()"))
    
    
    def get_user_id(self):
        return self.id