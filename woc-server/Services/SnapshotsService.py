from datetime import datetime
import os
import zipfile
import tempfile
import shutil

from flask import request, Blueprint
from werkzeug.utils import secure_filename

from Database.DBConnection import db
from Database.Model.Species import Species
from Database.Model.Snapshots import Snapshots
from Database.Model.SpeciesSnapshots import SpeciesSnapshots
from Services.SpeciesService import normalize_species_name
from Services.Support import build_response

# Create Service blueprint
SnapshotsService = Blueprint('SnapshotsService', __name__)

import os
import re


def parse_aoo_values_from_narrative(species_dir_name: str, species_root_dir: str) -> dict:
    narrative_file = os.path.join(
        species_root_dir,
        "narratives",
        f"{species_dir_name}_canonical.md"
    )

    result = {
        "indigenous_aoo": None,
        "non_indigenous_aoo": None,
        "indigenous_records": None,
        "non_indigenous_records": None,
    }

    if not os.path.isfile(narrative_file):
        return result

    with open(narrative_file, "r", encoding="utf-8") as f:
        content = f.read()

    # 2. INDIGENOUS RANGE OVERVIEW -> până la 3.
    indigenous_section_match = re.search(
        r"##\s*2\.\s*INDIGENOUS RANGE OVERVIEW(.*?)(?=##\s*3\.)",
        content,
        re.DOTALL | re.IGNORECASE,
    )
    if indigenous_section_match:
        indigenous_section = indigenous_section_match.group(1)

        aoo_match = re.search(
            r"Area of occupancy\s*\(AOO\)\s*:\**\s*([\d,]+)\s*km",
            indigenous_section,
            re.IGNORECASE,
        )
        if aoo_match:
            result["indigenous_aoo"] = int(aoo_match.group(1).replace(",", ""))

    # 3. NON-INDIGENOUS RANGE OVERVIEW -> până la 4.
    non_indigenous_section_match = re.search(
        r"##\s*3\.\s*NON-INDIGENOUS RANGE OVERVIEW(.*?)(?=##\s*4\.)",
        content,
        re.DOTALL | re.IGNORECASE,
    )
    if non_indigenous_section_match:
        non_indigenous_section = non_indigenous_section_match.group(1)

        non_ind_aoo_match = re.search(
            r"Area of occupancy\s*\(AOO\)\s*:\**\s*([\d,]+)\s*km",
            non_indigenous_section,
            re.IGNORECASE,
        )
        if non_ind_aoo_match:
            result["non_indigenous_aoo"] = int(
                non_ind_aoo_match.group(1).replace(",", "")
            )

        if result["non_indigenous_aoo"] is None:
            if re.search(
                r"no non-indigenous populations detected",
                non_indigenous_section,
                re.IGNORECASE,
            ):
                result["non_indigenous_aoo"] = 0

    # 4.1 Data Summary -> până la următorul ### sau ##
    data_summary_match = re.search(
        r"###\s*4\.1\s*Data Summary(.*?)(?=\n###\s*4\.[2-9]|\n##\s*5\.|\Z)",
        content,
        re.DOTALL | re.IGNORECASE,
    )
    if data_summary_match:
        data_summary_section = data_summary_match.group(1)

        indigenous_records_match = re.search(
            r"Indigenous records\s*:\s*([\d,]+)",
            data_summary_section,
            re.IGNORECASE,
        )
        if indigenous_records_match:
            result["indigenous_records"] = int(
                indigenous_records_match.group(1).replace(",", "")
            )

        non_indigenous_records_match = re.search(
            r"Non-indigenous records\s*:\s*([\d,]+)",
            data_summary_section,
            re.IGNORECASE,
        )
        if non_indigenous_records_match:
            result["non_indigenous_records"] = int(
                non_indigenous_records_match.group(1).replace(",", "")
            )

    # fallback global pentru non_indigenous_aoo
    if result["non_indigenous_aoo"] is None:
        if re.search(
            r"Non-indigenous records\s*:\s*0",
            content,
            re.IGNORECASE,
        ):
            result["non_indigenous_aoo"] = 0

    # fallback global pentru records
    if result["indigenous_records"] is None:
        indigenous_records_match = re.search(
            r"Indigenous records\s*:\s*([\d,]+)",
            content,
            re.IGNORECASE,
        )
        if indigenous_records_match:
            result["indigenous_records"] = int(
                indigenous_records_match.group(1).replace(",", "")
            )

    if result["non_indigenous_records"] is None:
        non_indigenous_records_match = re.search(
            r"Non-indigenous records\s*:\s*([\d,]+)",
            content,
            re.IGNORECASE,
        )
        if non_indigenous_records_match:
            result["non_indigenous_records"] = int(
                non_indigenous_records_match.group(1).replace(",", "")
            )

    return result

def normalize_snapshot_name(snapshot_name: str) -> str:
    name = snapshot_name.strip()
    name = name.replace(" ", "_").replace("(", "_").replace(")", "_")
    name = name.lower()
    return name[0].upper() + name[1:] if name else name


