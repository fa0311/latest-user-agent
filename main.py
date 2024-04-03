import json
from typing import Union

from fastapi import FastAPI, Header

app = FastAPI()


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
