import re
from datetime import datetime, timezone

from flask import Blueprint, request, Response, send_file, after_this_request, jsonify
import json
import os
import shutil
import csv
from pydantic import ValidationError
from urllib.parse import quote

from Database.DBConnection import db
from Database.Model.Species import Species
from Database.Model.Snapshots import Snapshots
from Database.Schema.SpeciesSchema import *
from Services.Support import *
from Database.Schema.SpeciesSchema import (
    SpeciesOutDTO,
    SpeciesPaginatedDTO,
    SpeciesSnapshotsOutDTO,
    SpeciesSnapshotItemDTO
)

# Create Service blueprint
SpeciesService = Blueprint('SpeciesService', __name__)


def normalize_species_name(species_name: str) -> str:
    name = species_name.strip()
    name = name.replace(" ", "_").replace("(", "_").replace(")", "_")
    name = name.lower()
    return name[0].upper() + name[1:] if name else name


def normalize_snapshot_name(snapshot_name: str) -> str:
    name = snapshot_name.strip()
    name = name.replace(" ", "_").replace("(", "_").replace(")", "_")
    name = name.lower()
    return name[0].upper() + name[1:] if name else name


def get_latest_snapshot():
    return Snapshots.query.order_by(Snapshots.snapshot_date.desc(), Snapshots.id.desc()).first()


def resolve_species_base_dir(snapshot_id: int | None = None):
    """
    Returnează:
      - base_dir-ul din care citim specia
      - snapshot-ul folosit (sau None dacă se citește din /home/DATA_FILES)
      - error_response (sau None)

    Reguli:
      1. dacă snapshot_id este specificat -> caută snapshotul respectiv
      2. dacă snapshot_id nu este specificat -> ia cel mai recent snapshot
      3. dacă nu există snapshot -> fallback la /home/DATA_FILES
    """
    default_base_dir = "/home/DATA_FILES"
    snapshots_root = "/home/SNAPSHOTS"

    if snapshot_id is not None:
        requested_snapshot = Snapshots.query.filter_by(id=snapshot_id).first()

        if requested_snapshot is None:
            return None, None, build_response(
                {"error": f"Snapshot with id '{snapshot_id}' not found"},
                404
            )

        normalized_snapshot_name = normalize_snapshot_name(requested_snapshot.snapshot_name)
        snapshot_base_dir = os.path.join(snapshots_root, normalized_snapshot_name)

        if not os.path.isdir(snapshot_base_dir):
            return None, None, build_response(
                {"error": f"Snapshot directory not found for snapshot id '{snapshot_id}'"},
                404
            )

        return snapshot_base_dir, requested_snapshot, None

    latest_snapshot = get_latest_snapshot()
    if latest_snapshot is not None:
        normalized_snapshot_name = normalize_snapshot_name(latest_snapshot.snapshot_name)
        snapshot_base_dir = os.path.join(snapshots_root, normalized_snapshot_name)

        if os.path.isdir(snapshot_base_dir):
            return snapshot_base_dir, latest_snapshot, None

    return default_base_dir, None, None


def resolve_species_dir(species_name: str, snapshot_id: int | None = None):
    normalized_name = normalize_species_name(species_name)

    base_dir, snapshot, error_response = resolve_species_base_dir(snapshot_id)
    if error_response is not None:
        return None, None, None, error_response

    species_dir = os.path.join(base_dir, normalized_name)

    if not os.path.isdir(species_dir):
        source_label = f"id={snapshot.id}" if snapshot else "default"
        return None, None, None, build_response(
            {"error": f"Species directory '{species_name}' not found in snapshot '{source_label}'"},
            404
        )

    return normalized_name, species_dir, snapshot, None


def remove_md_sections(md_text: str, section_titles: list[str], level: int = 4) -> str:
    for title in section_titles:
        pattern = (
            rf'(?ms)^{"#" * level}\s+{re.escape(title)}\s*\n'
            rf'.*?'
            rf'(?=^#{{1,{level}}}\s+|\Z)'
        )
        md_text = re.sub(pattern, "", md_text)
    return md_text.strip()


