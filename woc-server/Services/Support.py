import json
import os
from enum import Enum

from flask import Response


def CORSify(resp):
    resp.headers.add("Access-Control-Allow-Origin", "*")
    resp.headers.add("Access-Control-Allow-Credentials", "true")
    resp.headers.add("Access-Control-Allow-Headers", "*")
    resp.headers.add("Access-Control-Allow-Methods", "*")
    return resp


def build_response(object, status):
    resp = Response(json.dumps(object), status=status, mimetype='application/json')
    resp = CORSify(resp)
    return resp


def build_simple_response(status):
    resp = None
    if status == 200:
        resp = Response(json.dumps({'success': True}), status=status, mimetype='application/json')
    else:
        resp = Response(json.dumps({'success': False}), status=status, mimetype='application/json')

    resp = CORSify(resp)
    return resp


# def validate_id(cls, object_id, object_type, object_string):
#     returned_object = object_type.query.get(object_id)
#     if not returned_object:
#         raise ValueError(f'{object_string} with id {object_id} does not exist.')
#     return object_id


def to_int(value, default=None):
    """Helper: cast to int or return default (handles missing / empty)."""
    try:
        return int(value)
    except (TypeError, ValueError):
        return default