"""Read-only media preflight; never imports database configuration or migrates."""
import argparse
import os
from pathlib import Path
import shutil
import stat

DEFAULT_MIN_FREE_BYTES = 1024 * 1024 * 1024
MIN_RESERVE_BYTES = 6 * 100 * 1024 * 1024  # two uploads, three private copies each


def private_root(value):
    root = Path(value)
    if not value or not root.is_absolute() or not root.is_dir():
        raise ValueError("Provision an absolute private media directory first")
    if any(path.is_symlink() for path in (root, *root.parents)):
        raise ValueError("Private media root must not contain symbolic links")
    if os.name == "posix":
        info = root.stat()
        if info.st_uid != os.geteuid() or stat.S_IMODE(info.st_mode) != 0o700:
            raise ValueError("Private media root must be owned by the API user with mode 0700")
    return root


def require_headroom(root):
    try:
        reserve = int(os.getenv("V_ADS_MIN_FREE_BYTES", str(DEFAULT_MIN_FREE_BYTES)))
    except ValueError:
        raise ValueError("V_ADS_MIN_FREE_BYTES must be an integer")
    if reserve < MIN_RESERVE_BYTES:
        raise ValueError("Media reserve must cover at least two maximum-size upload pipelines")
    if shutil.disk_usage(root).free < reserve:
        raise OSError("Insufficient private storage reserve; retry after operator maintenance")
    return reserve


def check(require_enabled=False):
    enabled = os.getenv("V_ADS_MEDIA_ENABLED", "0")
    if enabled not in {"0", "1"}:
        raise ValueError("V_ADS_MEDIA_ENABLED must be 0 or 1")
    if enabled != "1":
        if require_enabled:
            raise ValueError("V Ads media remains disabled")
        return "V Ads media disabled; activation gate remains closed"
    if os.name != "posix":
        raise ValueError("Release media preflight requires Linux ownership/permission verification")
    root = private_root(os.getenv("V_ADS_PRIVATE_ROOT", ""))
    require_headroom(root)
    if not shutil.which("ffprobe"):
        raise ValueError("FFprobe is required before activation")
    return "Private root, Linux permissions, free-space reserve and FFprobe checks passed"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--require-enabled", action="store_true")
    parser.add_argument("--exec", dest="command", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    try:
        print(check(args.require_enabled), flush=True)
    except (ValueError, OSError) as exc:
        parser.exit(1, str(exc) + "\n")
    if args.command:
        if args.command[0] != "uvicorn":
            parser.exit(1, "Runtime entrypoint only starts Uvicorn; use explicit one-off entrypoints for maintenance\n")
        os.umask(0o077)
        os.execvp(args.command[0], args.command)


if __name__ == "__main__":
    main()
