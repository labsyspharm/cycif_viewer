from cycif_viewer import app, get_config_names
from flask import render_template, send_from_directory
from pathlib import Path
import json
import os


@app.route("/")
def my_index():
    return render_template("index.html", data={'datasource': '', 'datasources': get_config_names()})


@app.route('/<string:datasource>')
def image_viewer(datasource):
    datasources = get_config_names()
    if datasource not in datasources:
        datasource = ''

    return render_template('index.html', data={'datasource': datasource, 'datasources': datasources})


@app.route('/compare_neighborhoods/<string:datasource>')
def compare_neighborhoods(datasource):
    datasources = get_config_names()
    if datasource not in datasources:
        datasource = ''

    return render_template('compare_neighborhoods.html', data={'datasource': datasource, 'datasources': datasources})


@app.route("/upload_page")
def upload_page():
    return render_template("upload.html", data={'datasource': '', 'datasources': get_config_names()})


@app.route('/client/<path:filename>')
def serveClient(filename):
    return send_from_directory(app.config['CLIENT_PATH'], filename, conditional=True)


@app.route('/static/<path:filename>')
def rerouteStatic(filename):
    test = ''
