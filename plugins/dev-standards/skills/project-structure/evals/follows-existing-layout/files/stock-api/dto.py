from pydantic import BaseModel


class ItemIn(BaseModel):
    sku: str
    name: str
    quantity: int = 0
    warehouse_id: int


class ItemOut(ItemIn):
    id: int

    class Config:
        orm_mode = True


class WarehouseIn(BaseModel):
    name: str
    location: str | None = None


class WarehouseOut(WarehouseIn):
    id: int

    class Config:
        orm_mode = True
