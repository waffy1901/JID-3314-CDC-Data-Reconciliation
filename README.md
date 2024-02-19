# CDC Data Reconciliation Tool
Our tool compares data between the CDC database and databases from the 50 U.S. state health departments. The data from the states is regarded as “the source of truth”. If any data in the CDC database errs from the state databases in any way, it will be regarded as a discrepancy that may be remedied. 
# Release Notes
## Version 0.2.0 
### New Features
View report history with timestamps
View full reports with a summary of statistics at the top
Ability to view statistics for specific diseases along with the capability of hiding disease-specific statistics to focus on statistics for an entire report
### Bug Fixes
EventName is now properly set in our SQL query and is accessible in our statistics and results tables
Reports in the report history now solely show the reports that you have generated
### Known Issues
The timestamp of a report in the report history may not exactly match one’s timezone
Reports differing in only the number of cases in the CDC.csv file does not work as intended
## Version 0.1.0 
### New Features
Pull data automatically from state database
Toggle between manual uploading of state data and automatic pulling
Download .csv report of the discrepancies between the state and CDC data
### Bug Fixes
N/A
### Known Issues
N/A
