# CDC Data Reconciliation Tool
Our tool compares data between the CDC database and databases from the 50 U.S. state health departments. The data from the states is regarded as “the source of truth”. If any data in the CDC database errs from the state databases in any way, it will be regarded as a discrepancy that may be remedied. 
# Release Notes
## Version 0.4.0 
### New Features
- Static and dynamic table headers
- Visually appealing settings page with color-coded error/success messages
- Command-line interface for comparing cdc and state health department data
- Database username and password encryption
- Warning highlighted in red if the archive folder path is not set
- Error message displayed if unable to create a report
### Bug Fixes
- Debounced input and manual filters were updating the state to the same value, causing the onColumnFiltersChange to be run more than once - the disease statistics and report discrepancies tables are now filtering properly
- Timestamps on reports in the report history match one’s local timezone
### Known Issues
- If you click on one stat in the disease statistics table, the report discrepancies table header will update dynamically as intended - if you go to directly click on another stat, it will change the table title back to report discrepancies
## Version 0.3.0 
### New Features
- Download .csv report of disease-specific data from the statistics table
- Filter the report table to show stat-specific data upon the click of a stat in the statistics table
- Archive folder in the settings page to store old reports
- Filtering, sorting, and pagination for discrepancy and statistics tables
- Reports shown in the report history are capped at 5 at a time
- Option to compare diseases only in the CDC csv file
### Bug Fixes
- Can now create a report even when the archive folder path is not set
### Known Issues
- When both the discrepancy table and statistics table are open at the same time and you resize your window, the statistics table resizes appropriately but the discrepancy table does not resize appropriately
## Version 0.2.0 
### New Features
- View report history with timestamps
- View full reports with a summary of statistics at the top
- Ability to view statistics for specific diseases along with the capability of hiding disease-specific statistics to focus on statistics for an entire report
### Bug Fixes
- EventName is now properly set in our SQL query and is accessible in our statistics and results tables
- Reports in the report history now solely show the reports that you have generated
### Known Issues
- The timestamp of a report in the report history may not exactly match one’s timezone
- Reports differing in only the number of cases in the CDC.csv file does not produce the correct discrepancy list
## Version 0.1.0 
### New Features
- Pull data automatically from state database
- Toggle between manual uploading of state data and automatic pulling
- Download .csv report of the discrepancies between the state and CDC data
### Bug Fixes
- N/A
### Known Issues
- N/A
