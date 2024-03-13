import csv
import argparse
from datetime import datetime
import os
import pyodbc
from fastapi import FastAPI, File, Response, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json

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

def main():
    parser = argparse.ArgumentParser(
        prog="AutoCompare", description='Auto Comparison')
    parser.add_argument('-c', '--cdc', help='Local Path to CDC CSV file')
    parser.add_argument('-o', '--output', help='Local Path to Output CSV file')
    # if the parameter below is specified the value stored is true
    parser.add_argument('-f', '--filter', action='store_true', help='Filter by CDC eventCodes')
    args = parser.parse_args()

    # Connect to the SQL Server
    connection_string = 'DRIVER={' + app.config["driver"] + \
        '}' + \
        f';SERVER={app.config["server"]};DATABASE={app.config["database"]};UID={app.config["db_username"]};PWD={app.config["db_password"]}'
    app.conn = pyodbc.connect(connection_string)