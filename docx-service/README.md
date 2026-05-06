to start the python exporting service, follow these instructions:

navigate to this document's folder (`repository_root/docx-service`)

run the command in a separate terminal from the node runner (as they are both infinite-loop commands)
`python -m uvicorn main:app --reload --port 8000`

This will spin up a URL that is sent the json application. It will be utilized to turn the json data from questions and answers into a .docx file.
Without this service running, the "Export to Word" button will alert the user that there was an error during export.
