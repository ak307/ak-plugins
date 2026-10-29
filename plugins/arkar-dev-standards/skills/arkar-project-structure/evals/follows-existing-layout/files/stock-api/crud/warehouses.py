from sqlalchemy.orm import Session

from dto import WarehouseIn
from tables import Warehouse


def get_warehouses(db: Session):
    return db.query(Warehouse).all()


def add_warehouse(db: Session, data: WarehouseIn):
    warehouse = Warehouse(**data.dict())
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)
    return warehouse
