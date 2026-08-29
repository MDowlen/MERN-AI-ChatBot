from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException
from forge_incident.models import IncidentInput
from forge_incident.runner import run_incident
from pydantic import ValidationError

os.environ.setdefault("FORGE_CONTEXT_STATE_DIR", "/tmp/.forge-context")

app = FastAPI(title="Nexa ForgeIncident Adapter", version="1.0")


@app.get("/")
def status() -> dict:
    return {
        "status": "ok",
        "specialist": "forge-incident",
        "contract": "IncidentInput -> IncidentReport",
    }


@app.post("/")
def analyze(payload: dict) -> dict:
    try:
        incident = IncidentInput.model_validate(payload)
        report = run_incident(incident)
        return report.model_dump(mode="json")
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Incident specialist failed safely") from exc
