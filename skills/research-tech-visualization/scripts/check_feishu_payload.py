import argparse
import json
import math
from pathlib import Path
import sys


def inspect(payload):
    errors = []
    if not isinstance(payload, dict):
        return {'status': 'invalid', 'errors': ['PAYLOAD_NOT_OBJECT']}
    categories = payload.get('categories')
    series = payload.get('series')
    if not isinstance(categories, list) or not categories or any(not isinstance(category, str) or not category.strip() for category in categories):
        errors.append('CATEGORIES_REQUIRE_NONEMPTY_STRING_ARRAY')
    elif len(set(categories)) != len(categories):
        errors.append('DUPLICATE_CATEGORIES_REQUIRE_EXPLICIT_IDENTITY')
    if not isinstance(series, dict) or not series:
        errors.append('SERIES_REQUIRE_NONEMPTY_OBJECT')
    else:
        for index, (name, values) in enumerate(series.items()):
            if not isinstance(name, str) or not name.strip():
                errors.append(f'INVALID_METHOD_NAME: series[{index}]')
            if not isinstance(values, list) or not values:
                errors.append(f'VALUES_REQUIRE_NONEMPTY_ARRAY: series[{index}]')
                continue
            if isinstance(categories, list) and len(values) != len(categories):
                errors.append(f'CATEGORY_VALUE_LENGTH_MISMATCH: series[{index}]')
            for position, value in enumerate(values):
                if value is None:
                    errors.append(f'MISSING_VALUE_NOT_NATIVE_BAR_ZERO: series[{index}][{position}]')
                elif isinstance(value, bool) or not isinstance(value, (int, float)):
                    errors.append(f'VALUE_NOT_JSON_NUMBER: series[{index}][{position}]')
                else:
                    try:
                        finite = math.isfinite(value)
                    except OverflowError:
                        finite = False
                    if not finite:
                        errors.append(f'VALUE_NOT_FINITE: series[{index}][{position}]')
    return {
        'status': 'invalid' if errors else 'checks_passed',
        'errors': errors,
        'scope': 'categories/series 有限点估计的原生条形图输入；零允许、缺失拒绝，不改写数据。',
        'coverage': {'shape_and_numeric': 'checked', 'source_fidelity': 'not_run', 'native_adapter': 'not_run', 'remote_write': 'not_run', 'visual': 'not_run'},
    }


def strict_object(pairs):
    result = {}
    for name, value in pairs:
        if name in result:
            raise ValueError('DUPLICATE_JSON_KEY')
        result[name] = value
    return result


def main():
    parser = argparse.ArgumentParser(description='只读检查 categories/series 原生条形图 payload，防止缺失被下游转换为零。')
    parser.add_argument('input', type=Path)
    arguments = parser.parse_args()
    try:
        payload = json.loads(arguments.input.read_text(encoding='utf-8-sig'), object_pairs_hook=strict_object)
    except (OSError, UnicodeError, ValueError):
        print(json.dumps({'status': 'not_run', 'errors': ['INPUT_UNREADABLE_OR_INVALID_JSON']}, ensure_ascii=False))
        return 2
    report = inspect(payload)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if report['errors'] else 0


if __name__ == '__main__':
    sys.exit(main())