@SpeciesService.route("/species/new", methods=['POST'])
def addSpeciesRecord():
    if not request.is_json:
        return build_response({"error": "Request must contain JSON"}, 400)

    data = request.get_json()
    try:
        validated_data = SpeciesInDTO(**data)

        new_species = Species(
            species_name=validated_data.species_name,
        )

        db.session.add(new_species)
        db.session.commit()

        return build_response(
            SpeciesOutDTO.model_validate(new_species).model_dump(),
            201
        )
    except ValidationError as e:
        return build_response({"error": e.errors()}, 400)


@SpeciesService.route("/species/confirmation/<path:speciesName>", methods=['GET'])
def getSpeciesDirectoryAvailability(speciesName):
    snapshot_id = request.args.get("snapshot_id", default=None, type=int)

    normalized_name = normalize_species_name(speciesName)

    base_dir, snapshot, error_response = resolve_species_base_dir(snapshot_id)
    if error_response is not None:
        return error_response

    species_dir = os.path.join(base_dir, normalized_name)
    exists = os.path.isdir(species_dir)

    return build_response({
        "exists": exists,
        "snapshot_used": {
            "id": snapshot.id,
            "snapshot_name": snapshot.snapshot_name,
            "snapshot_date": snapshot.snapshot_date.isoformat()
        } if snapshot else None
    }, 200 if exists else 404)


@SpeciesService.route("/species/archive/<path:speciesName>", methods=['GET'])
def getSpeciesDirectoryZip(speciesName):
    snapshot_id = request.args.get("snapshot_id", default=None, type=int)

    normalized_name, species_dir, snapshot, error_response = resolve_species_dir(
        speciesName,
        snapshot_id
    )
    if error_response is not None:
        return error_response

    zip_base = os.path.join("/tmp", normalized_name)
    zip_path = shutil.make_archive(zip_base, 'zip', species_dir)

    @after_this_request
    def remove_file(response):
        if os.path.exists(zip_path):
            os.remove(zip_path)
        return response

    download_name = f"{normalized_name}.zip"
    print(snapshot.snapshot_name)
    if snapshot:
        download_name = f"{normalized_name}_{snapshot.snapshot_name}.zip"

    return send_file(
        zip_path,
        mimetype='application/zip',
        as_attachment=True,
        download_name=download_name
    )


@SpeciesService.route("/species/geolocations/<path:speciesName>", methods=['GET'])
def getSpeciesGeolocations(speciesName):
    snapshot_id = request.args.get("snapshot_id", default=None, type=int)

    normalized_name, species_dir, snapshot, error_response = resolve_species_dir(
        speciesName,
        snapshot_id
    )
    if error_response is not None:
        return error_response

    maps_dir = os.path.join(species_dir, "maps")

    filenames = {
        "AOO": f"{normalized_name}_AOO.geojson",
        "basins": f"{normalized_name}_basins.geojson",
        "EOO": f"{normalized_name}_EOO.geojson"
    }

    result = {
        "snapshot_used": {
            "id": snapshot.id,
            "snapshot_name": snapshot.snapshot_name,
            "snapshot_date": snapshot.snapshot_date.isoformat()
        } if snapshot else None
    }

    for key, filename in filenames.items():
        filepath = os.path.join(maps_dir, filename)
        if os.path.isfile(filepath):
            try:
                with open(filepath, 'r', encoding="utf-8") as f:
                    result[key] = json.load(f)
            except Exception:
                result[key] = None
        else:
            result[key] = None

    return build_response(result, 200)


@SpeciesService.route("/species/narrative/<path:speciesName>", methods=['GET'])
def getSpeciesNarrative(speciesName):
    snapshot_id = request.args.get("snapshot_id", default=None, type=int)

    normalized_name, species_dir, snapshot, error_response = resolve_species_dir(
        speciesName,
        snapshot_id
    )
    if error_response is not None:
        return error_response

    filename = normalized_name + "_canonical.md"
    species_description_file = os.path.join(species_dir, "narratives", filename)

    if not os.path.isfile(species_description_file):
        return build_response(
            {"error": f"Narrative file not found for species '{speciesName}'"},
            404
        )

    with open(species_description_file, "r", encoding="utf-8") as f:
        species_narrative = f.read()

    pieces = species_narrative.split("FORMAL NARRATIVE SUMMARY (Human-Readable)")
    short = pieces[1].strip() if len(pieces) > 1 else ""

    return build_response({
        "snapshot_used": {
            "id": snapshot.id,
            "snapshot_name": snapshot.snapshot_name,
            "snapshot_date": snapshot.snapshot_date.isoformat()
        } if snapshot else None,
        "short": short,
        "full": species_narrative
    }, 200)


