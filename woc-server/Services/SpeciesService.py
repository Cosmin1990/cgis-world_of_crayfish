from flask import Blueprint, request, Response, send_file, after_this_request
import json
import os
import shutil
from pydantic import ValidationError

from Database.DBConnection import db
from Database.Model.Species import Species
from Database.Schema.SpeciesSchema import *
from Services.Support import *


# Create Service blueprint
SpeciesService = Blueprint('SpeciesService', __name__)



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
@SpeciesService.route("/species/<path:speciesName>", methods=['GET'])
def getSpeciesByName(speciesName):
    species = Species.query.filter_by(species_name=speciesName).first()
    if species is None:
        return build_response({"error": f"Species '{speciesName}' not found"}, 404)
    return build_response(SpeciesOutDTO.model_validate(species).model_dump(), 200)


# Define Service endpoint 
@SpeciesService.route("/species/confirmation/<path:speciesName>", methods=['GET'])
def getSpeciesDirectoryAvailability(speciesName):

    # Normalize species name: replace spaces with underscores
    normalized_name = speciesName.strip().replace(" ", "_")
 
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
    normalized_name = speciesName.strip().replace(" ", "_")
 
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
    normalized_name = speciesName.strip().replace(" ", "_")
 
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
        