import csv
import argparse
from datetime import datetime
import os


class CaseResult:
    def __init__(self, caseID, eventCode, eventName, MMWRYear, MMWRWeek, reason, reasonID) -> None:
        self.caseID = caseID
        self.eventCode = eventCode
        self.eventName = eventName
        # self.caseClassStatus = caseClassStatus
        # self.state = state
        # self.eventDate = eventDate   -- Shouldn't we have eventDate in the state CSV file? Query does not currently return it
        self.MMWRYear = MMWRYear
        self.MMWRWeek = MMWRWeek
        self.reason = reason
        self.reasonID = reasonID


# dictionary holding all stats for this report
stats = {}

results: list[CaseResult] = []


def get_state_dict(state_file, eventCodes):
    state_dict = {}
    # Open the state CSV file
    with open(state_file, newline='', encoding='utf-8') as csvfile:
        # Create a CSV reader object
        reader = csv.DictReader(csvfile)
        # Loop through each row in the CSV file
        for row in reader:
            # If the EventCode is not a number, skip the row (Getting rid of values like MAPPING and ZT_PP_Condition3)
            if row['EventCode'].isnumeric() == False:
                continue
            # Here we are filtering out the rows of the database by the event code that they have
            if eventCodes is not None and row['EventCode'] not in eventCodes:
                continue
            if row['CaseID'] in state_dict:
                # If the case ID already exists in the dictionary, check to see if the new row has a more recent add_time

                existing_date_string = state_dict[row['CaseID']]['add_time']
                existing_datetime = datetime.strptime(
                    existing_date_string, "%Y-%m-%d %H:%M:%S.%f")

                new_date_string = row['add_time']
                new_datetime = datetime.strptime(
                    new_date_string, "%Y-%m-%d %H:%M:%S.%f")

                if new_datetime > existing_datetime:
                    state_dict[row['CaseID']] = row

            else:
                # Add the row as a dictionary to the list
                state_dict[row['CaseID']] = row

    return state_dict


def get_cdc_dict(cdc_file, eventCodes):
    cdc_dict = {}
    # Open the cdc CSV file
    with open(cdc_file, newline='') as csvfile:
        # Create a CSV reader object
        reader = csv.DictReader(csvfile)
        # Loop through each row in the CSV file
        for row in reader:
            # Add the row as a dictionary to the list
            if eventCodes is not None and row['EventCode'] not in eventCodes:
                continue
            if row['CaseID'] in cdc_dict:
                results.append(CaseResult(row['CaseID'], row['EventCode'],
                               row['EventName'], row['MMWRYear'], row['MMWRWeek'], "Duplicate Case ID found in CDC CSV File", "1"))
                
                # adding duplicates to duplicate count if needed
                stats[row['EventCode']]['totalDuplicates'] += 1
                
            else:
                cdc_dict[row['CaseID']] = row
                if row['EventCode'] not in stats:
                    stats[row['EventCode']] = {'eventName': row['EventName'], 'totalCases': 0, 'totalDuplicates': 0, 'totalMissingCDC': 0, 'totalMissingState': 0, 'totalWrongAttributes': 0}

    return cdc_dict

