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


@Iucn_bp.route('/AphiaSourcesByAphiaID/<int:aphia_id>', methods=['GET'])
def get_aphia_sources(aphia_id):
    """
    Proxy for WoRMS AphiaSourcesByAphiaID.
    Frontend calls:
      `${REACT_APP_DECANET_API_BASE_URL}/AphiaSourcesByAphiaID/${selectedSpeciesCode}`
    """
    worms_url = f"https://www.marinespecies.org/rest/AphiaSourcesByAphiaID/{aphia_id}"

    try:
        response = requests.get(worms_url, timeout=10)
        response.raise_for_status()

        data = response.json()  # this is the list of citations from WoRMS

        # If you want to keep the same behavior as your React code
        # (which takes records[0]), just return the whole list and let
        # React pick the first element, or uncomment below to only send the first:
        #
        # if isinstance(data, list) and data:
        #     data = data[0]

        print(f"AphiaSourcesByAphiaID {aphia_id}: {data}")
        return build_response(data, response.status_code)
    except requests.exceptions.RequestException as e:
        print(f"Error calling WoRMS AphiaSourcesByAphiaID: {e}")
        return jsonify({"error": str(e)}), 500


@Iucn_bp.route('/AphiaClassificationByAphiaID/<int:aphia_id>', methods=['GET'])
def get_aphia_classification(aphia_id):
    """
    Proxy for WoRMS AphiaClassificationByAphiaID.
    Frontend calls:
      `${REACT_APP_DECANET_API_BASE_URL}/AphiaClassificationByAphiaID/${selectedSpeciesCode}`
    """
    worms_url = f"https://www.marinespecies.org/rest/AphiaClassificationByAphiaID/{aphia_id}"

    try:
        response = requests.get(worms_url, timeout=10)
        response.raise_for_status()

        data = response.json()  # WoRMS returns a nested classification JSON object

        # Optional: print or preprocess data if you want
        print(f"AphiaClassificationByAphiaID {aphia_id}: {data}")

        # Send the raw JSON to frontend (your React code will parse it)
        return build_response(data, response.status_code)

    except requests.exceptions.RequestException as e:
        print(f"Error calling WoRMS AphiaClassificationByAphiaID: {e}")
        return jsonify({"error": str(e)}), 500
    

@Iucn_bp.route('/AphiaRecordByAphiaID/<int:aphia_id>', methods=['GET'])
def get_aphia_record(aphia_id):
    """
    Proxy for WoRMS AphiaRecordByAphiaID.
    Frontend will call:
      `${REACT_APP_API_BASE_URL}/AphiaRecordByAphiaID/${selectedSpeciesCode}`
    """
    worms_url = f"https://www.marinespecies.org/rest/AphiaRecordByAphiaID/{aphia_id}"

    try:
        response = requests.get(worms_url, timeout=10)
        response.raise_for_status()

        worms_data = response.json()  # full Aphia record

        # Extract just what the frontend needs for the citation
        result = {
            "aphia_id": worms_data.get("AphiaID"),
            "scientific_name": worms_data.get("scientificname"),
            "citation": worms_data.get("citation"),
            "authority": worms_data.get("authority"),
            # WoRMS often gives a URL, but we can also build the taxdetails URL
            "url": worms_data.get("url") or f"https://www.marinespecies.org/aphia.php?p=taxdetails&id={aphia_id}",
        }

        print(f"AphiaRecordByAphiaID {aphia_id}: {result}")
        return build_response(result, response.status_code)

    except requests.exceptions.RequestException as e:
        print(f"Error calling WoRMS AphiaRecordByAphiaID: {e}")
        return jsonify({"error": str(e)}), 500
   
# http://localhost:5000/iucn/taxa?genus=astacus&species=astacus`