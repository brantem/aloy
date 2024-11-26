import os
from typing import IO

import boto3


class Storage:
    def __init__(self) -> None:
        self.bucket = os.getenv("STORAGE_BUCKET", "")
        self.s3 = boto3.client(
            "s3",
            endpoint_url=os.getenv("STORAGE_ENDPOINT"),
            aws_access_key_id=os.getenv("STORAGE_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("STORAGE_ACCESS_KEY_SECRET"),
            region_name="auto",
        )

    def upload(self, file: IO[bytes], key: str, contentType: str = "", cacheControl: str = "max-age=31536000"):
        extraArgs = {}
        if contentType != "":
            extraArgs["ContentType"] = contentType

        if cacheControl != "":
            extraArgs["CacheControl"] = cacheControl

        self.s3.upload_fileobj(file, self.bucket, key, ExtraArgs=extraArgs)

    def delete(self, keys: list[str]):
        self.s3.delete_objects(
            Bucket=self.bucket,
            Delete={
                "Objects": [{"Key": key} for key in keys],
                "Quiet": True,
            },
        )
