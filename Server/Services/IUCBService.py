from flask import Blueprint, jsonify, request
import requests
from Services.Support import *

Iucn_bp = Blueprint('iucn_bp', __name__)

@Iucn_bp.route('/iucn/taxa', methods=['GET'])
def get_taxa():
    genus = request.args.get('genus')
    species = request.args.get('species')
    url = f"https://api.iucnredlist.org/api/v4/taxa/scientific_name?genus_name={genus}&species_name={species}"

    headers = {
        "Authorization": "Bearer K1gqHaXiz8LrWrriLbahrf7Bviunq8tfpmvx"
    }

    try:
        
        response = requests.get(url, headers=headers)
        response.raise_for_status()  # raises an error for non-2xx codes

        data = response.json()  # parse JSON response

        # Extract latest assessment (where latest == True)
        latest_assessment = None
        for assessment in data.get("assessments", []):
            if assessment.get("latest"):
                latest_assessment = assessment
                break

        if latest_assessment:
            result = {
                "scientific_name": data.get("taxon", {}).get("scientific_name"),
                "assessment_id": latest_assessment.get("assessment_id"),
                "danger_level": latest_assessment.get("red_list_category_code"),
                "year_published": latest_assessment.get("year_published"),
                "url": latest_assessment.get("url")
            }
        else:
            result = {"message": "No assessment data found"}

        # Optionally print to console for debugging
        print(result)

        # Return simplified result to the client 
        return build_response(result, response.status_code)
        # return jsonify(data), response.status_code
    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500
    # response = requests.get(url, headers=headers)
    # return (response.text, response.status_code, response.headers.items())




   
# http://localhost:5000/iucn/taxa?genus=astacus&species=astacus`