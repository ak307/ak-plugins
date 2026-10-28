from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from crud import warehouses as crud
from db import get_db
from dto import WarehouseIn, WarehouseOut

router = APIRouter(prefix="/warehouses", tags=["warehouses"])


@router.get("/", response_model=list[WarehouseOut])
def list_warehouses(db: Session = Depends(get_db)):
    return crud.get_warehouses(db)


@router.post("/", response_model=WarehouseOut)
def create_warehouse(data: WarehouseIn, db: Session = Depends(get_db)):
    return crud.add_warehouse(db, data)