@SpeciesService.route("/species/bibliography/<path:speciesName>/<path:fileType>", methods=['GET'])
def getSpeciesBibliographyFile(speciesName, fileType):
    snapshot_id = request.args.get("snapshot_id", default=None, type=int)

    normalized_name, species_dir, snapshot, error_response = resolve_species_dir(
        speciesName,
        snapshot_id
    )
    if error_response is not None:
        return error_response

    bib_dir = os.path.join(species_dir, "citations")

    if not os.path.isdir(bib_dir):
        return build_response(
            {"error": f"Bibliography directory not found for species:'{speciesName}'"},
            404
        )

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

    if mode == "inline":
        if fType == "json":
            with open(filePath, "r", encoding="utf-8") as f:
                data = json.load(f)
            return build_response({
                "snapshot_used": {
                    "id": snapshot.id,
                    "snapshot_name": snapshot.snapshot_name,
                    "snapshot_date": snapshot.snapshot_date.isoformat()
                } if snapshot else None,
                "data": data
            }, 200)

        elif fType == "csv":
            with open(filePath, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                data = list(reader)
            return build_response({
                "snapshot_used": {
                    "id": snapshot.id,
                    "snapshot_name": snapshot.snapshot_name,
                    "snapshot_date": snapshot.snapshot_date.isoformat()
                } if snapshot else None,
                "data": data
            }, 200)

        elif fType in ["bib", "cff"]:
            with open(filePath, "r", encoding="utf-8") as f:
                content = f.read()
            return build_response({
                "snapshot_used": {
                    "id": snapshot.id,
                    "snapshot_name": snapshot.snapshot_name,
                    "snapshot_date": snapshot.snapshot_date.isoformat()
                } if snapshot else None,
                "content": content
            }, 200)

    return send_file(filePath, as_attachment=True)


@SpeciesService.route("/species/manifest/<path:speciesName>", methods=['GET'])
def getMetadata(speciesName):
    resources = []

    server_url = "https://cgisdev.utcluj.ro/woc/api"
    encodedSpeciesName = quote(speciesName)

    SCHEMA_VERSION = "1.1.0"
    BUNDLE_NAME = "woc-seb"
    BUNDLE_VERSION = "1.0.0"
    LICENSE = "CC-BY-4.0"
    PIPELINE_NAME = "cheCkOVER"
    PIPELINE_VERSION = "x.y.z"

    now_iso = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    recommended_citation = (
        f"WoC (2026). Species Exposure Bundle: {speciesName}. "
        f"SEB {BUNDLE_NAME}:{speciesName} v{BUNDLE_VERSION}."
    )

    snapshot_id = request.args.get("snapshot_id", default=None, type=int)
    _, _, snapshot, error_response = resolve_species_dir(speciesName, snapshot_id)
    if error_response is not None:
        return error_response

    snapshot_query = f"snapshot_id={snapshot.id}" if snapshot else ""

    resources.append({
        "name": "Narrative",
        "path": f"{server_url}/species/narrative/{encodedSpeciesName}" +
                (f"?{snapshot_query}" if snapshot_query else ""),
        "format": "md"
    })

    geolocation_types = ["AOO", "basins", "EOO"]
    for geoType in geolocation_types:
        resources.append({
            "name": f"Geolocations ({geoType}) - inline",
            "path": f"{server_url}/species/geolocations/{encodedSpeciesName}/{geoType}?mode=inline" +
                    (f"&{snapshot_query}" if snapshot_query else ""),
            "format": "geojson"
        })
        resources.append({
            "name": f"Geolocations ({geoType}) - download",
            "path": f"{server_url}/species/geolocations/{encodedSpeciesName}/{geoType}" +
                    (f"?{snapshot_query}" if snapshot_query else ""),
            "format": "geojson"
        })

    bibliography_formats = ["json"]
    for fmt in bibliography_formats:
        resources.append({
            "name": f"Bibliography ({fmt}) - inline",
            "path": f"{server_url}/species/bibliography/{encodedSpeciesName}/{fmt}?mode=inline" +
                    (f"&{snapshot_query}" if snapshot_query else ""),
            "format": fmt
        })
        resources.append({
            "name": f"Bibliography ({fmt}) - download",
            "path": f"{server_url}/species/bibliography/{encodedSpeciesName}/{fmt}" +
                    (f"?{snapshot_query}" if snapshot_query else ""),
            "format": fmt
        })

    manifest = {
        "schemaVersion": SCHEMA_VERSION,
        "id": f"{BUNDLE_NAME}:{speciesName}",
        "name": BUNDLE_NAME,
        "version": BUNDLE_VERSION,
        "created": now_iso,
        "updated": now_iso,
        "license": LICENSE,
        "recommendedCitation": recommended_citation,
        "generatedBy": {
            "pipeline": PIPELINE_NAME,
            "pipelineVersion": PIPELINE_VERSION
        },
        "species": {
            "scientificName": speciesName
        },
        "snapshotUsed": {
            "id": snapshot.id,
            "snapshot_name": snapshot.snapshot_name,
            "snapshot_date": snapshot.snapshot_date.isoformat()
        } if snapshot else None,
        "resources": resources
    }

    return jsonify(manifest), 200


@SpeciesService.route("/species/manifest2/<path:speciesName>", methods=['GET'])
def getMetadata2(speciesName):
    SCHEMA_VERSION = "1.1.0"
    BUNDLE_NAME = "woc-seb"
    BUNDLE_VERSION = "1.0.0"
    LICENSE = "CC-BY-4.0"
    PIPELINE_NAME = "cheCkOVER"
    PIPELINE_VERSION = "x.y.z"

    now_iso = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    recommended_citation = (
        f"WoC (2026). Species Exposure Bundle: {speciesName}. "
        f"SEB {BUNDLE_NAME}:{speciesName} v{BUNDLE_VERSION}."
    )

    snapshot_id = request.args.get("snapshot_id", default=None, type=int)
    normalized_name, species_dir, snapshot, error_response = resolve_species_dir(
        speciesName,
        snapshot_id
    )
    if error_response is not None:
        return error_response

    narratives_dir = os.path.join(species_dir, "narratives")
    maps_dir = os.path.join(species_dir, "maps")
    citations_dir = os.path.join(species_dir, "citations")

    resources = []

    narrative_filename = f"{normalized_name}_canonical.md"
    narrative_path = os.path.join(narratives_dir, narrative_filename)

    narrative_payload = None
    if os.path.isfile(narrative_path):
        try:
            with open(narrative_path, "r", encoding="utf-8") as f:
                species_narrative = f.read()

            cleaned_narrative = remove_md_sections(
                species_narrative,
                ["Geographic Distribution", "Conservation Context"],
                level=4
            )

            pieces = species_narrative.split("FORMAL NARRATIVE SUMMARY (Human-Readable)")
            short = pieces[1].strip() if len(pieces) > 1 else ""

            narrative_payload = {
                "short": short,
                "full": cleaned_narrative,
                "sourceFormat": "md"
            }
        except Exception as e:
            narrative_payload = {"error": f"Failed to read narrative: {str(e)}"}

    resources.append({
        "name": "Narrative",
        "format": "json",
        "content": narrative_payload
    })

    bib_csv_path = os.path.join(citations_dir, f"{normalized_name}_bibliography.csv")
    bib_bib_path = os.path.join(citations_dir, f"{normalized_name}_bibliography.bib")
    bib_cff_path = os.path.join(citations_dir, f"{normalized_name}_CITATION.cff")

    bibliography_payload = None
    if os.path.isfile(bib_csv_path):
        try:
            with open(bib_csv_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                bibliography_payload = list(reader)
        except Exception as e:
            bibliography_payload = {"error": f"Failed to parse bibliography CSV: {str(e)}"}

    resources.append({
        "name": "Bibliography",
        "format": "json",
        "content": bibliography_payload
    })

    geo_files = {
        "EOO": f"{normalized_name}_EOO.geojson"
    }

    for geo_type, filename in geo_files.items():
        geo_path = os.path.join(maps_dir, filename)

        geo_payload = None
        if os.path.isfile(geo_path):
            try:
                with open(geo_path, "r", encoding="utf-8") as f:
                    geo_payload = json.load(f)
            except Exception as e:
                geo_payload = {"error": f"Failed to read {geo_type}: {str(e)}"}

        resources.append({
            "name": f"Geolocations ({geo_type})",
            "format": "geojson",
            "content": geo_payload
        })

    include_text_formats = request.args.get("includeTextFormats", "false").lower() == "true"

    if include_text_formats:
        if os.path.isfile(bib_bib_path):
            try:
                with open(bib_bib_path, "r", encoding="utf-8") as f:
                    bib_content = f.read()
                resources.append({
                    "name": "Bibliography (bib)",
                    "format": "json",
                    "content": {
                        "sourceFormat": "bib",
                        "text": bib_content
                    }
                })
            except Exception as e:
                resources.append({
                    "name": "Bibliography (bib)",
                    "format": "json",
                    "content": {"error": f"Failed to read .bib: {str(e)}"}
                })

        if os.path.isfile(bib_cff_path):
            try:
                with open(bib_cff_path, "r", encoding="utf-8") as f:
                    cff_content = f.read()
                resources.append({
                    "name": "Bibliography (cff)",
                    "format": "json",
                    "content": {
                        "sourceFormat": "cff",
                        "text": cff_content
                    }
                })
            except Exception as e:
                resources.append({
                    "name": "Bibliography (cff)",
                    "format": "json",
                    "content": {"error": f"Failed to read .cff: {str(e)}"}
                })

    manifest = {
        "schemaVersion": SCHEMA_VERSION,
        "id": f"{BUNDLE_NAME}:{speciesName}",
        "name": BUNDLE_NAME,
        "version": BUNDLE_VERSION,
        "created": now_iso,
        "updated": now_iso,
        "license": LICENSE,
        "recommendedCitation": recommended_citation,
        "generatedBy": {
            "pipeline": PIPELINE_NAME,
            "pipelineVersion": PIPELINE_VERSION
        },
        "species": {
            "scientificName": speciesName
        },
        "snapshotUsed": {
            "id": snapshot.id,
            "snapshot_name": snapshot.snapshot_name,
            "snapshot_date": snapshot.snapshot_date.isoformat()
        } if snapshot else None,
        "resources": resources
    }

    return jsonify(manifest), 200


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
    snapshot_id = request.args.get("snapshot_id", default=None, type=int)

    normalized_name, species_dir, snapshot, error_response = resolve_species_dir(
        speciesName,
        snapshot_id
    )
    if error_response is not None:
        return error_response

    maps_dir = os.path.join(species_dir, "maps")

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

    if mode == "inline":
        with open(filePath, "r", encoding="utf-8") as f:
            geojson_data = json.load(f)

        body = json.dumps({
            "snapshot_used": {
                "id": snapshot.id,
                "snapshot_name": snapshot.snapshot_name,
                "date": snapshot.date.isoformat()
            } if snapshot else None,
            "data": geojson_data
        }, ensure_ascii=False, indent=2)

        return Response(
            body,
            status=200,
            content_type="application/json; charset=utf-8"
        )

    return send_file(
        filePath,
        mimetype="application/geo+json",
        as_attachment=True
    )


@SpeciesService.route("/species/<path:speciesName>/snapshots", methods=['GET'])
def getSpeciesSnapshots(speciesName):
    species = Species.query.filter_by(species_name=speciesName).first()

    if species is None:
        return build_response({"error": f"Species '{speciesName}' not found"}, 404)

    snapshots = []

    for species_snapshot in species.species_snapshots:
        snapshot = species_snapshot.snapshot

        snapshots.append(
            SpeciesSnapshotItemDTO(
                snapshot_id=snapshot.id,
                snapshot_name=snapshot.snapshot_name,
                snapshot_date=snapshot.snapshot_date,
                indigenous_aoo=species_snapshot.indigenous_aoo,
                indigenous_records=species_snapshot.indigenous_records,
                non_indigenous_aoo=species_snapshot.non_indigenous_aoo,
                non_indigenous_records=species_snapshot.non_indigenous_records
            )
        )

    response = SpeciesSnapshotsOutDTO(
        species_id=species.id,
        species_name=species.species_name,
        snapshots=snapshots
    )

    return build_response(response.model_dump(mode="json"), 200)