@SnapshotsService.route("/snapshots/upload-archive", methods=["POST"])
def uploadSnapshotArchive():
    temp_dir = None

    try:
        snapshot_name = request.form.get("snapshot_name", "").strip()
        snapshot_date = request.form.get("snapshot_date", "").strip()
        archive_file = request.files.get("archive")

        if not snapshot_name:
            return build_response({"error": "snapshot_name is required"}, 400)

        if not snapshot_date:
            return build_response({"error": "date is required"}, 400)

        if archive_file is None or archive_file.filename == "":
            return build_response({"error": "archive is required"}, 400)

        if not archive_file.filename.lower().endswith(".zip"):
            return build_response({"error": "archive must be a .zip file"}, 400)

        try:
            parsed_date = datetime.strptime(snapshot_date, "%Y-%m-%d").date()
        except ValueError:
            return build_response({"error": "date must be in format YYYY-MM-DD"}, 400)

        normalized_snapshot_name = normalize_snapshot_name(snapshot_name)
        base_dir = "/home/SNAPSHOTS"
        snapshot_dir = os.path.join(base_dir, normalized_snapshot_name)
        os.makedirs(snapshot_dir, exist_ok=True)

        snapshot = Snapshots.query.filter_by(snapshot_name=snapshot_name).first()

        created_snapshot = False
        if snapshot is None:
            snapshot = Snapshots(
                snapshot_name=snapshot_name,
                snapshot_date=parsed_date
            )
            db.session.add(snapshot)
            db.session.flush()
            created_snapshot = True
        else:
            snapshot.snapshot_date = parsed_date
            db.session.flush()

        # construim map pentru lookup rapid:
        # normalized species dir name -> Species object
        all_species = Species.query.all()
        species_map = {
            normalize_species_name(species.species_name): species
            for species in all_species
        }

        temp_dir = tempfile.mkdtemp(prefix="snapshot_upload_")
        archive_path = os.path.join(temp_dir, secure_filename(archive_file.filename))
        archive_file.save(archive_path)

        with zipfile.ZipFile(archive_path, "r") as zip_ref:
            zip_ref.extractall(temp_dir)

        found_species = []
        missing_species_dirs = []
        linked_species = []

        # luăm directoarele de top-level din arhivă
        top_level_entries = os.listdir(temp_dir)
        ignored_entries = {os.path.basename(archive_path)}
        top_level_dirs = [
            entry for entry in top_level_entries
            if entry not in ignored_entries and os.path.isdir(os.path.join(temp_dir, entry))
        ]

        for dir_name in top_level_dirs:
            species = species_map.get(normalize_species_name(dir_name))

            if species is None:
                missing_species_dirs.append(dir_name)
                continue

            found_species.append({
                "species_id": species.id,
                "species_name": species.species_name,
                "directory": dir_name
            })

            species_root_dir = os.path.join(temp_dir, dir_name)
            aoo_values = parse_aoo_values_from_narrative(dir_name, species_root_dir)

            existing_link = SpeciesSnapshots.query.filter_by(
                species_id=species.id,
                snapshot_id=snapshot.id
            ).first()

            if existing_link is None:
                link = SpeciesSnapshots(
                    species_id=species.id,
                    snapshot_id=snapshot.id,
                    indigenous_aoo=aoo_values["indigenous_aoo"],
                    indigenous_records=aoo_values["indigenous_records"],
                    non_indigenous_aoo=aoo_values["non_indigenous_aoo"],
                    non_indigenous_records=aoo_values["non_indigenous_records"]
                )
                db.session.add(link)
            else:
                existing_link.indigenous_aoo = aoo_values["indigenous_aoo"]
                existing_link.indigenous_records = aoo_values["indigenous_records"]
                existing_link.non_indigenous_aoo = aoo_values["non_indigenous_aoo"]
                existing_link.non_indigenous_records = aoo_values["non_indigenous_records"]

            linked_species.append({
                "species_id": species.id,
                "species_name": species.species_name
            })

        # copiem conținutul arhivei în directorul snapshotului
        for dir_name in top_level_dirs:
            source_path = os.path.join(temp_dir, dir_name)
            destination_path = os.path.join(snapshot_dir, dir_name)

            if os.path.exists(destination_path):
                shutil.rmtree(destination_path)

            shutil.copytree(source_path, destination_path)

        db.session.commit()

        return build_response({
            "message": "Snapshot archive uploaded successfully",
            "snapshot": {
                "id": snapshot.id,
                "snapshot_name": snapshot.snapshot_name,
                "snapshot_date": snapshot.snapshot_date.isoformat()
            },
            "snapshot_directory": snapshot_dir,
            "created_snapshot": created_snapshot,
            "linked_species": linked_species,
            "missing_species_directories": missing_species_dirs
        }, 201 if created_snapshot else 200)

    except zipfile.BadZipFile:
        db.session.rollback()
        return build_response({"error": "Invalid zip archive"}, 400)
    except Exception as e:
        db.session.rollback()
        return build_response({"error": str(e)}, 500)
    finally:
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)