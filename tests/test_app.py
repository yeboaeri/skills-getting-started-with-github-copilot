from copy import deepcopy
import pytest
from fastapi.testclient import TestClient

import src.app as app_module


@pytest.fixture()
def client():
    # Snapshot and restore global activities to keep tests isolated
    original = deepcopy(app_module.activities)
    client = TestClient(app_module.app)
    try:
        yield client
    finally:
        app_module.activities.clear()
        app_module.activities.update(original)


def test_get_activities(client):
    r = client.get("/activities")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data
    assert "participants" in data["Chess Club"]


def test_signup_and_duplicate(client):
    activity = "Swimming Club"
    email = "tester@mergington.edu"

    # Signup should succeed
    r = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert r.status_code == 200
    assert email in r.json().get("message", "")

    # Now the participant should appear in the activity
    r = client.get("/activities")
    participants = r.json()[activity]["participants"]
    assert email in participants

    # Duplicate signup should fail
    r = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert r.status_code == 400
    assert r.json().get("detail") == "Student already signed up for this activity"


def test_signup_nonexistent_activity(client):
    r = client.post("/activities/NoSuchActivity/signup", params={"email": "a@b.c"})
    assert r.status_code == 404


def test_remove_participant(client):
    activity = "Chess Club"
    email = "michael@mergington.edu"

    # Ensure participant exists initially
    r = client.get("/activities")
    assert email in r.json()[activity]["participants"]

    # Remove the participant
    r = client.delete(f"/activities/{activity}/participants", params={"email": email})
    assert r.status_code == 200
    assert email in r.json().get("message", "")

    # Participant should no longer be present
    r = client.get("/activities")
    assert email not in r.json()[activity]["participants"]


def test_remove_nonexistent_participant(client):
    activity = "Swimming Club"
    email = "notfound@mergington.edu"

    r = client.delete(f"/activities/{activity}/participants", params={"email": email})
    assert r.status_code == 404
    assert r.json().get("detail") == "Participant not found for this activity"


def test_remove_nonexistent_activity(client):
    r = client.delete("/activities/NoSuchActivity/participants", params={"email": "x@y.z"})
    assert r.status_code == 404
    assert r.json().get("detail") == "Activity not found"
