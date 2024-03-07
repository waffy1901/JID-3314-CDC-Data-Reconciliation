import { useEffect, useState } from "react"
import Report from "../components/Report"
import Modal from "../components/Modal"
import CreateReport from "../components/CreateReport"
import config from "../config.json"

export default function Home() {
  const [reportSummaries, setReportSummaries] = useState(null)
  const [currReport, setCurrReport] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [visibleReportsCount, setVisibleReportsCount] = useState(5);

  // Get the report summaries on page load
  useEffect(() => {
    fetchReportSummaries()
  }, [])

  const fetchReportSummaries = async () => {
    try {
      const response = await fetch(config.API_URL + "/reports")
      if (response.ok) {
        const data = await response.json()
        setReportSummaries(data)
      } else {
        console.error("Failed to fetch report summaries!")
      }
    } catch (e) {
      console.error("Error fetching report summaries - " + e)
    }
  }

  const handleSummaryClick = (id) => {
    setCurrReport(id)
  }

  const handleCreatedReport = () => {
    setIsModalOpen(false)
    fetchReportSummaries()
    setVisibleReportsCount(5)
  }

  return (
    <>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <CreateReport onDone={() => handleCreatedReport()} />
      </Modal>

      <div className='flex flex-row items-center h-full w-full'>
        <div className='w-[600px] bg-slate-200 h-full flex flex-col items-center gap-4 p-8 overflow-auto'>
          <button
            className='bg-blue-400 text-white px-4 py-2 rounded-md hover:bg-blue-600'
            onClick={() => setIsModalOpen(true)}
          >
            Create New Report
          </button>
          {reportSummaries &&
            reportSummaries.slice(0, visibleReportsCount).map((summary) => (
              <div
                key={summary.ID}
                onClick={() => handleSummaryClick(summary.ID)}
                className={`w-4/5 rounded-lg p-4 ${
                  summary.ID === currReport ? "bg-indigo-600 text-slate-200" : "bg-indigo-300 hover:bg-indigo-400"
                }`}
              >
                <h2 className='text-xl font-semibold'>Report: {summary.ID}</h2>
                <h2>Discrepancies: {summary.NumberOfDiscrepancies}</h2>
                <h2>
                  Time Created: {new Date(summary.CreatedAtDate).toLocaleDateString("en-US")}{" "}
                  {new Date("2000-01-01T" + summary.TimeOfCreation).toLocaleTimeString("en-US")} UTC
                </h2>
                <h2></h2>
              </div>
            ))}
            {reportSummaries && visibleReportsCount < reportSummaries.length && (
              <button className= 'bg-blue-400 text-white px-4 py-2 rounded-md hover:bg-blue-600' onClick={() => setVisibleReportsCount(reportSummaries.length)}>
                See More
              </button>
            )}
        </div>
        <div className='bg-slate-50 h-full w-full flex flex-col items-center overflow-auto'>
          <Report reportID={currReport} />
        </div>
      </div>
    </>
  )
}
