import os

from humanfriendly import parse_size

ASSETS_BASE_URL = os.getenv("ASSETS_BASE_URL", "")

ATTACHMENT_MAX_COUNT = int(os.getenv("ATTACHMENT_MAX_COUNT", "3"))
ATTACHMENT_MAX_SIZE = parse_size(os.getenv("ATTACHMENT_MAX_SIZE", "100kb"))
ATTACHMENT_SUPPORTED_TYPES = os.getenv("ATTACHMENT_SUPPORTED_TYPES", "image/gif,image/jpeg,image/png,image/webp")
ATTACHMENT_SUPPORTED_TYPES = ATTACHMENT_SUPPORTED_TYPES.split(",")
