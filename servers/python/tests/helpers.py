from typing import Any


def partial_match(expected: Any, actual: Any) -> bool:
    if isinstance(expected, dict):
        if not isinstance(actual, dict):
            return False
        for key, value in expected.items():
            if key not in actual:
                return False
            if not partial_match(value, actual[key]):
                return False
    elif isinstance(expected, list):
        if not isinstance(actual, list):
            return False
        if len(expected) > len(actual):
            return False
        for exp_item, act_item in zip(expected, actual):
            if not partial_match(exp_item, act_item):
                return False
    else:
        return expected == actual
    return True
