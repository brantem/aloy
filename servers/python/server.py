import os

from dotenv import load_dotenv
from fastapi import FastAPI, status
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from routes import v1

load_dotenv()


app = FastAPI(openapi_url=None, docs_url=None, redoc_url=None)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    is_missing_app_id = False
    is_missing_user_id = False
    for error in exc.errors():
        if error["type"] == "missing" and "aloy-app-id" in error["loc"]:
            is_missing_app_id = True
        elif error["type"] == "missing" and "aloy-user-id" in error["loc"]:
            is_missing_user_id = True

    if is_missing_app_id:
        return JSONResponse(content={"error": {"code": "MISSING_APP_ID"}}, status_code=status.HTTP_400_BAD_REQUEST)
    elif is_missing_user_id:
        return JSONResponse(content={"error": {"code": "MISSING_USER_ID"}}, status_code=status.HTTP_400_BAD_REQUEST)

    return await request_validation_exception_handler(request, exc)


app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOW_ORIGINS", "*").split(","),
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Aloy-App-ID", "Aloy-User-ID"],
    expose_headers=["X-Total-Count"],
)
app.add_middleware(GZipMiddleware)


app.include_router(v1.router)


@app.get("/health")
async def health():
    return "ok"
