from flask import Blueprint, request, Response
import json
from pydantic import ValidationError

from Database.DBConnection import db
from Database.Model.Record import Record
from Database.Schema.RecordSchema import RecordSchema
from Services.Support import *

# Create Service blueprint
RecordService = Blueprint('RecordService', __name__)



# Define Service endpoint 
@RecordService.route("/records/new", methods=['POST'])
def create_record():
    
    if not request.is_json:
        return build_response({"error": "Request must contain JSON"}, 400)
    else:
        data = request.get_json()
        try:
            # Validate the JSON data
            validated_data = RecordSchema(**data)  # Validate data

            # Hash the password and generate salt using bcrypt
            # hashed_password, salt = hash_password(validated_data.password)

            # Create a new Record instance using validated data
            new_record = Record(
                woc_id=validated_data.woc_id,
                doi=validated_data.doi,
                url=validated_data.url,
                citation=validated_data.citation,
                coord_x=validated_data.coord_x,
                coord_y=validated_data.coord_y,
                accuracy=validated_data.accuracy.value if hasattr(validated_data.accuracy, 'value') else validated_data.accuracy,
                crayfish_scientific_name=validated_data.crayfish_scientific_name,
                status=validated_data.status,
                year_of_record=validated_data.year_of_record,
                ncbi_coi_accession_code=validated_data.ncbi_coi_accession_code,
                ncbi_16s_accession_code=validated_data.ncbi_16s_accession_code,
                ncbi_sra_accession_code=validated_data.ncbi_sra_accession_code,
                claim_extinction=validated_data.claim_extinction,
                pathogen_symbiont_scientific_name=validated_data.pathogen_symbiont_scientific_name,
                pathogen_ncbi_coi_accession_code=validated_data.pathogen_ncbi_coi_accession_code,
                pathogen_ncbi_16s_accession_code=validated_data.pathogen_ncbi_16s_accession_code,
                pathogen_genotype_group=validated_data.pathogen_genotype_group,
                pathogen_haplotype=validated_data.pathogen_haplotype,
                pathogen_year_of_record=validated_data.pathogen_year_of_record,
                comments=validated_data.comments,
                confidentialiaty_level=validated_data.confidentialiaty_level.value if hasattr(validated_data.confidentialiaty_level, 'value') else validated_data.confidentialiaty_level,
                contributor=validated_data.contributor
            )

            db.session.add(new_record)
            db.session.commit()
            return build_response(
                {"success": True}, 201)
        except ValidationError as e:
            return build_response({"error": e.errors()}, 400)