# place the stats stuff here
def comp(state_dict, cdc_dict):
    for state_case_id in state_dict:
        state_row = state_dict[state_case_id]
        
        # checking if a given event code already exists in the stats dictionary
        if state_row['EventCode'] in stats:
            stats[state_row['EventCode']]['totalCases'] += 1
        else:
            stats[state_row['EventCode']] = {'eventName': state_row['EventName'], 'totalCases': 1, 'totalDuplicates': 0, 'totalMissingCDC': 0, 'totalMissingState': 0, 'totalWrongAttributes': 0}

        # If a case ID is in the state DB but not the CDC DB, mark it as a missing case
        if state_case_id not in cdc_dict:
            results.append(CaseResult(
                state_case_id, state_row['EventCode'], state_row['EventName'], state_row['MMWRYear'], state_row['MMWRWeek'], "Case ID not found in CDC CSV File", "2"))
            
            # counting the missing case in totalMissingCDC for this eventCode
            stats[state_row['EventCode']]['totalMissingCDC'] += 1
            
        else:
            i = 0
            for attribute in state_row:
                # Skip the first 2 attributes since they are not included in CDC CSV file
                if i < 2:
                    i += 1
                    continue

                state_attribute = state_row[attribute]
                cdc_attribute = cdc_dict[state_case_id][attribute]

                if state_attribute == "":
                    state_attribute = "NULL"

                if cdc_attribute == "":
                    cdc_attribute = "NULL"

                # If a case has different attributes between state and CDC DBs, mark it as such
                if state_attribute != cdc_attribute:
                    results.append(CaseResult(state_case_id, state_row['EventCode'], state_row['EventName'], state_row[
                                   'MMWRYear'], state_row['MMWRWeek'], "Case has different attributes between State and CDC CSV Files", "3"))
                    
                    # making sure to also count this discrepancy in the stats.csv file
                    stats[state_row['EventCode']]['totalWrongAttributes'] += 1
                    break

            # Remove the case from the CDC dict so we can track what cases are missing from the state side
            del cdc_dict[state_case_id]

    # If there exists cases in the CDC dictionary still, mark it as a missing case on the state side
    for cdc_case_id in cdc_dict:
        cdc_row = cdc_dict[cdc_case_id]
        results.append(CaseResult(cdc_case_id, cdc_row['EventCode'], cdc_row['EventName'],
                       cdc_row['MMWRYear'], cdc_row['MMWRWeek'], "Case ID not found in State CSV File", "4"))
        
        # adding in missing from state count, total case count, and caseID to the stats dict
        # only counting cases that are not duplicates, otherwise counting as duplicate
        if cdc_row['EventCode'] in stats:
            stats[cdc_row['EventCode']]['totalMissingState'] += 1
            stats[cdc_row['EventCode']]['totalCases'] += 1
        else:
            stats[cdc_row['EventCode']] = {'eventName': cdc_row['EventName'], 'totalCases': 1, 'totalDuplicates': 0, 'totalMissingCDC': 0, 'totalMissingState': 1, 'totalWrongAttributes': 0}


def main():
    parser = argparse.ArgumentParser(
        prog="CompareCDCAndState", description='Compare CDC and State CSV files')
    parser.add_argument('-s', '--state', help='Local Path to State CSV file')
    parser.add_argument('-c', '--cdc', help='Local Path to CDC CSV file')
    parser.add_argument('-o', '--output', help='Local Path to Output CSV file')
    parser.add_argument('-e', '--events', help='Event code(s) to filter by, seperated by commas(optional)')
    args = parser.parse_args()

    theEventCodes = args.events.split(',') if args.events else None

    
    cdc_dict = get_cdc_dict(args.cdc, theEventCodes)
    state_dict = get_state_dict(args.state, theEventCodes)

    comp(state_dict, cdc_dict)

    # Create Results CSV File and write the results to it
    with open(args.output, 'w', newline='') as csvfile:
        fieldnames = ['CaseID', 'EventCode', 'EventName', 'MMWRYear',
                      'MMWRWeek', 'Reason', 'ReasonID']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        writer.writeheader()
        for result in results:
            writer.writerow({'CaseID': result.caseID, 'EventCode': result.eventCode, 'EventName': result.eventName,'MMWRYear': result.MMWRYear,
                            'MMWRWeek': result.MMWRWeek, 'Reason': result.reason, 'ReasonID': result.reasonID})
            
    # writing to stats.csv but first grabbing the folder location of results.csv
    output_directory = os.path.dirname(args.output)
    if output_directory == '':
        output_directory = '.'
    
    # i was not sure how to handle reportID in the csv, so i have left it out from this. If it needs to be added into the csv then do it here
    # writing stats data to the csv
    with open(os.path.join(output_directory, 'stats.csv'), 'w', newline='') as csvfile:
        fieldNames = ['EventCode', 'EventName', 'TotalCases', 'TotalDuplicates',
                      'TotalMissingFromCDC', 'TotalMissingFromState', 'TotalWrongAttributes']
        writer = csv.DictWriter(csvfile, fieldnames=fieldNames)
        
        writer.writeheader()
        for eventCode, data in stats.items():
            writer.writerow({'EventCode': eventCode, 'EventName': data['eventName'], 'TotalCases': data['totalCases'],
                             'TotalDuplicates': data['totalDuplicates'], 'TotalMissingFromCDC': data['totalMissingCDC'],
                             'TotalMissingFromState': data['totalMissingState'], 'TotalWrongAttributes': data['totalWrongAttributes']})

if __name__ == "__main__":
    main()
