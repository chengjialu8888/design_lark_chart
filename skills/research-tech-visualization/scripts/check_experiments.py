"""Validate declared experiment records without changing data or inferring statistics."""

from __future__ import annotations

import argparse
from collections import defaultdict
import hashlib
import json
import math
from pathlib import Path
import sys


def finite(value):
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        return False
    try:
        return math.isfinite(value)
    except OverflowError:
        return False


def reject_constant(token):
    raise ValueError(f"Non-finite JSON: {token}")


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"Duplicate JSON key: {key}")
        result[key] = value
    return result


def inspect(data):
    errors = []
    warnings = []
    counts = {"records": 0, "ok": 0, "unavailable": 0, "comparison_groups": 0}

    def result():
        return {"status": "failed" if errors else "needs_review" if warnings else "checks_passed",
                "errors": sorted(set(errors)), "warnings": sorted(set(warnings)), "counts": counts,
                "coverage": {"declared_contract": "checked", "source_fidelity": "not_run",
                             "undeclared_conditions": "not_run", "uncertainty_method": "not_run",
                             "significance": "not_run", "derived_claims": "not_run"}}

    if not isinstance(data, dict) or type(data.get("schema_version")) is not int or data["schema_version"] != 1:
        errors.append("SCHEMA_VERSION: expected object with schema_version=1")
        return result()
    metrics = data.get("metrics")
    records = data.get("records")
    if not isinstance(metrics, dict) or not metrics:
        errors.append("METRICS: expected non-empty object")
        return result()
    if not isinstance(records, list) or not records:
        errors.append("RECORDS: expected non-empty list")
        return result()
    for name, metric in metrics.items():
        if not isinstance(name, str) or not name or not isinstance(metric, dict):
            errors.append(f"METRIC_INVALID: {name}")
            continue
        if not isinstance(metric.get("unit"), str) or not metric["unit"].strip():
            errors.append(f"METRIC_UNIT_MISSING: {name}")
        if metric.get("direction") not in ("higher", "lower", "target", "unknown"):
            errors.append(f"METRIC_DIRECTION_INVALID: {name}")
        if metric.get("direction") == "unknown":
            warnings.append(f"DIRECTION_UNKNOWN: {name}; do not label a best result")
        for field in ("minimum", "maximum", "target"):
            if field in metric and not finite(metric[field]):
                errors.append(f"METRIC_BOUND_INVALID: {name}.{field}")
        if metric.get("direction") == "target" and not finite(metric.get("target")):
            errors.append(f"METRIC_TARGET_MISSING: {name}")
        if finite(metric.get("minimum")) and finite(metric.get("maximum")) and metric["minimum"] > metric["maximum"]:
            errors.append(f"METRIC_BOUNDS_REVERSED: {name}")

    keys = {}
    defaults = {"identity_keys": ["method", "dataset", "config", "metric", "statistic", "run"],
                "comparison_keys": [], "condition_keys": []}
    for field, default in defaults.items():
        value = data.get(field, default)
        if not isinstance(value, list) or any(not isinstance(key, str) or not key for key in value) or len(value) != len(set(value)):
            errors.append(f"KEYS_INVALID: {field}")
            keys[field] = []
        else:
            keys[field] = value
    if not keys["identity_keys"]:
        errors.append("IDENTITY_KEYS_EMPTY")
    if "method" in keys["comparison_keys"]:
        errors.append("COMPARISON_KEYS_INCLUDE_METHOD: groups must compare methods")
    if not keys["comparison_keys"]:
        warnings.append("COMPARABILITY_NOT_CHECKED: comparison_keys missing")
    if not keys["condition_keys"]:
        warnings.append("CONDITIONS_NOT_CHECKED: condition_keys missing")

    identities = set()
    groups = defaultdict(list)
    counts["records"] = len(records)
    for number, record in enumerate(records, 1):
        label = f"record {number}"
        if not isinstance(record, dict):
            errors.append(f"RECORD_INVALID: {label}")
            continue
        required = ("method", "dataset", "config", "metric", "unit", "statistic", "status", "source")
        for field in required:
            if not isinstance(record.get(field), str) or not record[field].strip():
                errors.append(f"REQUIRED_FIELD: {label}.{field}")
        if any(not isinstance(record.get(field), str) for field in required):
            continue
        metric = metrics.get(record["metric"])
        if not isinstance(metric, dict):
            errors.append(f"UNKNOWN_METRIC: {label}")
            continue
        if record["unit"] != metric.get("unit"):
            errors.append(f"UNIT_MISMATCH: {label}")
        statistic = record["statistic"]
        if statistic not in {"raw", "mean", "median", "best"}:
            errors.append(f"STATISTIC_INVALID: {label}")
        if statistic == "raw" and (not isinstance(record.get("run"), str) or not record["run"].strip()):
            errors.append(f"RUN_MISSING: {label}")
        if statistic != "raw" and record.get("run") is not None:
            errors.append(f"SUMMARY_HAS_RUN: {label}")
        status = record["status"]
        if status not in {"ok", "missing", "failed", "not_measured", "not_applicable"}:
            errors.append(f"STATUS_INVALID: {label}")
        value = record.get("value")
        if "value" not in record:
            errors.append(f"VALUE_MISSING: {label}; unavailable records must explicitly use null")
        if status == "ok":
            counts["ok"] += 1
            if not finite(value):
                errors.append(f"VALUE_NOT_FINITE: {label}")
            else:
                if finite(metric.get("minimum")) and value < metric["minimum"]:
                    errors.append(f"VALUE_BELOW_MINIMUM: {label}")
                if finite(metric.get("maximum")) and value > metric["maximum"]:
                    errors.append(f"VALUE_ABOVE_MAXIMUM: {label}")
        else:
            counts["unavailable"] += 1
            warnings.append(f"UNAVAILABLE_OBSERVATION: {label} ({status})")
            if value is not None:
                errors.append(f"UNAVAILABLE_VALUE_NOT_NULL: {label}")
        if "n" in record and (type(record["n"]) is not int or record["n"] < 1):
            errors.append(f"SAMPLE_COUNT_INVALID: {label}")
        if statistic != "raw" and status == "ok" and "n" not in record:
            warnings.append(f"SUMMARY_COUNT_UNKNOWN: {label}")
        uncertainty = record.get("uncertainty")
        if uncertainty is not None:
            if statistic == "raw" or status != "ok" or not isinstance(uncertainty, dict):
                errors.append(f"UNCERTAINTY_INVALID: {label}")
            else:
                low, high = uncertainty.get("low"), uncertainty.get("high")
                if uncertainty.get("kind") not in ("SD", "SE", "CI", "range"):
                    errors.append(f"UNCERTAINTY_KIND_INVALID: {label}")
                if not finite(low) or not finite(high) or low > high:
                    errors.append(f"UNCERTAINTY_BOUNDS_INVALID: {label}")
                elif finite(value) and not low <= value <= high:
                    warnings.append(f"ESTIMATE_OUTSIDE_INTERVAL: {label}; verify method")
                if "n" not in record or not isinstance(record.get("sample_unit"), str) or not record["sample_unit"].strip():
                    warnings.append(f"UNCERTAINTY_UNIT_OR_COUNT_UNKNOWN: {label}")
                if uncertainty.get("kind") == "CI":
                    if not finite(uncertainty.get("level")) or not 0 < uncertainty["level"] < 1:
                        errors.append(f"CI_LEVEL_INVALID: {label}; expected probability in (0,1)")
                    if not isinstance(uncertainty.get("method"), str) or not uncertainty["method"].strip():
                        warnings.append(f"CI_METHOD_UNKNOWN: {label}")

        key_valid = True
        for key in set(sum(keys.values(), [])):
            if key == "run" and statistic != "raw" and key not in record:
                continue
            item = record.get(key)
            if key not in record or item is None or isinstance(item, (dict, list, bool)) or (
                isinstance(item, (float, int)) and not finite(item)
            ) or (isinstance(item, str) and not item.strip()):
                errors.append(f"DIMENSION_INVALID: {label}.{key}")
                key_valid = False
        if key_valid:
            identity = tuple(record.get(key) for key in keys["identity_keys"])
            if identity in identities:
                errors.append(f"DUPLICATE_OBSERVATION: {label}")
            identities.add(identity)
            if keys["comparison_keys"]:
                groups[tuple(record.get(key) for key in keys["comparison_keys"])].append(record)

    counts["comparison_groups"] = len(groups)
    for group_number, observations in enumerate(groups.values(), 1):
        for key in keys["condition_keys"] + ["unit", "metric", "statistic"]:
            if len({record.get(key) for record in observations}) > 1:
                warnings.append(f"MIXED_COMPARISON_CONDITION: group {group_number}, {key}")
    return result()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("data", type=Path)
    args = parser.parse_args()
    try:
        raw = args.data.read_bytes()
        data = json.loads(raw.decode("utf-8-sig"), object_pairs_hook=unique_object,
                          parse_constant=reject_constant)
        result = inspect(data)
        result.update(source=str(args.data.resolve()), sha256=hashlib.sha256(raw).hexdigest())
    except (OSError, ValueError) as error:
        print(json.dumps({"status": "not_run", "error": str(error)}, ensure_ascii=False))
        return 2
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 1 if result["errors"] else 0


if __name__ == "__main__":
    sys.exit(main())
