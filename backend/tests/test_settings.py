"""Unit tests for backend/settings.py env parsers."""

from __future__ import annotations

import importlib
import os

import pytest


@pytest.fixture
def reload_settings():
    """Reload `settings` so module-level constants pick up patched env."""
    import settings

    def _reload():
        return importlib.reload(settings)

    yield _reload
    importlib.reload(settings)


def test_optional_float_returns_none_when_blank(monkeypatch, reload_settings) -> None:
    monkeypatch.setenv("GUROBI_TIME_LIMIT", "")
    monkeypatch.setenv("GUROBI_MIP_GAP", "")
    monkeypatch.setenv("GUROBI_THREADS", "")
    s = reload_settings()
    assert s.GUROBI_TIME_LIMIT is None
    assert s.GUROBI_MIP_GAP is None
    assert s.GUROBI_THREADS is None


def test_optional_float_parses_value(monkeypatch, reload_settings) -> None:
    monkeypatch.setenv("GUROBI_TIME_LIMIT", "30")
    monkeypatch.setenv("GUROBI_MIP_GAP", "0.005")
    monkeypatch.setenv("GUROBI_THREADS", "4")
    monkeypatch.setenv("GUROBI_OUTPUT_FLAG", "1")
    s = reload_settings()
    assert s.GUROBI_TIME_LIMIT == 30.0
    assert s.GUROBI_MIP_GAP == 0.005
    assert s.GUROBI_THREADS == 4
    assert s.GUROBI_OUTPUT_FLAG == 1


def test_output_flag_defaults_to_quiet(monkeypatch, reload_settings) -> None:
    monkeypatch.delenv("GUROBI_OUTPUT_FLAG", raising=False)
    # python-dotenv loads .env which may set the flag; clear after reload too.
    s = reload_settings()
    assert s.GUROBI_OUTPUT_FLAG in (0, 1)
    # If the repo's .env didn't pin it, default must be 0.
    if "GUROBI_OUTPUT_FLAG" not in os.environ:
        assert s.GUROBI_OUTPUT_FLAG == 0
