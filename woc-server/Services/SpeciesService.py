from flask import Blueprint, request, Response, send_file, after_this_request, jsonify
from flask import url_for
import json
import os
import shutil
import csv
from pydantic import ValidationError
from urllib.parse import quote

from Database.DBConnection import db
from Database.Model.Species import Species
from Database.Schema.SpeciesSchema import *
from Services.Support import *

# Create Service blueprint
SpeciesService = Blueprint('SpeciesService', __name__)


def normalize_species_name(species_name: str) -> str:
    name = species_name.strip()
    name = name.replace(" ", "_").replace("(", "_").replace(")", "_")
    name = name.lower()
    return name[0].upper() + name[1:] if name else name


# Define Service endpoint 
@SpeciesService.route("/species/new", methods=['POST'])
def addSpeciesRecord():
    if not request.is_json:
        return build_response({"error": "Request must contain JSON"}, 400)
    else:
        data = request.get_json()
        try:
            # Validate the JSON data
            validated_data = SpeciesInDTO(**data)  # Validate data

            new_species = Species(
                species_name=validated_data.species_name,
                official_id=validated_data.official_id
            )

            db.session.add(new_species)
            db.session.commit()
            return build_response(
                SpeciesOutDTO.model_validate(new_species).model_dump(), 201)
        except ValidationError as e:
            return build_response({"error": e.errors()}, 400)


# Define Service endpoint 
@SpeciesService.route("/species/confirmation/<path:speciesName>", methods=['GET'])
def getSpeciesDirectoryAvailability(speciesName):
    # Normalize species name: replace spaces with underscores
    # normalized_name = speciesName.strip().replace(" ", "_")
    normalized_name = normalize_species_name(speciesName)

    # Build path to DATA_FILES directory under server home
    base_dir = "/home/DATA_FILES"
    species_dir = os.path.join(base_dir, normalized_name)

    exists = os.path.isdir(species_dir)
    if exists:
        return build_response({"exists": True}, 201)
    else:
        return build_response({"exists": False}, 404)


# Define Service endpoint 
@SpeciesService.route("/species/archive/<path:speciesName>", methods=['GET'])
def getSpeciesDirectoryZip(speciesName):
    # Normalize species name: replace spaces with underscores
    # normalized_name = speciesName.strip().replace(" ", "_")
    normalized_name = normalize_species_name(speciesName)

    # Build path to DATA_FILES directory under server home
    base_dir = "/home/DATA_FILES"
    species_dir = os.path.join(base_dir, normalized_name)

    if not os.path.isdir(species_dir):
        return build_response({"error": f"Species directory '{speciesName}' not found"}, 404)

    zip_base = os.path.join("/tmp", normalized_name)
    zip_path = shutil.make_archive(zip_base, 'zip', species_dir)

    @after_this_request
    def remove_file(response):
        if os.path.exists(zip_path):
            os.remove(zip_path)
        return response

    return send_file(
        zip_path,
        mimetype='application/zip',
        as_attachment=True,
        download_name=f"{normalized_name}.zip"
    )


@SpeciesService.route("/species/geolocations/<path:speciesName>", methods=['GET'])
def getSpeciesGeolocations(speciesName):
    # Normalize species name: replace spaces with underscores
    # normalized_name = speciesName.strip().replace(" ", "_")

    normalized_name = normalize_species_name(speciesName)

    # Build path to DATA_FILES directory under server home
    base_dir = "/home/DATA_FILES"
    species_dir = os.path.join(base_dir, normalized_name)

    if not os.path.isdir(species_dir):
        return build_response({"error": f"Species directory '{speciesName}' not found"}, 404)

    maps_dir = os.path.join(species_dir, "maps")

    filenames = {
        "AOO": f"{normalized_name}_AOO.geojson",
        "basins": f"{normalized_name}_basins.geojson",
        "EOO": f"{normalized_name}_EOO.geojson"
    }

    result = {}
    for key, filename in filenames.items():
        filepath = os.path.join(maps_dir, filename)
        if os.path.isfile(filepath):
            try:
                with open(filepath, 'r') as f:
                    result[key] = json.load(f)
            except Exception:
                result[key] = None
        else:
            result[key] = None

    return build_response(result, 200)


# Define Service endpoint 
@SpeciesService.route("/species/narrative/<path:speciesName>", methods=['GET'])
def getSpeciesNarrative(speciesName):
    # Normalize species name: replace spaces with underscores
    # normalized_name = speciesName.strip().replace(" ", "_")
    normalized_name = normalize_species_name(speciesName)

    # Build path to DATA_FILES directory under server home
    base_dir = "/home/DATA_FILES"
    species_dir = os.path.join(base_dir, normalized_name)

    if not os.path.isdir(species_dir):
        return build_response({"error": f"Species directory '{speciesName}' not found"}, 404)

    filename = normalized_name + "_canonical.md"
    species_description_file = os.path.join(os.path.join(species_dir, "narratives"), filename)
    # read naratice from "species" file
    species_narrative = ""
    with open(species_description_file, "r", encoding="utf-8") as f:
        species_narrative = f.read()

    pieces = species_narrative.split("FORMAL NARRATIVE SUMMARY (Human-Readable)")
    short = ""
    if len(pieces) > 1:
        short = pieces[1].strip()

    return build_response({"short": short, "full": species_narrative}, 200)


