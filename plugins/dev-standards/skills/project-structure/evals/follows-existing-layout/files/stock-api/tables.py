from sqlalchemy import Column, ForeignKey, Integer, String

from db import Base


class Warehouse(Base):
    __tablename__ = "warehouses"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    location = Column(String(200))


class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True)
    sku = Column(String(50), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    quantity = Column(Integer, default=0)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"))
