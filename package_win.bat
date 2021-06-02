pyinstaller -F --paths $env:CONDA_PREFIX --add-data "cycif_viewer/client;cycif_viewer/client" --add-data "cycif_viewer/server;cycif_viewer/server" --add-data "%CONDA_PREFIX%/Lib/site-packages/xmlschema/schemas;xmlschema/schemas" --hidden-import "scipy.spatial.transform._rotation_groups" --hidden-import cmath --hidden-import="sqlalchemy.sql.default_comparator" --icon icon.ico  --name cycif_viewer_windows run.py
