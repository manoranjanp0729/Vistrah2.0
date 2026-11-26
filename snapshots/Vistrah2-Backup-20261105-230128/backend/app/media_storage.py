"""Durable-first media storage primitive; no configured root or application upload API.

Only a future validated derivative pipeline may call this adapter. Infrastructure,
decoding/scanning/limits, reference authorization and serving policy are deliberately
outside it. Normal /data secrets and PostgreSQL evidence are never selected implicitly.
"""
import hashlib
import os
import re
import tempfile
from dataclasses import dataclass
from pathlib import Path

@dataclass(frozen=True)
class StoredObject:
    key: str
    sha256: str
    size: int

class MediaStorage:
    def __init__(self, root: Path):
        if not root.is_absolute():
            raise ValueError('An explicitly approved absolute media root is required')
        self.root=root.resolve()

    def _path(self, key):
        if not re.fullmatch(r'[0-9a-f]{64}\.(jpg|png|webp)',key):
            raise ValueError('Invalid immutable derivative key')
        path=self.root/'objects'/key[:2]/key
        if not path.resolve().is_relative_to(self.root):
            raise ValueError('Media path escapes the approved root')
        return path

    def put_derivative(self, content: bytes, extension: str) -> StoredObject:
        if extension not in {'jpg','png','webp'} or not content:
            raise ValueError('Supply nonempty previously validated derivative bytes')
        digest=hashlib.sha256(content).hexdigest();key=digest+'.'+extension
        destination=self._path(key)
        if destination.exists():
            if hashlib.sha256(destination.read_bytes()).hexdigest()!=digest:
                raise OSError('Existing media object failed integrity verification; no replacement made')
            return StoredObject(key,digest,len(content))
        destination.parent.mkdir(parents=True,exist_ok=True)
        # Stage on the same filesystem, outside public object paths.
        staging=self.root/'staging'
        if not staging.resolve().is_relative_to(self.root):raise ValueError('Staging path escapes media root')
        staging.mkdir(parents=True,exist_ok=True)
        descriptor,name=tempfile.mkstemp(prefix='upload-',suffix='.temporary',dir=staging)
        temporary=Path(name)
        try:
            with os.fdopen(descriptor,'wb') as stream:
                stream.write(content);stream.flush();os.fsync(stream.fileno())
            try:
                # Exclusive publication: never overwrite an existing immutable object.
                os.link(temporary,destination)
            except FileExistsError:
                if hashlib.sha256(destination.read_bytes()).hexdigest()!=digest:
                    raise OSError('Concurrent media object failed integrity verification') from None
            if os.name!='nt':
                directory=os.open(destination.parent,os.O_RDONLY)
                try:os.fsync(directory)
                finally:os.close(directory)
        finally:
            # Only this call's newly-created temporary file is eligible for removal.
            temporary.unlink(missing_ok=True)
        return StoredObject(key,digest,len(content))

    def read(self, reference: StoredObject) -> bytes:
        content=self._path(reference.key).read_bytes()
        if len(content)!=reference.size or hashlib.sha256(content).hexdigest()!=reference.sha256:
            raise OSError('Media integrity verification failed')
        return content
