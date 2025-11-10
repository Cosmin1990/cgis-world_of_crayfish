from typing import Optional, List
from enum import Enum

from pydantic import BaseModel, Field, field_validator
from pydantic.networks import EmailStr

from Database.Schema.PaginatedResponseSchema import PaginatedResponse
from Database.Model.User import User


# Define an enumeration for roles
class UserRole(str, Enum):
    admin = 'admin'
    specialist = 'specialist'
    visitor = 'visitor'
    
    
class UserSchema(BaseModel):
    username: str = Field(..., min_length=6, max_length=255)
    email: EmailStr
    affiliation: Optional[str] = Field(None, max_length=255)
    role: UserRole
    
    class Config:
        from_attributes = True
    
    # @field_validator('username')
    # def check_username_unique(cls, username):
    #     existing_user = User.query.filter_by(username=username).first()
    #     if existing_user:
    #         raise ValueError("Username is already taken.")
    #     return username

    # @field_validator('email')
    # def check_email_unique(cls, email):
    #     existing_user = User.query.filter_by(email=email).first()
    #     if existing_user:
    #         raise ValueError("Email is already taken.")
    #     return email


class UserInDTO(UserSchema):
    password: str = Field(..., min_length=10, max_length=255)
    pass


class UserOutDTO(UserSchema):
    id: int
    username: str
    email: EmailStr
    affiliation: Optional[str] = None
    role: UserRole

    class Config:
        from_attributes = True


class UserPaginatedDTO(PaginatedResponse):
    items: List[UserOutDTO]
    pass