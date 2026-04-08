# -*- mode: python ; coding: utf-8 -*-
import os

# Get the project root (parent of host directory)
project_root = os.path.dirname(os.path.abspath(SPEC))

a = Analysis(
    ['host.py'],
    pathex=[project_root, os.path.join(project_root, 'shared')],
    binaries=[],
    datas=[],
    hiddenimports=[
        'mss', 'pyautogui', 'PIL', 'numpy', 'av', 'aiortc',
        'websockets', 'aiohttp', 'json', 'asyncio', 'time',
        'cv2', 'numpy', 'secrets', 'threading', 'fractions',
        'argparse', 'dataclasses', 'datetime', 'enum', 'typing'
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=None)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='RemoteView-Host',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
