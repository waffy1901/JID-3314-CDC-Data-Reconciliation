import { useState, useEffect } from "react"

export default function Report({ reportID }) {
  const [results, setResults] = useState(null)
  const [statistics, setStatistics] = useState(null)
  const [showDiseaseStats, setShowDiseaseStats] = useState(false)

  useEffect(() => {
    // Here you will fetch the report data from the API based on the reportID
    const fetchReportStatistics = async () => {
		try {
			const response = await fetch(`http://localhost:8000/report_statistics/${reportID}`)
			if (!response.ok) {
				throw new Error(`Error: ${response.statusText}`)
			}
			const data = await response.json()
			setStatistics(data)
		} catch(error) {
			console.error("Unable to fetch statistics", error)
		}
	}
	if (reportID) {
		fetchReportStatistics()
	}
  }, [reportID])

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

		  {/* Report and Disease Specific Stats */}
		  <div>
			{statistics && (
			<>
			<button
				type="button"
				className="bg-blue-400 text-white px-5 py-2 rounded-md hover:bg-blue-600 mb-4"
				onClick={toggleDiseaseStats}
			>
				{showDiseaseSpecificStats ? "Hide" : "Show"} Disease Specific Stats
			</button>

			{!showDiseaseSpecificStats ? (
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
					<td>{statistics.TotalCases}</td>
					<td>{statistics.TotalDuplicates}</td>
					<td>{statistics.TotalMissingFromCDC}</td>
					<td>{statistics.TotalMissingFromStates}</td>
					<td>{statistics.TotalWrongAttributes}</td>
					</tr>
				</tbody>
				</table>
			) : (
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
					{statistics.DiseaseStats.map((stat) => (
					<tr key={stat.EventCode}>
						<td>{stat.EventCode}</td>
						<td>{stat.TotalCases}</td>
						<td>{stat.TotalDuplicates}</td>
						<td>{stat.TotalMissingFromCDC}</td>
						<td>{stat.TotalMissingFromStates}</td>
						<td>{stat.TotalWrongAttributes}</td>
					</tr>
					))}
				</tbody>
				</table>
			)}
			</>
		)}
		  </div>

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
