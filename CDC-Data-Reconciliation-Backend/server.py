import uvicorn
from fastapi import FastAPI, File, Response, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import asyncio
import csv
import os
import sys
import uuid
import pyodbc
import json
import sqlite3

app = FastAPI()

origins = [
    "http://localhost:5173"
]

app.add_middleware(CORSMiddleware, allow_origins=origins,
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


# Method to test if you have the correct ODBC Driver
# print("List of ODBC Drivers:")
# dlist = pyodbc.drivers()
# for drvr in dlist:
#     print('LIST OF DRIVERS:' + drvr)

# Load config.json
app.dir = os.path.dirname(__file__)


config_file_path = os.path.join(app.dir, "config.json")
with open(config_file_path, "r") as f:
    app.config = json.load(f)

# Connect to the SQL Server
connection_string = 'DRIVER={' + app.config["driver"] + \
    '}' + \
    f';SERVER={app.config["server"]};DATABASE={app.config["database"]};UID={app.config["username"]};PWD={app.config["password"]}'

app.conn = pyodbc.connect(connection_string)

# SQLite reports and cases tables setup
database_file_path = os.path.join(app.dir, "database.db")
app.liteConn = sqlite3.connect(database_file_path)
cur = app.liteConn.cursor()

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
        CaseID TEXT, 
        EventCode TEXT,
        MMWRYear INTEGER, 
        MMWRWeek INTEGER,
        Reason TEXT, 
        ReasonID INTEGER,
        FOREIGN KEY (ReportID) REFERENCES Reports(ID)
)''')

# Statistics table
cur.execute('''
    CREATE TABLE IF NOT EXISTS Statistics(
    ID INTEGER PRIMARY KEY NOT NULL,
    ReportID INTEGER NOT NULL,
    EventCode TEXT NOT NULL,
    TotalCases INTEGER,
    TotalDuplicates INTEGER,
    TotalMissingFromCDC INTEGER,
    TotalMissingFromState INTEGER,
    TotalWrongAttributes INTEGER,
    FOREIGN KEY (ReportID) REFERENCES Reports(ID)
)''')
app.liteConn.commit()


@app.post("/manual_report")
async def manual_report(state_file: UploadFile = File(None), cdc_file:  UploadFile = File(None)):
    folder_name = "temp"
    if not os.path.exists(os.path.join(app.dir, "temp")):
        os.makedirs(os.path.join(app.dir, "temp"))

    id = str(uuid.uuid4())
    os.makedirs(os.path.join(app.dir, folder_name, id))

    cdc_content = await cdc_file.read()
    cdc_save_to = os.path.join(app.dir, folder_name, id, cdc_file.filename)
    with open(cdc_save_to, "wb") as f:
        f.write(cdc_content)

    state_content = await state_file.read()
    state_save_to = os.path.join(app.dir, folder_name, id, state_file.filename)
    with open(state_save_to, "wb") as f:
        f.write(state_content)

    res_file = os.path.join(app.dir, folder_name, id, "results.csv")
    process = await asyncio.create_subprocess_exec(sys.executable, os.path.join(app.dir, "compare.py"), '-c', cdc_save_to, '-s', state_save_to, '-o', res_file)
    await process.wait()

    res = []
    with open(res_file, newline='') as csvfile:
        # Create a CSV reader object
        reader = csv.DictReader(csvfile)
        # Loop through each row in the CSV file
        for row in reader:
            # Add the row as a dictionary to the list
            res.append(tuple(row.values()))


    numDiscrepancies = len(res)
    reportId = insert_report(numDiscrepancies)

    stats_file = os.path.join(app.dir, folder_name, id, "stats.csv")
    stats_list = []

    with open(stats_file, newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            tup = (reportId,) + tuple(row.values())
            stats_list.append(tup)

    # Add reportId to each row
    new_res = [(reportId,) + row for row in res]

    insert_cases(new_res)
    insert_statistics(stats_list)

    # remove temp files / folder
    os.remove(cdc_save_to)
    os.remove(state_save_to)
    os.remove(res_file)
    os.remove(stats_file)
    os.rmdir(os.path.join(app.dir, folder_name, id))

    return Response(status_code=200)


@app.post("/automatic_report")
async def automatic_report(year: int, cdc_file:  UploadFile = File(None)):
    # Run query to retrieve data from NBS ODSE database
    (column_names, state_content) = run_query(year)
    if not len(state_content) > 0:
        raise Exception("Query resulted in no data")

    # Create temp file structure
    folder_name = "temp"
    if not os.path.exists(os.path.join(app.dir, folder_name)):
        os.makedirs(os.path.join(app.dir, folder_name))

    id = str(uuid.uuid4())
    os.makedirs(os.path.join(app.dir, folder_name, id))

    # Write queried state data to csv
    state_save_to = os.path.join(app.dir, folder_name, id, "state.csv")
    with open(state_save_to, "w", newline='') as f:
        writer = csv.writer(f)
        writer.writerow(column_names)
        writer.writerows(state_content)

    # Write user-uploaded CDC data to local csv
    cdc_content = await cdc_file.read()
    cdc_save_to = os.path.join(app.dir, folder_name, id, cdc_file.filename)
    with open(cdc_save_to, "wb") as f:
        f.write(cdc_content)

    # Do comparison
    res_file = os.path.join(app.dir, folder_name, id, "results.csv")
    process = await asyncio.create_subprocess_exec(sys.executable, os.path.join(app.dir, "compare.py"), '-c', cdc_save_to, '-s', state_save_to, '-o', res_file)
    await process.wait()

    # Add results to the response
    res = []
    with open(res_file, newline='') as csvfile:
        # Create a CSV reader object
        reader = csv.DictReader(csvfile)
        # Loop through each row in the CSV file
        for row in reader:
            # Add the row as a dictionary to the list
            res.append(tuple(row.values()))

    numDiscrepancies = len(res)
    reportId = insert_report(numDiscrepancies)

    stats_file = os.path.join(app.dir, folder_name, id, "stats.csv")
    stats_list = []

    with open(stats_file, newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            tup = (reportId,) + tuple(row.values())
            stats_list.append(tup)

    # Add reportId to each row
    new_res = [(reportId,) + row for row in res]

    insert_cases(new_res)
    insert_statistics(stats_list)
    
    # remove temp files / folder
    os.remove(cdc_save_to)
    os.remove(state_save_to)
    os.remove(res_file)
    os.remove(stats_file)
    os.rmdir(os.path.join(app.dir, folder_name, id))

    return Response(status_code=200)


@app.get("/reports")
async def get_report_summaries():
    # Fetch all reports from the SQLite database, ordered by date and time (newest reports at the top)
    try:
        cur = app.liteConn.cursor()
        cur.execute(
            "SELECT * FROM Reports ORDER BY CreatedAtDate DESC, TimeOfCreation DESC;")

        return [dict(zip([column[0] for column in cur.description], row)) for row in cur.fetchall()]

    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return None


@app.get("/reports/{report_id}")
async def get_report_cases(report_id: int):
    """
    Endpoint to fetch cases for a report by its ID.
    """
    report = fetch_reports_from_db(report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


def fetch_reports_from_db(report_id: int):
    """
    Function to fetch a report from the SQLite database.
    """
    try:
        cur = app.liteConn.cursor()
        cur.execute("SELECT * FROM Cases WHERE ReportID = ?", (report_id,))
        return [dict(zip([column[0] for column in cur.description], row)) for row in cur.fetchall()]
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return None

def insert_report(noOfDiscrepancies):
    try:
        cur = app.liteConn.cursor()
        cur.execute("INSERT INTO Reports (CreatedAtDate, TimeOfCreation, NumberOfDiscrepancies)  VALUES (DATE('now'), TIME('now'), ?)", (noOfDiscrepancies,))
        report_id = cur.lastrowid
        app.liteConn.commit()
        return report_id
    except Exception as e:
        app.liteConn.rollback()
        raise e
    

def insert_statistics(stats):
    try:
        cur = app.liteConn.cursor()
        cur.executemany("INSERT INTO Statistics (ReportID, EventCode, TotalCases, TotalDuplicates, TotalMissingFromCDC, TotalMissingFromState, TotalWrongAttributes) VALUES (?, ?, ?, ?, ?, ?, ?)", stats)
        app.liteConn.commit()
    except Exception as e:
        app.liteConn.rollback()
        raise e

def insert_cases(res):
    try:
        cur = app.liteConn.cursor()
        cur.executemany("INSERT INTO Cases (ReportID, CaseID, EventCode, MMWRYear, MMWRWeek, Reason, ReasonID) VALUES (?, ?, ?, ?, ?, ?, ?)", res)
        app.liteConn.commit()
    except Exception as e:
        app.liteConn.rollback()
        raise e


def run_query(year: int):
    query = None
    query_file_path = os.path.join(app.dir, "query.sql")
    with open(query_file_path, 'r') as f:
        query = f.read()

    cursor = app.conn.cursor()
    cursor.execute(query, year)
    # Return the queried data as a list of dicts
    column_names = [col[0] for col in cursor.description]
    data = cursor.fetchall()
    # # (List comprehension might be too slow for large datasets;
    # #  may need to consider pandas or numpy in the future)
    # data = [dict(zip(column_names, row)) for row in row_data]

    return (column_names, data)


if __name__ == "__main__":
    # Run the API with uvicorn
    uvicorn.run("server:app", host="localhost", port=8000)

    # Use this command to run the API with reloading enabled (DOES NOT WORK ON WINDOWS)
    # uvicorn.run("server:app", host="localhost", port=8000, reload=True)
