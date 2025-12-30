import { useState } from 'react'
import MapComponent from './components/MapComponent'
import './App.css'

function App() {
  const [coords, setCoords] = useState('')

  return (
    <div className="App">
      <h2>Google Maps Draw Polygon Get Coordinates</h2>
      <MapComponent onCoordsUpdate={setCoords} />
      <h4>Updated Coordinates (X,Y)</h4>
      <div 
        id="info" 
        style={{
          color: 'red', 
          fontFamily: 'Arial', 
          height: '200px', 
          fontSize: '12px',
          wordWrap: 'break-word',
          whiteSpace: 'pre-wrap'
        }}
      >
        {coords}
      </div>
    </div>
  )
}

export default App
