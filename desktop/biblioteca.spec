# -*- mode: python ; coding: utf-8 -*-
import os
from pathlib import Path

block_cipher = None
PROJECT_ROOT = os.path.abspath(os.path.join(SPECPATH, ".."))

datas = [
    (os.path.join(PROJECT_ROOT, "backend/app/static"), "backend/app/static"),
    (os.path.join(PROJECT_ROOT, "desktop/icone.png"), "desktop"),
    (os.path.join(PROJECT_ROOT, "backend/alembic.ini"), "backend"),
    (os.path.join(PROJECT_ROOT, "backend/migrations"), "backend/migrations"),
]

hiddenimports = [
    "gi",
    "gi.repository",
    "gi.repository.GLib",
    "gi.repository.GObject",
    "gi.repository.Gio",
    "gi.repository.Gtk",
    "gi.repository.Gdk",
    "gi.repository.WebKit2",
    "webview",
    "webview.platforms.gtk",
    "uvicorn",
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan",
    "uvicorn.lifespan.on",
    "sqlalchemy.dialects.sqlite",
    "pydantic",
    "openpyxl",
    "passlib",
    "bcrypt",
]

a = Analysis(
    [os.path.join(PROJECT_ROOT, "desktop/launcher.py")],
    pathex=[PROJECT_ROOT],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="biblioteca",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    icon=os.path.join(PROJECT_ROOT, "desktop/icone.png"),
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="biblioteca",
)
