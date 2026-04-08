# -*- mode: python ; coding: utf-8 -*-
import os

# Get the project root (parent of client directory)
project_root = os.path.dirname(os.path.abspath(SPEC))

a = Analysis(
    ['client.py'],
    pathex=[project_root, os.path.join(project_root, 'shared')],
    binaries=[],
    datas=[],
    hiddenimports=[
        'cv2', 'numpy', 'pyautogui', 'websockets', 'aiortc',
        'av', 'aiohttp', 'json', 'asyncio', 'time', 'PIL',
        'secrets', 'threading', 'datetime', 'dataclasses',
        'argparse', 'typing', 'enum'
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
    name='RemoteView-Client',
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