@SpeciesService.route("/species/bibliography/<path:speciesName>/<path:fileType>", methods=['GET'])
def getSpeciesBibliographyFile(speciesName, fileType):

    normalized_name = normalize_species_name(speciesName)

    base_dir = "/home/DATA_FILES"
    species_dir = os.path.join(base_dir, normalized_name)
    bib_dir = os.path.join(species_dir, "citations")

    if not os.path.isdir(species_dir):
        return build_response({"error": f"Species directory '{speciesName}' not found"}, 404)

    if not os.path.isdir(bib_dir):
        return build_response({"error": f"Bibliography directory not found for species:'{speciesName}'"}, 404)

    fType = fileType.lower().strip()

    if fType == "json":
        filePath = os.path.join(bib_dir, normalized_name + "_bibliography.json")
    elif fType == "csv":
        filePath = os.path.join(bib_dir, normalized_name + "_bibliography.csv")
    elif fType == "bib":
        filePath = os.path.join(bib_dir, normalized_name + "_bibliography.bib")
    elif fType == "cff":
        filePath = os.path.join(bib_dir, normalized_name + "_CITATION.cff")
    else:
        return build_response({"error": f"Invalid argument for file type:'{fileType}'"}, 404)

    if not os.path.isfile(filePath):
        return build_response({"error": "File not found"}, 404)

    mode = request.args.get("mode", "download")

    # 🔹 MODE INLINE → return JSON object
    if mode == "inline":

        if fType == "json":
            with open(filePath, "r", encoding="utf-8") as f:
                data = json.load(f)
            return build_response(data, 200)

        elif fType == "csv":
            with open(filePath, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                data = list(reader)
            return build_response(data, 200)

        elif fType in ["bib", "cff"]:
            with open(filePath, "r", encoding="utf-8") as f:
                content = f.read()
            return build_response({"content": content}, 200)

    # 🔹 MODE DEFAULT → download
    return send_file(
        filePath,
        as_attachment=True,
    )





@SpeciesService.route("/species/metadata/<path:speciesName>", methods=['GET'])
def getMetadata(speciesName):
    resources = []

    server_url = "https://cgisdev.utcluj.ro/woc/api"
    encodedSpeciesName = quote(speciesName)

    resources.append({
        "name": f"Narrative",
        "path": server_url + "/species/narrative/" + encodedSpeciesName,
        "format": "md"
    })

    geolocation_types = ["AOO", "basins", "EOO"]
    for geoType in geolocation_types:
        resources.append({
            "name": f"Geolocations ({geoType})",
            "path": server_url + "/species/geolocations/" + encodedSpeciesName + "/" + geoType + "?mode=inline",
            "format": "geojson"
        })

    bibliography_formats = ["json", "csv", "bib", "cff"]

    for fmt in bibliography_formats:
        resources.append({
            "name": f"Bibliography ({fmt})",
            "path": server_url + "/species/bibliography/" + encodedSpeciesName + "/" + fmt + "?mode=inline",
            "format": fmt
        })

    manifest = {
        "id": "woc-seb:" + speciesName,
        "name": "woc-seb",
        "version": "1.0.0",
        "species": {
            "scientificName": speciesName
        },
        "resources": resources
    }

    return build_response({"manifest": manifest}, 200)


# Define Service endpoint
@SpeciesService.route("/species/<string:speciesName>", methods=['GET'])
def getSpeciesByName(speciesName):
    species = Species.query.filter_by(species_name=speciesName).first()
    if species is None:
        return build_response({"error": f"Species '{speciesName}' not found"}, 404)
    return build_response(SpeciesOutDTO.model_validate(species).model_dump(), 200)


@SpeciesService.route(
    "/species/geolocations/<path:speciesName>/<string:geoType>",
    methods=['GET']
)
def getSpeciesGeolocationsFile(speciesName, geoType):

    normalized_name = normalize_species_name(speciesName)

    base_dir = "/home/DATA_FILES"
    species_dir = os.path.join(base_dir, normalized_name)
    maps_dir = os.path.join(species_dir, "maps")

    if not os.path.isdir(species_dir):
        return build_response(
            {"error": f"Species directory '{speciesName}' not found"},
            404
        )

    if not os.path.isdir(maps_dir):
        return build_response(
            {"error": f"Maps directory not found for species '{speciesName}'"},
            404
        )

    geoType = geoType.lower().strip()

    if geoType == "aoo":
        filename = f"{normalized_name}_AOO.geojson"
    elif geoType == "basins":
        filename = f"{normalized_name}_basins.geojson"
    elif geoType == "eoo":
        filename = f"{normalized_name}_EOO.geojson"
    else:
        return build_response(
            {"error": f"Invalid geolocation type '{geoType}'"},
            404
        )

    filePath = os.path.join(maps_dir, filename)

    if not os.path.isfile(filePath):
        return build_response(
            {"error": f"File not found for '{geoType}'"},
            404
        )

    mode = request.args.get("mode", "download")

    # 🔹 INLINE MODE → return JSON object
    if mode == "inline":
        with open(filePath, "r", encoding="utf-8") as f:
            geojson_data = json.load(f)

        #return build_response({"geolocations": geojson_data}, 200)
        return jsonify(geojson_data)

    # 🔹 DEFAULT → download (comportament vechi)
    return send_file(
        filePath,
        mimetype="application/geo+json",
        as_attachment=True
    )



