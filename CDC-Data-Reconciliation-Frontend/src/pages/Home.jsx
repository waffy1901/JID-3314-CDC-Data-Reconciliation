import { useEffect, useState } from "react"
import Report from "../components/Report"
import Button from "../components/Button"
import Modal from "../components/Modal"
import CreateReport from "../components/CreateReport"
import Popover from "../components/Popover"
import config from "../config.json"

export default function Home() {
  const [reportSummaries, setReportSummaries] = useState(null)
  const [currReport, setCurrReport] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [visibleReportsCount, setVisibleReportsCount] = useState(5);

  const dotsOptions = [
    "Rename",
    "Delete",
  ];

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

  const handleOptionClick = async (option, id) => {
    if (option === "Delete") {
      const response = await deleteReport(id)
      if (response.ok) {
        if (id === currReport) {
          setCurrReport(null)
        }
        fetchReportSummaries()
      }
      else {
        console.error("Failed to delete report " + id)
      }
    } else if (option === "Rename") {
      await renameReport(id)
      fetchReportSummaries()
    }
  }

  const deleteReport = async (index) => {
    // TODO: Add a popup modal to check if the user is sure they want to delete
    // add a note to the "are you sure?" popup to clarify that archived CSVs are not deleted
    const response = await fetch(config.API_URL + "/reports/" + index, {method: "DELETE"})

    return response
  }

  const renameReport = async (index) => {
    alert("Renaming reports is not implemented yet.")
  }

  return (
    <>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <CreateReport onDone={() => handleCreatedReport()} />
      </Modal>
      <div className='flex flex-row items-center h-full w-full'>
        <div className='w-[340px] bg-slate-200 h-full flex flex-col items-center gap-4 p-1 pt-8 pb-8 overflow-auto'>
          <Button
            text='Create New Report'
            className='px-4 py-2 shadow-lg'
            onClick={() => setIsModalOpen(true)}>
          </Button>
          {reportSummaries &&
            reportSummaries.slice(0, visibleReportsCount).map((summary) => (
              <div
                key={summary.ID}
                onClick={() => handleSummaryClick(summary.ID)}
                className={`w-4/5 rounded-md p-4 shadow-lg text-slate-950 ${
                  summary.ID === currReport ? "bg-[#b8cde0] cursor-default" : "bg-white hover:bg-slate-100 cursor-pointer"
                }`}
              >
                <h2 className='text-xl font-semibold'>
                  Report {summary.ID}
                  <span className="float-right cursor-pointer overflow-visible mx-2">
                  <Popover
                    content={
                      dotsOptions.map((option) => (
                        <div 
                          key={option}
                          onClick={(e) => {e.stopPropagation(); handleOptionClick(option, summary.ID)}} 
                          className="text-lg font-normal hover:text-slate-500">
                            {option}
                        </div>
                      ))
                    }
                  >
                    <span className="hover:text-slate-500">
                      <p className="px-1">⋮</p>
                    </span>
                  </Popover>
                  </span>
                </h2>
                <h2>Discrepancies: {summary.NumberOfDiscrepancies}</h2>
                <h2>{new Date(`${summary.CreatedAtDate}T${summary.TimeOfCreation}Z`).toLocaleString("en-US")}</h2>
              </div>
            ))}
            {reportSummaries && visibleReportsCount < reportSummaries.length && (
              <div>
                <Button
                  text='See More'
                  className= 'px-3 py-1 text-sm'
                  onClick={() => setVisibleReportsCount(reportSummaries.length)}>
                </Button>
              </div>
            )}
        </div>
        <div className='bg-slate-50 h-full w-full flex flex-col items-center overflow-auto'>
          <Report reportID={currReport} />
        </div>
      </div>
    </>
  )
}
