# Python-based container hosting a the maine Web Service module (serices for workflow creation and scheduling)
# Latest LTS release: Python 3.12. active support will end in April 2025; security updates will continue until October 2028.
FROM python:3.12 as base

# The same directory set-up as the volume location in the docker-compose file
WORKDIR /home/server/   

COPY ./requirements.txt /home/server/requirements.txt
# install required packages
RUN pip install -r requirements.txt

COPY . /home/server/

# COPY ./species_packages /home/DATA_FILES/


# ARG DOCKER_USER
# ENV DOCKER_USER=${DOCKER_USER}

# RUN if [ "$DOCKER_USER" = "cheminova" ]; then groupadd -g 1001 cheminova && useradd -u 1001 -g cheminova -m -s /bin/bash cheminova; fi
# USER $DOCKER_USER

ENV FLASK_ENV=debug
# Launch server app
CMD ["python", "ServerApp.py init_db"]
# CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "wsgi:ChemiFlaskApp"]
                 