from flask import Blueprint, request, Response
import json
from pydantic import ValidationError

from Database.DBConnection import db
from Database.Model.User import User
from Database.Schema.UserSchema import *
from Services.Support import *


# Create Service blueprint
UserService = Blueprint('UserService', __name__)



# Define Service endpoint 
@UserService.route("/user/register", methods=['POST'])
def signUp():
    
    if not request.is_json:
        return build_response({"error": "Request must contain JSON"}, 400)
    else:
        data = request.get_json()
        try:
            # Validate the JSON data
            validated_data = UserInDTO(**data)  # Validate data

            # Hash the password and generate salt using bcrypt
            # hashed_password, salt = hash_password(validated_data.password)

            # Create a new user instance
            new_user = User(
                username=validated_data.username,
                email=validated_data.email,
                password = validated_data.password,
                affiliation=validated_data.affiliation,
                role='visitor'
            )

            db.session.add(new_user)
            db.session.commit()
            return build_response(
                {"success": True}, 201)
        except ValidationError as e:
            return build_response({"error": e.errors()}, 400)




# Define Service endpoint 
@UserService.route("/user/user_name/<path:userName>", methods=['GET'])
def getUserByName(userName):
    resp = None

    # Check that the username column in the table is equal to the supplied username
    user = User.query.filter_by(username=userName).first()
    resp = Response(json.dumps(user.toSerializableObject(), indent=4), status=200, mimetype='application/json')
    return resp


# Define Service endpoint 
@UserService.route("/user/user_id/<path:userID>", methods=['GET'])
def getUserbyID(userID):
    resp = None

    # Check that the username column in the table is equal to the supplied username
    user = User.query.get(userID)

    resp = Response(json.dumps(user.toSerializableObject(), indent=4), status=200, mimetype='application/json')
    return resp

