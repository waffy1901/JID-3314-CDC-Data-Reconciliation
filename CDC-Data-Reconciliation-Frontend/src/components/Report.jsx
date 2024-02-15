import { useState, useEffect } from "react"
import config from "../config.json"

export default function Report({ reportID }) {
  const [results, setResults] = useState(null)
  const [statistics, setStatistics] = useState(null)
  const [showDiseaseStats, setShowDiseaseStats] = useState(false)

  useEffect(() => {
	const fetchReportStatistics = async () => {
		try {
			const statsResponse = await fetch(config.API_URL + "/report_statistics/" + reportID)
			if (!statsResponse.ok) {
				throw new Error(`Error: ${response.statusText}`)
			}
			const statsData = await statsResponse.json()
			
			let totalCases = 0
			let totalDuplicates = 0
			let totalMissingFromCDC = 0
			let totalMissingFromState = 0
			let totalWrongAttributes = 0
			const eventCodeStats = {}

			statsData.forEach(stat => {
				totalCases += stat.TotalCases || 0
				totalDuplicates += stat.TotalDuplicates || 0
				totalMissingFromCDC += stat.TotalMissingFromCDC || 0
				totalMissingFromState += stat.TotalMissingFromState || 0
				totalWrongAttributes += stat.TotalWrongAttributes || 0

				if (!eventCodeStats[stat.EventCode]) {
					eventCodeStats[stat.EventCode] = {
						TotalCases: 0,
						TotalDuplicates: 0,
						TotalMissingFromCDC: 0,
						TotalMissingFromState: 0,
						TotalWrongAttributes: 0,
					}
				}

				eventCodeStats[stat.EventCode].TotalCases += stat.TotalCases || 0;
				eventCodeStats[stat.EventCode].TotalDuplicates += stat.TotalDuplicates || 0;
				eventCodeStats[stat.EventCode].TotalMissingFromCDC += stat.TotalMissingFromCDC || 0;
				eventCodeStats[stat.EventCode].TotalMissingFromState += stat.TotalMissingFromState || 0;
				eventCodeStats[stat.EventCode].TotalWrongAttributes += stat.TotalWrongAttributes || 0;
			})

			setStatistics({
				totals: {
				  TotalCases: totalCases,
				  TotalDuplicates: totalDuplicates,
				  TotalMissingFromCDC: totalMissingFromCDC,
				  TotalMissingFromState: totalMissingFromState,
				  TotalWrongAttributes: totalWrongAttributes,
				},
				eventCodeStats: eventCodeStats
			})
		} catch(error) {
			console.error("Unable to fetch statistics", error)
		}
	}
	if (reportID) {
		fetchReportStatistics()
		fetchReport(reportID) // moved this line here to resolve a server error code of 422
	}
  }, [reportID])

  const fetchReport = async (reportID) => {
    try {
      const response = await fetch(config.API_URL + "/reports/" + reportID)
      if (response.ok) {
        const data = await response.json()
        setResults(data)
      } else {
        console.error("Failed to fetch report!")
      }
    } catch (e) {
      console.error("Error fetching report - " + e)
    }
  }

  const toggleDiseaseStats = () => {
	setShowDiseaseStats(!showDiseaseStats)
  }

  const handleDownload = (e) => {
    const csvData =
      "CaseID,EventCode,MMWRYear,MMWRWeek,Reason,ReasonID\n" +
      results
        .map(
          (result) =>
            `${result.CaseID},${result.EventCode},${result.MMWRYear},${result.MMWRWeek},${result.Reason},${result.ReasonID}`
        )
        .join("\n")
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8," })
    const linkURL = URL.createObjectURL(blob)
    const linking = document.createElement("a")
    linking.setAttribute("href", linkURL)
    linking.setAttribute("download", "Results.csv")
    linking.textContent = "Download"

    document.body.appendChild(linking)
    linking.click()
    document.body.removeChild(linking)
  }

  return (
    <div className='mt-5 py-5 w-5/6 max-w-6xl flex flex-col items-center'>
      {results && (
        <>
          <div className='flex flex-col items-center mb-5'>
            <h2 className='text-2xl font-bold'>Results</h2>
            <h3>Number of Cases Different: {results.length}</h3>
          </div>

		  {/* Toggle Button for Disease Specific Stats */}
		  {statistics && (
          <>
            <button
              type="button"
              className="bg-blue-400 text-white px-5 py-2 rounded-md hover:bg-blue-600 mb-4"
              onClick={toggleDiseaseStats}
            >
              {showDiseaseStats ? "Hide" : "Show"} Disease Specific Stats
            </button>

            {/* Overall Report Statistics */}
            {!showDiseaseStats && (
              <table className="w-full text-center mb-4">
                <thead>
                  <tr className="border-b-2 border-slate-900">
                    <th>Total Cases</th>
                    <th>Total Duplicates</th>
                    <th>Total Missing From CDC</th>
                    <th>Total Missing From States</th>
                    <th>Total Wrong Attributes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{statistics.totals.TotalCases}</td>
                    <td>{statistics.totals.TotalDuplicates}</td>
                    <td>{statistics.totals.TotalMissingFromCDC}</td>
                    <td>{statistics.totals.TotalMissingFromState}</td>
                    <td>{statistics.totals.TotalWrongAttributes}</td>
                  </tr>
                </tbody>
              </table>
            )}

            {/* Disease Specific Statistics */}
            {showDiseaseStats && (
              <table className="w-full text-center">
                <thead>
                  <tr className="border-b-2 border-slate-900">
                    <th>Event Code</th>
                    <th>Total Cases</th>
                    <th>Total Duplicates</th>
                    <th>Total Missing From CDC</th>
                    <th>Total Missing From States</th>
                    <th>Total Wrong Attributes</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(statistics.eventCodeStats).map(([eventCode, stats]) => (
                    <tr key={eventCode}>
                      <td>{eventCode}</td>
                      <td>{stats.TotalCases}</td>
                      <td>{stats.TotalDuplicates}</td>
                      <td>{stats.TotalMissingFromCDC}</td>
                      <td>{stats.TotalMissingFromState}</td>
                      <td>{stats.TotalWrongAttributes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

          <div className='flex flex-col items-center mb-4'>
            <button
              type='button'
              className='bg-blue-400 text-white px-5 py-2 rounded-md hover:bg-blue-600'
              onClick={handleDownload}
            >
              Download CSV
            </button>
          </div>

          <table className='w-full text-center'>
            <tr className='border-b-2 border-slate-900'>
              <th>CaseID</th>
              <th>EventCode</th>
              <th>MMWRYear</th>
              <th>MMWRWeek</th>
              <th>Reason</th>
              <th>ReasonID</th>
            </tr>
            {results.map((result) => {
              return (
                <tr key={result.CaseID}>
                  <td>{result.CaseID}</td>
                  <td>{result.EventCode}</td>
                  <td>{result.MMWRYear}</td>
                  <td>{result.MMWRWeek}</td>
                  <td>{result.Reason}</td>
                  <td>{result.ReasonID}</td>
                </tr>
              )
            })}
          </table>
        </>
      )}
    </div>
  )
}
