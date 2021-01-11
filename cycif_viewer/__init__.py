from flask import Flask
from pathlib import Path
from flask_sqlalchemy import SQLAlchemy

import os
import json

app = Flask(__name__, template_folder=Path('server/templates'), static_folder='data')
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///server/db.sqlite3'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['CLIENT_PATH'] = app.root_path + '/client/'

config_json_path = Path("cycif_viewer/data") / "config.json"

db = SQLAlchemy(app)


def get_config_names():
    if not os.path.isdir(Path("cycif_viewer/data")):
        os.makedirs(Path("cycif_viewer/data"))

    if not os.path.isfile(config_json_path):
        with open(config_json_path, 'w') as f:
            json.dump({}, f)
            return []
    else:
        with open(config_json_path) as f:
            data = json.load(f)
        return [key for key in data.keys()]


from cycif_viewer.server.routes import page_routes, data_routes, import_routes
from cycif_viewer.server.models import data_model, database_model
