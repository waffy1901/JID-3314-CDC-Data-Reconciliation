import { useState } from "react"
import config from "../config.json"

export default function CreateReport({ onDone }) {
  const [stateFile, setStateFile] = useState(null)
  const [cdcFile, setCDCFile] = useState(null)
  const [isAutomatic, setIsAutomatic] = useState(true)
  const [inputValue, setInputValue] = useState('')
  const [isCDCFilter, setIsCDCFilter] = useState(true)

  const currYear = 2023
  const yearList = Array.from({ length: 101}, (_, index) => currYear + index)

  const handleCheckboxChange = (e) => {
    setIsAutomatic(e.target.checked)
  }

  const handleCDCFilterChange = (e) => {
    setIsCDCFilter(e.target.checked)
  }

  const handleStateFileChange = (e) => {
    setStateFile(e.target.files[0])
  }

  const handleCDCFileChange = (e) => {
    setCDCFile(e.target.files[0])
  }
  const handleInputChange = (e) => {
    setInputValue(e.target.value)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Checking whether the checkbox for automatic upload is ticked or not
    if (isAutomatic) {
      if (cdcFile === null) {
        console.error("Files not uploaded!")
        return
      }
      if (!inputValue) {
        console.error("Year not selected!")
        return
      }
      // Setting form data to year and cdcFile
      const formdata = new FormData()
      formdata.append("cdc_file", cdcFile)
      formdata.append("isCDCFilter", isCDCFilter)

      // Run the automatic report fetching
      try {
        const response = await fetch(config.API_URL + `/automatic_report?year=${inputValue}&isCDCFilter=${isCDCFilter}`, {
          method: "POST",
          body: formdata,
        })

        if (response.ok) {
          console.log("Automatic report fetched successfully!")
          onDone()
        } else {
          console.error("Failed to fetch automatic report!")
        }
      } catch (e) {
        console.error("Error fetching automatic report - " + e)
      }

      // ran if the automatic report checkbox is not ticked
    } else {
      if (stateFile === null || cdcFile === null) {
        console.error("Files not uploaded!")
        return
      }

      const formdata = new FormData()
      formdata.append("state_file", stateFile)
      formdata.append("cdc_file", cdcFile)
      formdata.append("isCDCFilter", isCDCFilter)

      try {
        const response = await fetch(config.API_URL + `/manual_report?isCDCFilter=${isCDCFilter}`, {
          method: "POST",
          body: formdata,
        })

        if (response.ok) {
          console.log("Files uploaded successfully!")
          onDone()
        } else {
          console.error("Files failed to upload!")
        }
      } catch (e) {
        console.error("Error Creating Report - " + e)
      }
    }
  }

  return (
    <div className='flex flex-col items-center'>
      <div className='bg-slate-300 w-[400px] rounded-xl mx-auto'>
        <form onSubmit={handleSubmit} className='h-full'>
          <div className='flex flex-col gap-6 items-center justify-center h-full my-8'>
            <label style={{fontWeight: 'bold', color: '#4c80ae'}} >Create New Report</label>
            <label>
              <input type='checkbox' checked={isAutomatic} onChange={handleCheckboxChange} style={{ marginRight: '4px'}} />
              Use Automatic Report
            </label>
            <label htmlFor='cdc_file' style={{fontWeight: 'bold'}}>Upload CDC <span style={{fontStyle: 'italic'}}>.csv</span> File:</label>
            <div style={{ marginLeft: '100px'}}>
            <input type='file' id='cdc_file' onChange={handleCDCFileChange}  />
            </div>
            {isAutomatic && (
            <>
            <label  style={{fontWeight: 'bold'}}>Specify Year to Query From : </label>
            <select
              value={inputValue}
              onChange={handleInputChange}
              style={{ border: '1px solid black', borderRadius: '2px', backgroundColor: 'whitesmoke'}}
            >
              <option
                value="">Select a Year
              </option>
              {yearList.map((year) => (
                <option
                  key={year}
                  value={year}>{year}
                </option>
              ))}
            </select>
            </>
            )}
            <label>
              <input type='checkbox' checked={isCDCFilter} onChange={handleCDCFilterChange} style={{ marginRight: '4px'}} />
              Compare Existing Diseases in CDC Only
            </label>

            {
              // checking if the automatic report checkbox has been ticked, and disabling the state .csv file upload if it is
            }

            {!isAutomatic && (
              <>
                <label htmlFor='state_file'>Upload State .csv File</label>
                <div style={{ marginLeft: '100px'}}>
                <input type='file' id='state_file' onChange={handleStateFileChange} />
                </div>
              </>
            )}
            <button type='submit' className='bg-[#7aa2c4] text-white px-4 py-2 rounded-md hover:bg-[#4c80ae]'>
              Submit &#10003;
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
