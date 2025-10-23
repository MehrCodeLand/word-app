from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from api import router
import uvicorn

app = FastAPI(
    title="Word Learning App",
    description="API for learning words with 7-day practice system",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Include routers
app.include_router(router, prefix="/api/v1", tags=["words"])

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/")
def root():
    return {
        "message": "Word Learning App API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
