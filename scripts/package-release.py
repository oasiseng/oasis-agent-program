"""Optional owner packaging helper. Source allowlist excludes secrets/local state."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib

root = Path(__file__).resolve().parent.parent
directories = ("src", "tests", "migrations", "examples", "scripts", "docs", "catalog", ".github")
files = [p for p in root.iterdir() if p.is_file() and (p.suffix == ".md" or p.name in {
    "LICENSE", ".gitignore", ".dev.vars.example", "package.json", "package-lock.json",
    "wrangler.jsonc", "tsconfig.json", "tsconfig.tests.json", "vitest.config.ts", "worker-configuration.d.ts"
})]
for directory in directories:
    files.extend(p for p in (root / directory).rglob("*") if p.is_file() and "__pycache__" not in p.parts)
release = root / "release"
release.mkdir(exist_ok=True)
target = release / "oasis-agent-program-github-ready.zip"
with ZipFile(target, "w", ZIP_DEFLATED) as archive:
    for file in sorted(set(files)):
        archive.write(file, Path(root.name) / file.relative_to(root))
with ZipFile(target) as archive:
    bad = [name for name in archive.namelist() if any(part in {"node_modules", ".git", ".wrangler", ".dev.vars", ".env"} for part in Path(name).parts)]
    assert not bad, bad
    assert archive.testzip() is None
print(f"Packaged {len(files)} source files: {target}")
print(f"SHA-256: {hashlib.sha256(target.read_bytes()).hexdigest()}")
