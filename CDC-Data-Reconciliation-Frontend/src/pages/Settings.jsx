import { useEffect, useState } from "react"
import config from "../config.json"

export default function Settings() {
  const [tempArchivePath, setTempArchivePath] = useState('')
  const [archivePath, setArchivePath] = useState('')

  const handleArchivePathChange = (e) => {
    setTempArchivePath(e.target.value)
  }

  // Get the config data on page load
  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const response = await fetch(config.API_URL + "/config/archive_path")
      if (response.ok) {
        const data = await response.json()
        if (data.length > 0) {
          setArchivePath(data)
          console.log("Fetched config - archive path is " + data)
        } else {
          console.log("Fetched config, but there's no setting for archive path yet.")
        }
      } else {
        console.error("Failed to fetch config!")
      }
    } catch (e) {
      console.error("Error fetching config - " + e)
    }
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    console.log("Submitting archive path " + tempArchivePath)
    try {
      const response = await fetch(config.API_URL + `/config?field_name=archive_path&value=${tempArchivePath}`, {
        method: "POST"
      })

      if (response.ok) {
        setArchivePath(tempArchivePath)
        console.log("Config submitted successfully!")
      } else {
        console.error("Failed to submit config!")
      }
    } catch (e) {
      console.error("Error submitting config - " + e)
    }
  }

  return (
    <>
      <div className='text-center mt-10 text-xl'><b>Configure settings here:</b></div>
      <form onSubmit={handleSubmit} className="h-full mt-5">
        <div className='flex flex-col gap-4 items-center h-full my-8'>
          <label htmlFor='archive_path'>Current archive folder path: {archivePath}</label>
          <input type='text' id='archive_path' onChange={handleArchivePathChange} />
          <button type='submit' className='bg-blue-400 text-white px-4 py-2 rounded-md hover:bg-blue-600'>
              Submit
          </button>
        </div>
      </form>
    </>
  )
}
