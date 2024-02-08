import csv
import argparse
from datetime import datetime
import os


class CaseResult:
    def __init__(self, caseID, eventCode, MMWRYear, MMWRWeek, reason, reasonID) -> None:
        self.caseID = caseID
        self.eventCode = eventCode
        # self.caseClassStatus = caseClassStatus
        # self.eventName = eventName   -- Shouldn't we have eventName in the state CSV file? Query does not currently return it
        # self.state = state
        # self.eventDate = eventDate   -- Shouldn't we have eventDate in the state CSV file? Query does not currently return it
        self.MMWRYear = MMWRYear
        self.MMWRWeek = MMWRWeek
        self.reason = reason
        self.reasonID = reasonID
        
# dictionary holding all stats for this report
stats = {}

results: list[CaseResult] = []


def get_state_dict(state_file):
    state_dict = {}
    # Open the state CSV file
    with open(state_file, newline='') as csvfile:
        # Create a CSV reader object
        reader = csv.DictReader(csvfile)
        # Loop through each row in the CSV file
        for row in reader:
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
                
            # checking if a given event code already exists in the stats dictionary
            if row['EventCode'] in stats and row['CaseClassStatus'] == 'Confirmed':
                
                # checking to make sure a duplicate case is not being put into the totalCases count, appending this new unique caseID to the list
                if row['CaseID'] not in stats[row['EventCode']]['caseIDs']:
                    stats[row['EventCode']]['totalCases'] += 1
                    stats[row['EventCode']]['caseIDs'].append(row['CaseID'])
                
                # adding duplicate case to totalDuplicates count for this event code
                else:
                    stats[row['EventCode']]['totalDuplicates'] += 1
            
            # placing a given event code into the stats dictionary if it does not already exist and initializing it only if this is a confirmed case.
            else:
                if row['CaseClassStatus'] == 'Confirmed':
                    stats[row['EventCode']] = {'totalCases': 1, 'totalDuplicates': 0, 'totalMissingCDC': 0, 'totalMissingState': 0, 'totalWrongAttributes': 0, 'caseIDs': [row['CaseID']]}

    return state_dict


def get_cdc_dict(cdc_file):
    cdc_dict = {}
    # Open the cdc CSV file
    with open(cdc_file, newline='') as csvfile:
        # Create a CSV reader object
        reader = csv.DictReader(csvfile)
        # Loop through each row in the CSV file
        for row in reader:
            # Add the row as a dictionary to the list
            if row['CaseID'] in cdc_dict:
                results.append(CaseResult(row['CaseID'], row['EventCode'],
                               row['MMWRYear'], row['MMWRWeek'], "Duplicate Case ID found in CDC CSV File", "1"))
            else:
                cdc_dict[row['CaseID']] = row

    return cdc_dict

# place the stats stuff here
def comp(state_dict, cdc_dict):
    for state_case_id in state_dict:
        state_row = state_dict[state_case_id]

        # If a case ID is in the state DB but not the CDC DB, mark it as a missing case
        if state_case_id not in cdc_dict:
            results.append(CaseResult(
                state_case_id, state_row['EventCode'], state_row['MMWRYear'], state_row['MMWRWeek'], "Case ID not found in CDC CSV File", "2"))
            
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
                    results.append(CaseResult(state_case_id, state_row['EventCode'], state_row[
                                   'MMWRYear'], state_row['MMWRWeek'], "Case has different attributes between State and CDC CSV Files", "3"))
                    
                    # making sure to also count this discrepancy in the stats.csv file
                    stats[state_row['EventCode']]['totalWrongAttributes'] += 1
                    break

            # Remove the case from the CDC dict so we can track what cases are missing from the state side
            del cdc_dict[state_case_id]

    # If there exists cases in the CDC dictionary still, mark it as a missing case on the state side
    for cdc_case_id in cdc_dict:
        cdc_row = cdc_dict[cdc_case_id]
        results.append(CaseResult(cdc_case_id, cdc_row['EventCode'],
                       cdc_row['MMWRYear'], cdc_row['MMWRWeek'], "Case ID not found in State CSV File", "4"))
        
        # adding in missing from state count, total case count, and caseID to the stats dict
        # only counting cases that are not duplicates, otherwise counting as duplicate
        if cdc_row['CaseID'] not in stats[cdc_row['EventCode']]['caseIDs']:
            stats[cdc_row['EventCode']]['totalMissingState'] += 1
            stats[cdc_row['EventCode']]['totalCases'] += 1
            stats[cdc_row['EventCode']]['caseIDs'].append(cdc_row['CaseID'])
        else:
            stats[cdc_row['EventCode']]['totalDuplicates'] += 1


def main():
    parser = argparse.ArgumentParser(
        prog="CompareCDCAndState", description='Compare CDC and State CSV files')
    parser.add_argument('-s', '--state', help='Local Path to State CSV file')
    parser.add_argument('-c', '--cdc', help='Local Path to CDC CSV file')
    parser.add_argument('-o', '--output', help='Local Path to Output CSV file')

    args = parser.parse_args()

    state_dict = get_state_dict(args.state)
    cdc_dict = get_cdc_dict(args.cdc)

    comp(state_dict, cdc_dict)

    # Create Results CSV File and write the results to it
    with open(args.output, 'w', newline='') as csvfile:
        fieldnames = ['CaseID', 'EventCode', 'MMWRYear',
                      'MMWRWeek', 'Reason', 'ReasonID']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        writer.writeheader()
        for result in results:
            writer.writerow({'CaseID': result.caseID, 'EventCode': result.eventCode, 'MMWRYear': result.MMWRYear,
                            'MMWRWeek': result.MMWRWeek, 'Reason': result.reason, 'ReasonID': result.reasonID})
            
    # writing to stats.csv but first grabbing the folder location of results.csv
    output_directory = os.path.dirname(args.output)
    if output_directory == '':
        output_directory = '.'
    
    # i was not sure how to handle reportID in the csv, so i have left it out from this. If it needs to be added into the csv then do it here
    # writing stats data to the csv
    with open(os.path.join(output_directory, 'stats.csv'), 'w', newline='') as csvfile:
        fieldNames = ['EventCode', 'TotalCases', 'TotalDuplicates',
                      'TotalMissingFromCDC', 'TotalMissingFromState', 'TotalWrongAttributes']
        writer = csv.DictWriter(csvfile, fieldnames=fieldNames)
        
        writer.writeheader()
        for eventCode, data in stats.items():
            writer.writerow({'EventCode': eventCode, 'TotalCases': data['totalCases'],
                             'TotalDuplicates': data['totalDuplicates'], 'TotalMissingFromCDC': data['totalMissingCDC'],
                             'TotalMissingFromState': data['totalMissingState'], 'TotalWrongAttributes': data['totalWrongAttributes']})

if __name__ == "__main__":
    main()
