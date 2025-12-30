import React, { useEffect, useRef } from 'react'
import { Loader } from '@googlemaps/js-api-loader'

interface MapComponentProps {
  onCoordsUpdate: (info: string) => void;
}

interface ShapeRegistry {
  polygons: google.maps.Polygon[];
  circles: google.maps.Circle[];
  rectangles: google.maps.Rectangle[];
  markers: google.maps.Marker[];
}

const MapComponent: React.FC<MapComponentProps> = ({ onCoordsUpdate }) => {
  const mapRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      version: 'weekly',
      libraries: ['drawing', 'geometry', 'places']
    })

    loader.load().then(async () => {
      const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary
      
      let map: google.maps.Map
      let drawingManager: google.maps.drawing.DrawingManager
      let selectedShape: google.maps.Polygon | google.maps.Circle | google.maps.Rectangle | google.maps.Marker | null = null
      let all_overlays: any[] = []

      const location = new google.maps.LatLng(28.620585, 77.228609)
      const mapOptions: google.maps.MapOptions = {
        zoom: 12,
        center: location,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      }

      if (mapRef.current) {
        map = new Map(mapRef.current, mapOptions)
      } else {
        return
      }

      function clearSelection() {
        if (selectedShape) {
          if (typeof (selectedShape as any).setEditable === 'function') {
            (selectedShape as any).setEditable(false)
          }
          selectedShape = null
        }
      }

      function setSelection(shape: any) {
        clearSelection()
        selectedShape = shape
        if (typeof shape.setEditable === 'function') {
            shape.setEditable(true)
        }
      }

      function CenterControl(controlDiv: HTMLDivElement) {
        // Set CSS for the control border.
        const controlUI = document.createElement('div')
        controlUI.style.backgroundColor = '#fff'
        controlUI.style.border = '2px solid #fff'
        controlUI.style.borderRadius = '3px'
        controlUI.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)'
        controlUI.style.cursor = 'pointer'
        controlUI.style.marginBottom = '22px'
        controlUI.style.textAlign = 'center'
        controlUI.title = 'Select to delete the shape'
        controlDiv.appendChild(controlUI)

        // Set CSS for the control interior.
        const controlText = document.createElement('div')
        controlText.style.color = 'rgb(25,25,25)'
        controlText.style.fontFamily = 'Roboto,Arial,sans-serif'
        controlText.style.fontSize = '16px'
        controlText.style.lineHeight = '38px'
        controlText.style.paddingLeft = '5px'
        controlText.style.paddingRight = '5px'
        controlText.innerHTML = 'Delete Selected Area'
        controlUI.appendChild(controlText)

        //to delete the polygon
        controlUI.addEventListener('click', function () {
            deleteSelectedShape()
        })
      }

      drawingManager = new google.maps.drawing.DrawingManager({
        drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: [
                google.maps.drawing.OverlayType.POLYGON,
                google.maps.drawing.OverlayType.CIRCLE,
                google.maps.drawing.OverlayType.RECTANGLE,
                google.maps.drawing.OverlayType.MARKER,
            ]
        },
        markerOptions: {
            draggable: true
        },
        circleOptions: {
            fillColor: '#ffff00',
            fillOpacity: 0.2,
            strokeWeight: 3,
            clickable: false,
            editable: true,
            zIndex: 1
        },
        polygonOptions: {
            clickable: true,
            draggable: false,
            editable: true,
            fillColor: '#ADFF2F',
            fillOpacity: 0.5,
        },
        rectangleOptions: {
            clickable: true,
            draggable: true,
            editable: true,
            fillColor: '#ffff00',
            fillOpacity: 0.5,
        }
      })

      drawingManager.setMap(map)

      // Store references to shapes
      const shapes: ShapeRegistry = {
        polygons: [],
        circles: [],
        rectangles: [],
        markers: []
      }

      const updateDrawingModes = () => {
        const hasGeofence = shapes.polygons.length > 0 || shapes.circles.length > 0 || shapes.rectangles.length > 0
        const modes = [google.maps.drawing.OverlayType.MARKER]
        
        if (!hasGeofence) {
            modes.push(google.maps.drawing.OverlayType.POLYGON)
            modes.push(google.maps.drawing.OverlayType.CIRCLE)
            modes.push(google.maps.drawing.OverlayType.RECTANGLE)
        }

        drawingManager.setOptions({
            drawingControlOptions: {
                position: google.maps.ControlPosition.TOP_CENTER,
                drawingModes: modes
            }
        })
      }

      const checkGeofence = () => {
        if (shapes.markers.length === 0) return ""

        // We assume single marker for status display as per previous logic implied context
        const marker = shapes.markers[0]
        const position = marker.getPosition()
        
        if (!position) return ""

        let isInside = false
        let insideWhat: string[] = []

        shapes.polygons.forEach(poly => {
            if (google.maps.geometry.poly.containsLocation(position, poly)) {
                isInside = true
                insideWhat.push('Polygon')
            }
        })

        shapes.circles.forEach(circle => {
            if (google.maps.geometry.spherical.computeDistanceBetween(position, circle.getCenter()!) <= circle.getRadius()) {
                isInside = true
                insideWhat.push('Circle')
            }
        })

        shapes.rectangles.forEach(rect => {
            if (rect.getBounds() && rect.getBounds()!.contains(position)) {
                isInside = true
                insideWhat.push('Rectangle')
            }
        })

         return `<br/><br/>${isInside 
            ? `<span style="color:green; font-weight:bold">INSIDE ${insideWhat.join(', ')}</span>` 
            : `<span style="color:red; font-weight:bold">OUTSIDE</span>`}`
      }

      const updateShapeCoords = function (shape: any) {
        if (shape.getMap && !shape.getMap()) return 

        let info = ""
        
        const geofenceInfo: string[] = []
        if (shapes.polygons.length > 0) {
             const s = shapes.polygons[0]
             const len = s.getPath().getLength()
             const coords: string[] = []
             for (let i = 0; i < len; i++) {
                coords.push(s.getPath().getAt(i).toUrlValue(6))
             }
             geofenceInfo.push(`Polygon Coords: ${coords.join(', ')}`)
        }
        if (shapes.circles.length > 0) {
             const s = shapes.circles[0]
             geofenceInfo.push(`Circle: Center(${s.getCenter()!.toUrlValue(6)}), Radius(${s.getRadius().toFixed(2)}m)`)
        }
        if (shapes.rectangles.length > 0) {
             const s = shapes.rectangles[0]
             const b = s.getBounds()
             if (b) geofenceInfo.push(`Rectangle: NE(${b.getNorthEast().toUrlValue(6)}), SW(${b.getSouthWest().toUrlValue(6)})`)
        }
        
        const markerInfo: string[] = []
        shapes.markers.forEach(m => {
            const pos = m.getPosition()
            if(pos) markerInfo.push(`Marker: Position(${pos.toUrlValue(6)})`)
        })

        info = geofenceInfo.join('<br/>') + (geofenceInfo.length && markerInfo.length ? '<br/><br/>' : '') + markerInfo.join('<br/>')
        
        info += checkGeofence()

        onCoordsUpdate(info)
      }

      function deleteSelectedShape() {
        if (selectedShape) {
          selectedShape.setMap(null)
          
          // Remove from registry
          // Note: references in JS are strict equality.
          shapes.polygons = shapes.polygons.filter(s => s !== selectedShape)
          shapes.circles = shapes.circles.filter(s => s !== selectedShape)
          shapes.rectangles = shapes.rectangles.filter(s => s !== selectedShape)
          shapes.markers = shapes.markers.filter(s => s !== selectedShape)

          selectedShape = null
          
          updateDrawingModes()
          // Update UI with remaining shapes (if any)
          updateShapeCoords({ getMap: () => true }) 
        }
      }

      google.maps.event.addListener(drawingManager, 'overlaycomplete', function (event: google.maps.drawing.OverlayCompleteEvent) {
        all_overlays.push(event)
        drawingManager.setDrawingMode(null)

        const newShape = event.overlay;
        (newShape as any).type = event.type

        // Register shape
        if (event.type === google.maps.drawing.OverlayType.POLYGON) shapes.polygons.push(newShape as google.maps.Polygon)
        if (event.type === google.maps.drawing.OverlayType.CIRCLE) shapes.circles.push(newShape as google.maps.Circle)
        if (event.type === google.maps.drawing.OverlayType.RECTANGLE) shapes.rectangles.push(newShape as google.maps.Rectangle)
        if (event.type === google.maps.drawing.OverlayType.MARKER) {
            // clear old markers if we want only one 'user'
            shapes.markers.forEach(m => m.setMap(null))
            shapes.markers = [newShape as google.maps.Marker]
        }
        
        updateDrawingModes()
        updateShapeCoords(newShape)

        // Add listeners based on type
        if (event.type === google.maps.drawing.OverlayType.POLYGON) {
            const path = (newShape as google.maps.Polygon).getPath()
            google.maps.event.addListener(path, 'insert_at', () => updateShapeCoords(newShape))
            google.maps.event.addListener(path, 'set_at', () => updateShapeCoords(newShape))
            google.maps.event.addListener(path, 'remove_at', () => updateShapeCoords(newShape))
        } else if (event.type === google.maps.drawing.OverlayType.CIRCLE) {
            google.maps.event.addListener(newShape, 'radius_changed', () => updateShapeCoords(newShape))
            google.maps.event.addListener(newShape, 'center_changed', () => updateShapeCoords(newShape))
        } else if (event.type === google.maps.drawing.OverlayType.RECTANGLE) {
            google.maps.event.addListener(newShape, 'bounds_changed', () => updateShapeCoords(newShape))
        } else if (event.type === google.maps.drawing.OverlayType.MARKER) {
            google.maps.event.addListener(newShape, 'dragend', () => {
                updateShapeCoords(newShape)
            })
        }

        // Selection logic
        google.maps.event.addListener(newShape, 'click', function () {
            setSelection(newShape)
        })
        setSelection(newShape)
      })

      const centerControlDiv = document.createElement('div')
      CenterControl(centerControlDiv)
      centerControlDiv.tabIndex = 1
      map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(centerControlDiv)

      // Search Box
      const input = document.createElement('input')
      input.style.marginTop = '10px'
      input.style.border = '1px solid transparent'
      input.style.borderRadius = '2px'
      input.style.boxSizing = 'border-box'
      input.style.height = '40px'
      input.style.outline = 'none'
      input.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.3)'
      input.style.fontSize = '15px'
      input.style.fontFamily = 'Roboto'
      input.style.textOverflow = 'ellipses'
      input.style.padding = '0 11px 0 13px'
      input.style.width = '400px'
      input.style.maxWidth = '100%'
      input.placeholder = 'Search Google Maps'

      const searchBox = new google.maps.places.SearchBox(input)
      map.controls[google.maps.ControlPosition.TOP_LEFT].push(input)

      map.addListener('bounds_changed', () => {
        searchBox.setBounds(map.getBounds()!)
      })

      searchBox.addListener('places_changed', () => {
        const places = searchBox.getPlaces()

        if (!places || places.length === 0) {
            return
        }

        const bounds = new google.maps.LatLngBounds()
        places.forEach(place => {
            if (!place.geometry || !place.geometry.location) {
                console.log("Returned place contains no geometry")
                return
            }

            if (place.geometry.viewport) {
                bounds.union(place.geometry.viewport)
            } else {
                bounds.extend(place.geometry.location)
            }
        })
        map.fitBounds(bounds)
      })

    })
  }, [])

  return <div ref={mapRef} style={{ height: '400px', width: '700px' }} />
}

export default MapComponent
