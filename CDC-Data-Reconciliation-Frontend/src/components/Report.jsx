import { useState, useEffect } from "react"
import config from "../config.json"

export default function Report({ reportID }) {
  const [results, setResults] = useState(null)

  useEffect(() => {
    fetchReport(reportID)
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
