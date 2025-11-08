from flask import Blueprint, request, Response
import json
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
def getUserByName(speciesName):
    species = Species.query.filter_by(species_name=speciesName).first()
    if species is None:
        return build_response({"error": f"Species '{speciesName}' not found"}, 404)
    return build_response(SpeciesOutDTO.model_validate(species).model_dump(), 200)
