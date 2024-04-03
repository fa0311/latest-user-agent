import json
from typing import Union 

from fastapi import FastAPI, Header, HTTPException

app = FastAPI()


@app.get("/favicon.ico")
async def write_data():
    raise HTTPException(status_code=404)

@app.get("/{key}")
async def write_data(
    key: str,
    user_agent: Union[str, None] = Header(default=None),
):
    with open("output.json", "r") as file:
        data = json.load(file)
    data[key] = user_agent
    with open("output.json", "w") as file:
        json.dump(data, file, indent=4)
    
    return data
