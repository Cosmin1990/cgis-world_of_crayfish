from flask import Blueprint, request, Response
import json
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError

from Database.DBConnection import db
from Database.Model.Record import Record
from Database.Schema.RecordSchema import RecordSchema
from Services.Support import *

import pandas as pd
from werkzeug.utils import secure_filename

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


# Endpoint: Get distinct crayfish scientific names
@RecordService.route("/records/species_names", methods=['GET'])
def get_distinct_crayfish_names():
    try:
        distinct_names = (
            db.session.query(Record.crayfish_scientific_name)
            .distinct()
            .order_by(Record.crayfish_scientific_name)
            .all()
        )
        names_list = [name[0] for name in distinct_names if name[0] is not None]
        return build_response(names_list, 200)
    except Exception as e:
        return build_response({"error": str(e)}, 500)


from flask import Blueprint, jsonify, abort
from Database.Model.Record import Record
from Database.Schema.RecordSchema import RecordOutDTO
from Database.Schema.RecordSchema import RecordLocationOutDTO


@RecordService.route('/records/species/<string:species_name>', methods=['GET'])
def get_record_by_species(species_name: str):
    record = db.session.query(Record).filter(
        Record.crayfish_scientific_name == species_name
    ).first()

    if not record:
        abort(404, description=f"No record found for species: {species_name}")

    return build_response(RecordOutDTO.model_validate(record).model_dump(), 200)



# New endpoint: Get locations for a given species
@RecordService.route('/records/species/<string:species_name>/locations', methods=['GET'])
def get_record_locations_by_species(species_name: str):
    records = db.session.query(Record.coord_x, Record.coord_y).filter(
        Record.crayfish_scientific_name == species_name
    ).all()

    if not records:
        abort(404, description=f"No locations found for species: {species_name}")

    dto_list = [
        RecordLocationOutDTO(
            latitude=r[1],
            longitude=r[0]
        ).model_dump()
        for r in records
    ]

    return build_response(dto_list, 200)





# Endpoint 1: Upload Excel file
@RecordService.route("/records/import_excel", methods=['POST'])
def import_records_excel():
    if 'file' not in request.files:
        return build_response({"error": "No file provided"}, 400)
    
    file = request.files['file']
    filename = secure_filename(file.filename)
    
    try:
        df = pd.read_excel(file)
    except Exception as e:
        return build_response({"error": f"Failed to read Excel file: {str(e)}"}, 400)
    
    success_count = 0
    errors = []
    
    # Iterate over each row and map based on column order
    for idx, row in df.iterrows():
        row = {k: clean_value(v) for k, v in row.items()}
        
        # Convert confidentialiaty_level to string
        if 'confidentialiaty_level' in row and row['confidentialiaty_level'] is not None:
            row['confidentialiaty_level'] = str(int(row['confidentialiaty_level']))
        try:
            record_data = {
                "woc_id": row["WoCid"],
                "doi": row.get("DOI"),
                "url": row.get("URL"),
                "citation": row.get("Citation"),
                "coord_x": float(str(row["X"]).replace(",", ".")),
                "coord_y": float(str(row["Y"]).replace(",", ".")),
                "accuracy": row.get("Accuracy"),
                "crayfish_scientific_name": row.get("Crayfish_scientific_name"),
                "status": row.get("Status"),
                "year_of_record": int(row["Year_of_record"]),
                "ncbi_coi_accession_code": row.get("NCBI_COI_accession_code"),
                "ncbi_16s_accession_code": row.get("NCBI_16S_accession_code"),
                "ncbi_sra_accession_code": row.get("NCBI_SRA_accession_code"),
                "claim_extinction": row.get("Claim_extinction"),
                "pathogen_symbiont_scientific_name": row.get("Pathogen_symbiont_scientific_name"),
                "pathogen_ncbi_coi_accession_code": row.get("NCBI_COI_accession_code"),
                "pathogen_ncbi_16s_accession_code": row.get("NCBI_16S_accession_code"),
                "pathogen_genotype_group": row.get("Genotype_group"),
                "pathogen_haplotype": row.get("Haplotype"),
                "pathogen_year_of_record": row.get("Year_of_record"),
                "comments": row.get("Comments"),
                "confidentialiaty_level": str(int(row.get("Confidentiality_level", 0))),
                "contributor": row.get("Contributor")
            }
            
            validated = RecordSchema(**record_data)

            new_record = Record(
                woc_id=validated.woc_id,
                doi=validated.doi,
                url=validated.url,
                citation=validated.citation,
                coord_x=validated.coord_x,
                coord_y=validated.coord_y,
                accuracy=validated.accuracy,
                crayfish_scientific_name=validated.crayfish_scientific_name,
                status=validated.status,
                year_of_record=validated.year_of_record,
                ncbi_coi_accession_code=validated.ncbi_coi_accession_code,
                ncbi_16s_accession_code=validated.ncbi_16s_accession_code,
                ncbi_sra_accession_code=validated.ncbi_sra_accession_code,
                claim_extinction=validated.claim_extinction,
                pathogen_symbiont_scientific_name=validated.pathogen_symbiont_scientific_name,
                pathogen_ncbi_coi_accession_code=validated.pathogen_ncbi_coi_accession_code,
                pathogen_ncbi_16s_accession_code=validated.pathogen_ncbi_16s_accession_code,
                pathogen_genotype_group=validated.pathogen_genotype_group,
                pathogen_haplotype=validated.pathogen_haplotype,
                pathogen_year_of_record=validated.pathogen_year_of_record,
                comments=validated.comments,
                confidentialiaty_level=validated.confidentialiaty_level,
                contributor=validated.contributor
            )

            try:
                db.session.add(new_record)
                db.session.flush()
                success_count += 1
            except IntegrityError as ie:
                db.session.rollback()
                errors.append({"row": idx + 1, "errors": "Duplicate entry or integrity constraint violation"})
                print(f"IntegrityError on row {idx + 1}: {ie}")
        except ValidationError as ve:
            errors.append({"row": idx + 1, "errors": ve.errors()})
            print(ve)
        except Exception as e:
            errors.append({"row": idx + 1, "errors": str(e)})
            print(e)

    db.session.commit()
    return build_response({"success_count": success_count, "errors": errors}, 201)


# Endpoint 2: Bulk JSON insert
@RecordService.route("/records/bulk_json", methods=['POST'])
def insert_records_json():
    if not request.is_json:
        return build_response({"error": "Request must contain JSON"}, 400)

    data_list = request.get_json()
    if not isinstance(data_list, list):
        return build_response({"error": "Expected a JSON array"}, 400)

    success_count = 0
    errors = []

    for idx, data in enumerate(data_list):
        try:
            validated = RecordSchema(**data)
            new_record = Record(**validated.model_dump())
            db.session.add(new_record)
            db.session.flush()
            success_count += 1
        except ValidationError as ve:
            errors.append({"index": idx, "errors": ve.errors()})
        except Exception as e:
            errors.append({"index": idx, "errors": str(e)})

    db.session.commit()
    return build_response({"success_count": success_count, "errors": errors}, 201)



import math

def clean_value(value):
    if isinstance(value, float) and math.isnan(value):
        return ""
    return value