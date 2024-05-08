import json

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse

app = FastAPI()


@app.get("/favicon.ico")
async def favicon():
    raise HTTPException(status_code=404)


@app.get("/{key}")
async def write_data(
    request: Request,
    key: str,
):
    with open("output.json", "r") as file:
        data = json.load(file)
    data[key] = request.headers.get("user-agent")
    with open("output.json", "w") as file:
        json.dump(data, file, indent=4)

    with open("header.json", "r") as file:
        data = json.load(file)
    data[key] = {}
    for header, value in request.headers.items():
        data[key][header] = value
    with open("header.json", "w") as file:
        json.dump(data, file, indent=4)

    return data


@app.get("/fetch/{key}")
async def fetch_data(
    key: str,
):
    with open("test.html", "r") as file:
        data = file.read()
    return HTMLResponse(
        content=data.replace("{{BROWSER_CLIENT_KEY}}", key),
        status_code=200,
    )
