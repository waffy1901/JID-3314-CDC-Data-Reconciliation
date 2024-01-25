import uvicorn
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import csv
import os
import uuid
import pyodbc
import json
import sqlite3

app = FastAPI()

conn = None
config = None

origins = [
    "http://localhost:5173"
]

app.add_middleware(CORSMiddleware, allow_origins=origins,
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.post("/manual_report")
async def manual_report(state_file: UploadFile = File(None), cdc_file:  UploadFile = File(None)):
    folder_name = "temp"
    if not os.path.exists(folder_name):
        os.makedirs(folder_name)

    id = str(uuid.uuid4())
    os.makedirs(f"{folder_name}/{id}")

    cdc_content = await cdc_file.read()
    cdc_save_to = f"./{folder_name}/{id}/{cdc_file.filename}"
    with open(cdc_save_to, "wb") as f:
        f.write(cdc_content)

    state_content = await state_file.read()
    state_save_to = f"./{folder_name}/{id}/{state_file.filename}"
    with open(state_save_to, "wb") as f:
        f.write(state_content)

    res_file = f'./{folder_name}/{id}/results.csv'
    process = await asyncio.create_subprocess_exec('python', './compare.py', '-c', cdc_save_to, '-s', state_save_to, '-o', res_file)
    await process.wait()

    res = []
    with open(res_file, newline='') as csvfile:
        # Create a CSV reader object
        reader = csv.DictReader(csvfile)
        # Loop through each row in the CSV file
        for row in reader:
            # Add the row as a dictionary to the list
            res.append(row)

    # remove temp files / folder
    os.remove(cdc_save_to)
    os.remove(state_save_to)
    os.remove(res_file)
    os.rmdir(f"{folder_name}/{id}")

    return res

@app.post("/automatic_report")
async def automatic_report(year: int, cdc_file:  UploadFile = File(None)):
    # Run query to retrieve data from NBS ODSE database
    state_content = run_query(year)
    if len(state_content) > 0:
        column_names = state_content[0].keys()
    else:
        raise Exception("Query resulted in no data")

    # Create temp file structure
    folder_name = "temp"
    if not os.path.exists(folder_name):
        os.makedirs(folder_name)
    id = str(uuid.uuid4())
    os.makedirs(f"{folder_name}/{id}")

    # Write queried state data to csv
    state_save_to = f"./{folder_name}/{id}/state.csv"
    with open(state_save_to, "w", newline='') as f:
        writer = csv.DictWriter(f, column_names)
        writer.writeheader()
        writer.writerows(state_content)

    # Write user-uploaded CDC data to local csv
    cdc_content = await cdc_file.read()
    cdc_save_to = f"./{folder_name}/{id}/{cdc_file.filename}"
    with open(cdc_save_to, "wb") as f:
        f.write(cdc_content)

    # Do comparison
    res_file = f'./{folder_name}/{id}/results.csv'
    process = await asyncio.create_subprocess_exec('python', './compare.py', '-c', cdc_save_to, '-s', state_save_to, '-o', res_file)
    await process.wait()

    # Write comparison to csv
    res = []
    with open(res_file, newline='') as csvfile:
        # Create a CSV reader object
        reader = csv.DictReader(csvfile)
        # Loop through each row in the CSV file
        for row in reader:
            # Add the row as a dictionary to the list
            res.append(row)

    # remove temp files / folder
    os.remove(cdc_save_to)
    os.remove(state_save_to)
    os.remove(res_file)
    os.rmdir(f"{folder_name}/{id}")

    return res
    

def run_query(year: int):
    query = None
    query_file_path = os.path.join(os.path.dirname(__file__), "query.sql")
    with open(query_file_path, 'r') as f:
        query = f.read()

    cursor = conn.cursor()
    cursor.execute(query, year)

    # Return the queried data as a list of dicts
    column_names = [col[0] for col in cursor.description]
    row_data = cursor.fetchall()
    # (List comprehension might be too slow for large datasets; 
    #  may need to consider pandas or numpy in the future)
    data = [dict(zip(column_names, row)) for row in row_data]

    return data


if __name__ == "__main__":
    # print("List of ODBC Drivers:")
    # dlist = pyodbc.drivers()
    # for drvr in dlist:
    #     print('LIST OF DRIVERS:' + drvr)
    # Load config.json
    config_file_path = os.path.join(os.path.dirname(__file__), "config.json")
    with open(config_file_path, "r") as f:
        config = json.load(f)

    # Connect to the SQL Server
    connection_string = 'DRIVER={' + config["driver"] + \
        '}' + \
        f';SERVER={config["server"]};DATABASE={config["database"]};UID={config["username"]};PWD={config["password"]}'

    conn = pyodbc.connect(connection_string)

    # SQLite reports and cases tables setup
    database_file_path = os.path.join(os.path.dirname(__file__), "database.db")
    liteConn = sqlite3.connect(database_file_path)
    cur = liteConn.cursor()
    # Reports table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS Reports(
            ID INTEGER PRIMARY KEY NOT NULL, 
            CreatedAtDate TEXT,
            TimeOfCreation TEXT, 
            NumberOfDiscrepancies INTEGER    
    )''')
    # Cases table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS Cases(
            ID INTEGER PRIMARY KEY NOT NULL,
            ReportID INTEGER NOT NULL,
            CaseID INTEGER, 
            EventCode TEXT,
            MMWRYear INTEGER, 
            MMWRWeek INTEGER,
            Reason TEXT, 
            ReasonID INTEGER,
            FOREIGN KEY (ReportID) REFERENCES Reports(ID)
    )''')
    liteConn.commit()

    # Run the API with uvicorn
    uvicorn.run("server:app", host="localhost", port=8000)

    # Use this command to run the API with reloading enabled (DOES NOT WORK ON WINDOWS)
    # uvicorn.run("server:app", host="localhost", port=8000, reload=True)
