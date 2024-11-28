import io
import re
import sqlite3
from unittest import mock

import pytest
from fastapi import HTTPException, UploadFile
from fastapi.datastructures import Headers
from moto import mock_aws

from routes.v1.shared import get_attachments, upload_attachments
from storage import Storage
from tests import configs


@mock_aws
def test_upload_attachments_empty(storage: Storage):
    results = upload_attachments(storage, [])
    assert results == []


@mock_aws
def test_upload_attachments_TOO_MANY(storage: Storage):
    files = [UploadFile(io.BytesIO(b"a")), UploadFile(io.BytesIO(b"b"))]

    with mock.patch("routes.v1.shared.configs", new=configs):
        with pytest.raises(HTTPException) as e:
            upload_attachments(storage, files)

        assert e.value.status_code == 400
        assert e.value.detail == {"attachments": "TOO_MANY"}


@mock_aws
def test_upload_attachments_TOO_BIG(storage: Storage):
    size = configs.ATTACHMENT_MAX_SIZE + 1
    files = [UploadFile(io.BytesIO(b"aa"), headers=Headers({"Content-Type": "image/png"}), size=size)]

    with mock.patch("routes.v1.shared.configs", new=configs):
        with pytest.raises(HTTPException) as e:
            upload_attachments(storage, files)

        assert e.value.status_code == 400
        assert e.value.detail == {"attachments.0": "TOO_BIG"}


@mock_aws
def test_upload_attachments_UNSUPPORTED(storage: Storage):
    files = [UploadFile(io.BytesIO(b"a,b"), headers=Headers({"Content-Type": "text/csv"}))]

    with mock.patch("routes.v1.shared.configs", new=configs):
        with pytest.raises(HTTPException) as e:
            upload_attachments(storage, files)

        assert e.value.status_code == 400
        assert e.value.detail == {"attachments.0": "UNSUPPORTED"}


@mock_aws
def test_upload_attachments(storage: Storage):
    file = open("tests/test_data/a.png", "rb")
    files = [UploadFile(file, filename=file.name, headers=Headers({"Content-Type": "image/png"}))]

    file.seek(0, 2)
    files[0].size = file.tell()
    file.seek(0)

    with mock.patch("routes.v1.shared.configs", new=configs):
        results = upload_attachments(storage, files)
        assert len(results) == 1
        assert re.match(f"{configs.ASSETS_BASE_URL}/attachments/" + r"\d+.png", results[0].url)
        assert {"type": "image/png", "hash": "Pwh+BwAI9wiIh4hwj3CI+AiIAAAAAAAA"} == results[0].data

        key = results[0].url.removeprefix(configs.ASSETS_BASE_URL + "/")
        assert storage.s3.list_objects(Bucket=storage.bucket, Prefix=key).get("Contents") is not None


def test_get_attachments(db: sqlite3.Connection):
    db.executescript("""
        PRAGMA foreign_keys = OFF;
        INSERT INTO attachments VALUES
            (1, 1, 'a.txt', '{"a":1}'),
            (2, 1, 'b.txt', NULL),
            (3, 2, 'c.txt', NULL);
    """)

    attachments = get_attachments(db, [1])
    assert {
        1: [
            {"id": 1, "url": "a.txt", "data": {"a": 1}},
            {"id": 2, "url": "b.txt", "data": None},
        ]
    } == attachments
