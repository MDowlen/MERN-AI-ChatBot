from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, HTTPException, Query
from forge_incident.models import IncidentInput
from forge_incident.runner import run_incident
from pydantic import ValidationError

os.environ.setdefault("FORGE_CONTEXT_STATE_DIR", "/tmp/.forge-context")

app = FastAPI(title="Nexa ForgeIncident Adapter", version="1.0")


def _status_payload() -> dict:
    return {
        "status": "ok",
        "specialist": "forge-incident",
        "contract": "IncidentInput -> IncidentReport",
        "runtime": "python",
        "context_mode": "signal-only unless ForgeContext extra is installed",
    }


def _demo_incident() -> IncidentInput:
    start = datetime.now(timezone.utc) - timedelta(minutes=8)
    return IncidentInput.model_validate(
        {
            "incident_id": "nexa-demo-deployment-regression",
            "title": "Checkout errors after deployment",
            "repo_path": ".",
            "signals": [
                {
                    "kind": "deployment",
                    "timestamp": start.isoformat(),
                    "service": "checkout-api",
                    "message": "Deployment release-2026.08.29 completed",
                    "source": "vercel",
                },
                {
                    "kind": "metric",
                    "timestamp": (start + timedelta(minutes=2)).isoformat(),
                    "service": "checkout-api",
                    "message": "HTTP 5xx rate increased",
                    "value": 18.4,
                    "unit": "percent",
                    "source": "metrics",
                },
                {
                    "kind": "log",
                    "timestamp": (start + timedelta(minutes=3)).isoformat(),
                    "service": "checkout-api",
                    "message": "Timeout while calling payment dependency",
                    "source": "application-log",
                },
                {
                    "kind": "alert",
                    "timestamp": (start + timedelta(minutes=4)).isoformat(),
                    "service": "checkout-api",
                    "message": "Error budget burn alert triggered",
                    "source": "alerting",
                },
            ],
        }
    )


def _analyze_payload(payload: dict) -> dict:
    try:
        incident = IncidentInput.model_validate(payload)
        report = run_incident(incident)
        return report.model_dump(mode="json")
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Incident specialist failed safely") from exc


@app.get("/")
@app.get("/api/incident")
def status(demo: bool = Query(default=False)) -> dict:
    if demo:
        return run_incident(_demo_incident()).model_dump(mode="json")
    return _status_payload()


@app.post("/")
@app.post("/api/incident")
def analyze(payload: dict) -> dict:
    return _analyze_payload(payload)
