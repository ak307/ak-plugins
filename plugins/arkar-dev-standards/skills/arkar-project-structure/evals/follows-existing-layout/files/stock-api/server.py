from fastapi import FastAPI

from api import items, warehouses

app = FastAPI(title="Stock API")

app.include_router(items.router)
app.include_router(warehouses.router)
