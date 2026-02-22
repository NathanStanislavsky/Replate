"""
FastAPI app: MongoDB (Motor), 2dsphere index on listings.location, CORS.
Run: uvicorn main:app --reload --port 5001
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import get_db, ensure_indexes
from routers import listings, orders, business, donations, simulation


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = get_db()
    await ensure_indexes(db)
    if await db.businesses.count_documents({}) == 0:
        await db.businesses.insert_one({"name": "Demo Restaurant", "business_code": "DEMO"})
    yield


app = FastAPI(title="Replate API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(listings.router)
app.include_router(orders.router)
app.include_router(business.router)
app.include_router(donations.router)
app.include_router(simulation.router)


@app.get("/")
async def root():
    return {"message": "Replate API", "docs": "/docs"}
