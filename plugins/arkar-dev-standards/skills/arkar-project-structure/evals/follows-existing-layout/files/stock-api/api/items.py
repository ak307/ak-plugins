from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from crud import items as crud
from db import get_db
from dto import ItemIn, ItemOut

router = APIRouter(prefix="/items", tags=["items"])


@router.get("/", response_model=list[ItemOut])
def list_items(db: Session = Depends(get_db)):
    return crud.get_items(db)


@router.get("/{item_id}", response_model=ItemOut)
def read_item(item_id: int, db: Session = Depends(get_db)):
    item = crud.get_item(db, item_id)
    if not item:
        raise HTTPException(404, "Item not found")
    return item


@router.post("/", response_model=ItemOut)
def create_item(data: ItemIn, db: Session = Depends(get_db)):
    return crud.add_item(db, data)


@router.delete("/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)):
    if not crud.remove_item(db, item_id):
        raise HTTPException(404, "Item not found")
    return {"deleted": item_id}
