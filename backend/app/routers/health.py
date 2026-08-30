from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health")
def get_health():
    return {
        "status": "ok",
        "app": "INTENTLOCK API",
        "phase": 1
    }
