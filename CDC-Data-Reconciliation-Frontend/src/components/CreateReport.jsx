import { useState } from "react"
import Button from '../components/Button'
import config from "../config.json"

export default function CreateReport({ onDone }) {
  const [stateFile, setStateFile] = useState(null)
  const [cdcFile, setCDCFile] = useState(null)
  const [isAutomatic, setIsAutomatic] = useState(true)
  const [inputValue, setInputValue] = useState('')
  const [isCDCFilter, setIsCDCFilter] = useState(true)
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedAttributes, setSelectedAttributes] = useState([
    "CaseID", "EventCode", "EventName", "MMWRYear", "MMWRWeek"
  ]);

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

  const handleAttributeChange = (e) => {
    const options = e.target.options;
    const selectedValues = [];
    for (let i = 0; i < options.length; ++i) {
      if (options[i].selected) {
        selectedValues.push(options[i].value);
      }
    }
    setSelectedAttributes(selectedValues);
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
      // Setting form data to year, cdcFile, and attributes
      const formdata = new FormData()
      formdata.append("cdc_file", cdcFile)
      formdata.append("isCDCFilter", isCDCFilter)
      formdata.append("attributes", JSON.stringify(selectedAttributes));

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
          setShowError(true);
          const res = await response.json();
          const errorMessage = res.detail;
          setErrorMessage(errorMessage);
        }
      } catch (e) {
        console.error("Error fetching automatic report - " + e)
        setShowError(true);
        if (typeof e.message === 'string') {
          setErrorMessage(e.message);
        } else {
          setErrorMessage("Internal Server Error")
        }
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
          setShowError(true);
          const res = await response.json();
          const errorMessage = res.detail;
          setErrorMessage(errorMessage);
        }
      } catch (e) {
        console.error("Error Creating Report - " + e)
        setShowError(true);
        if (typeof e.message === 'string') {
          setErrorMessage(e.message);
        } else {
          setErrorMessage("Internal Server Error")
        }
      }
    }
  }

  const Error = ({ message }) => (
    <>
      {/* Overlay div */}
      <div className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 z-40"/>

      {/* Popup div */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-5 z-50 w-auto text-center rounded">
        <label className="font-bold text-black text-xl mb-4 block">
          Error Creating Report
        </label>
        <p className="mb-4">{message}</p>
        <Button
          text='Close'
          className='px-4 py-2 mt-4'
          onClick={() => setShowError(false)}>
        </Button>
      </div>
    </>
  );

  return (
    <div className='flex flex-col items-center'>
      {
      // inserting the popup with the error message if the reponse does not come back ok
      }
      {showError && <Error message={errorMessage} />}
      <div className='bg-white w-[400px] rounded-md mx-auto'>
        <form onSubmit={handleSubmit} className='h-full'>
          <div className='flex flex-col gap-6  h-full my-8'>
            <div className="items-center justify-center mx-auto">
              <label className="font-bold text-black text-2xl" >Create New Report</label>
            </div>
            <label>
              <input type='checkbox'className="ml-4 mr-2" checked={isAutomatic} onChange={handleCheckboxChange} />
              Use Automatic Report
            </label>
            <hr></hr>
            <label htmlFor='cdc_file' className="font-bold ml-4">Upload CDC <span className="italic">.csv</span> File:</label>
            <div className="ml-4">
              <input type='file' id='cdc_file' onChange={handleCDCFileChange}  />
            </div>
            <hr></hr>
            {isAutomatic && (
            <>

            <label className="font-bold ml-4">Specify Year to Query From: </label>
            <select className="border border-black rounded-sm bg-gray-100 text-left  ml-4 w-[150px]"
              value={inputValue}
              onChange={handleInputChange}
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

            <label htmlFor='attributes' className="font-bold ml-4">Select Attributes to Compare:</label>
            <select className="border border-black rounded-sm bg-gray-100 text-left  ml-4 w-[150px] h-[102px]"
              multiple id='attributes' 
              value={selectedAttributes} 
              onChange={handleAttributeChange}
            >
              <option value="CaseID">CaseID</option>
              <option value="EventCode">EventCode</option>
              <option value="EventName">EventName</option>
              <option value="MMWRYear">MMWRYear</option>
              <option value="MMWRWeek">MMWRWeek</option>
            </select>

            </>
            )}
            {!isAutomatic && (
              <>
                <label htmlFor='state_file' className="font-bold ml-4">Upload State <span className="italic">.csv</span> File:</label>
                <div className="ml-4">
                  <input type='file' id='state_file' onChange={handleStateFileChange} />
                </div>
                <label htmlFor='attributes' className="font-bold ml-4">Select Attributes to Compare:</label>
                <select className="border border-black rounded-sm bg-gray-100 text-left  ml-4 w-[150px] h-[102px]"
                  multiple id='attributes' 
                  value={selectedAttributes} 
                  onChange={handleAttributeChange}
                >
                  <option value="CaseID">CaseID</option>
                  <option value="EventCode">EventCode</option>
                  <option value="EventName">EventName</option>
                  <option value="MMWRYear">MMWRYear</option>
                  <option value="MMWRWeek">MMWRWeek</option>
                </select>
              </>
            )}
            <hr></hr>
            <label>
              <input type='checkbox' className=" ml-4 mr-2" checked={isCDCFilter} onChange={handleCDCFilterChange} />
              Compare Existing Diseases in CDC Only
            </label>

            {
              // checking if the automatic report checkbox has been ticked, and disabling the state .csv file upload if it is
            }

            <div className="items-center justify-center mx-auto">
              <Button
                type='submit'
                text='Submit'
                onClick={() => {}}
                className='px-4 py-2 w-20'>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
