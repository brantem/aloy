from fastapi import APIRouter, Depends

from routes.v1 import comments, pins, users

from ..deps import get_app_id

router = APIRouter(prefix="/v1", dependencies=[Depends(get_app_id)])
router.include_router(users.router)
router.include_router(pins.router)
router.include_router(comments.router)
