to start the python exporting service, follow these instructions:

navigate to this document's folder (`repository_root/docx-service`)

create a new virtual environment in python (`python -m venv venv` for python 3.3+)
activate the virtual environment (`./venv/Scripts/activate` for windows, or `./venv/bin/activate` for linux)
install the required packages in `requirements.txt`

run the command in a separate terminal from the node runner (as they are both infinite-loop commands)
`python -m uvicorn main:app --reload --port 8000`

This will spin up a URL that is sent the json application. It will be utilized to turn the json data from questions and answers into a .docx file.
Without this service running, the "Export to Word" button will alert the user that there was an error during export. If you make changes to the main.py please relaunch the server.

# Docker instructions
If you want to set this up in a docker container run these commands

1.docker build -t my-fastapi-app .
2.docker run -p 8000:8000 my-fastapi-app

Notes: python must be named main and WORKDIR must match app = FastAPI()

