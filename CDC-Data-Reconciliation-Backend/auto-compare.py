import csv
import argparse
from datetime import datetime
import os
import pyodbc
from fastapi import FastAPI, File, Response, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json

currConfig = None
connection = None
# Method to test if you have the correct ODBC Driver
# print("List of ODBC Drivers:")
# dlist = pyodbc.drivers()
# for drvr in dlist:
#     print('LIST OF DRIVERS:' + drvr)

# Load config.json
theDir = os.path.dirname(__file__)


config_file_path = os.path.join(theDir "config.json")
with open(config_file_path, "r") as f:
    currConfig = json.load(f)

def main():
    parser = argparse.ArgumentParser(
        prog="AutoCompare", description='Auto Comparison')
    parser.add_argument('-c', '--cdc', help='Local Path to CDC CSV file')
    parser.add_argument('-o', '--output', help='Local Path to Output CSV file')
    # if the parameter below is specified the value stored is true
    parser.add_argument('-f', '--filter', action='store_true', help='Filter by CDC eventCodes')
    args = parser.parse_args()

    # Connect to the SQL Server
    connection_string = 'DRIVER={' + currConfig["driver"] + \
        '}' + \
        f';SERVER={currConfig["server"]};DATABASE={currConfig["database"]};UID={currConfig["db_username"]};PWD={currConfig["db_password"]}'
    connection = pyodbc.connect(connection_string)

if __name__ == "__main__": 
    main()