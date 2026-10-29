from sqlalchemy.orm import Session

from dto import ItemIn
from tables import Item


def get_items(db: Session):
    return db.query(Item).all()


def get_item(db: Session, item_id: int):
    return db.query(Item).filter(Item.id == item_id).first()


def add_item(db: Session, data: ItemIn):
    item = Item(**data.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def remove_item(db: Session, item_id: int):
    item = get_item(db, item_id)
    if item:
        db.delete(item)
        db.commit()
    return item
