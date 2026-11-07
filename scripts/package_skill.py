"""Create a local, source-only skill ZIP. Does not upload or publish anything."""
from hashlib import sha256
from pathlib import Path
import os
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parent.parent
ROOT_FILES = (".gitignore", "LICENSE", "README.md", "SKILL.md", "THIRD_PARTY_NOTICES.md", "VALIDATION.md")
SOURCE_DIRS = ("docs", "licenses", "references", "assets/astro-starter")
SKIP_DIRS = {"node_modules", "dist", ".git", ".astro", ".vercel", ".wrangler", "__pycache__", ".fixture-astro-cache"}
EXTENSIONS = {".md", ".txt", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".mjs", ".js", ".ts", ".astro", ".css", ".json", ".jsonc"}


def excluded(name):
    return (name.startswith(".env") and name != ".env.example") or name.startswith(".dev.vars")


def check_path(path):
    if path.is_symlink() or (hasattr(path, "is_junction") and path.is_junction()):
        raise ValueError(f"Package sources must not be links: {path.relative_to(ROOT)}")
    if not path.resolve().is_relative_to(ROOT):
        raise ValueError("Package source escaped the skill directory")


def source_files():
    files = [ROOT / name for name in ROOT_FILES]
    files.append(ROOT / "scripts/package_skill.py")
    unknown = []
    for folder in SOURCE_DIRS:
        check_path(ROOT / folder)
        for current, directories, names in os.walk(ROOT / folder, followlinks=False):
            directories[:] = sorted(d for d in directories if d not in SKIP_DIRS and not excluded(d))
            for directory in directories:
                check_path(Path(current) / directory)
            for name in sorted(names):
                if excluded(name):
                    continue
                path = Path(current) / name
                allowed = name in {".gitignore", ".env.example"} or path.suffix in EXTENSIONS or name.endswith(".jsonc.example")
                if not allowed:
                    unknown.append(path.relative_to(ROOT).as_posix())
                    continue
                check_path(path)
                files.append(path)
    if unknown:
        raise ValueError("Unrecognized package file extensions:\n" + "\n".join(unknown))
    for path in files:
        check_path(path)
        if not path.is_file():
            raise ValueError(f"Missing package source: {path.relative_to(ROOT)}")
    return sorted(set(files))


def main():
    lines = (ROOT / "SKILL.md").read_text(encoding="utf-8-sig").splitlines()
    versions = [line.split(":", 1)[1].strip().strip('"\'') for line in lines if line.startswith("  version:")]
    if len(versions) != 1 or not versions[0] or any(c not in "0123456789.-abcdefghijklmnopqrstuvwxyz" for c in versions[0]):
        raise ValueError("Expected one safe metadata.version in SKILL.md")
    files = source_files()
    output = ROOT / "releases"
    output.mkdir(exist_ok=True)
    check_path(output)
    archive = output / f"waimao-site-{versions[0]}.zip"
    temporary = archive.with_suffix(".zip.tmp")
    # Fixed archive timestamps make equal source bytes produce equal packages.
    from zipfile import ZipInfo
    with ZipFile(temporary, "w", compression=ZIP_DEFLATED) as bundle:
        for path in files:
            entry = ZipInfo("waimao-site/" + path.relative_to(ROOT).as_posix(), date_time=(2026, 1, 1, 0, 0, 0))
            entry.compress_type = ZIP_DEFLATED
            # Explicit Unix mode: a hand-made ZipInfo otherwise has mode 0, which unzips as
            # unreadable files on macOS/Linux. Fixed system also keeps bytes OS-independent.
            entry.create_system = 3
            entry.external_attr = 0o100644 << 16
            bundle.writestr(entry, path.read_bytes())
    with ZipFile(temporary) as bundle:
        if bundle.testzip() is not None:
            raise ValueError("ZIP integrity check failed")
    temporary.replace(archive)
    checksum = sha256(archive.read_bytes()).hexdigest()
    archive.with_suffix(".zip.sha256").write_text(f"{checksum}  {archive.name}\n", encoding="utf-8")
    print(f"Created {archive.name}: {len(files)} files, {archive.stat().st_size} bytes")
    print(f"SHA-256: {checksum}")


if __name__ == "__main__":
    main()
