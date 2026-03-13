import sys
import os
from flask import Flask
from flask_cors import CORS
from Database.DBConnection import db
from Services.UserService import UserService
from Services.RecordService import RecordService
from Services.SpeciesService import SpeciesService
from Services.IUCBService import Iucn_bp


# Create Server
ServerApp = Flask(__name__)

# For development purposes only!!!!!!!
CORS(ServerApp)


# Configure Application Database access
# ServerApp.config['SQLALCHEMY_DATABASE_URI'] =  "mysql+pymysql://root:pass@localhost:3308/woc"
ServerApp.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URI")
ServerApp.config['SQLALCHEMY_ECHO'] = True
ServerApp.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
ServerApp.config['SERVER_NAME'] = os.getenv("REACT_APP_API_BASE_URL")

# Add web service files (blueprints)
ServerApp.register_blueprint(UserService)
ServerApp.register_blueprint(RecordService)
ServerApp.register_blueprint(SpeciesService)
ServerApp.register_blueprint(Iucn_bp)


# Start Server
if __name__ == "__main__":
    # Start Database initialization => creates all tables described within Database/Tables.py
    # This can be activated by calling with the "init_db" parameter: "python ServerApp.pyinit_db"
    if len(sys.argv)>1:
        if sys.argv[1] == "init_db":
           db.init_app(ServerApp) 
           with ServerApp.app_context():
              db.create_all()

    else:
        db.init_app(ServerApp)
        
    # ServerApp.run(host="localhost", port=5000)
    # if __name__ == "__main__":
    ServerApp.run(host="0.0.0.0", port=5000, debug=True)