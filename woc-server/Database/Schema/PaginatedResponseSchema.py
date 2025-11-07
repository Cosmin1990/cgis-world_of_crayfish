from typing import Union

from pydantic import BaseModel


class PaginatedResponse(BaseModel):
    #items: List
    total: Union[int, None]
    page: Union[int, None]
    pages: Union[int, None]
    per_page: Union[int, None]
    next_page: Union[int, None]
    prev_page: Union[int, None]

    def dict(self, **kwargs):
        d = super().dict(**kwargs)
        return d