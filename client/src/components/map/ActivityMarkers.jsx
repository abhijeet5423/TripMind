import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { useMap } from '../../context/MapContext.jsx'
import {
  getPlottableActivities,
  createMarkerSvg,
  buildActivityPopupContent,
} from '../../utils/mapUtils.js'

/**
 * ActivityMarkers Component
 *
 * Renders interactive Leaflet markers and editorial popups for all itinerary activities
 * with valid WGS84 coordinates across trip days.
 *
 * Automatically manages Leaflet LayerGroup lifecycle, cleans up stale markers,
 * prevents duplicate markers on React re-renders, and fits map bounds appropriately.
 */
export default function ActivityMarkers({
  days = [],
  currency = 'INR',
  map: propMap,
  fitBoundsOnUpdate = true,
  onMarkerClick,
}) {
  const contextMap = useMap()
  const map = propMap || contextMap
  const layerGroupRef = useRef(null)
  const onMarkerClickRef = useRef(onMarkerClick)

  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick
  })

  // 1. Initialize Leaflet LayerGroup attached to the active map instance
  useEffect(() => {
    if (!map) return

    const layerGroup = L.layerGroup().addTo(map)
    layerGroupRef.current = layerGroup

    return () => {
      layerGroup.clearLayers()
      map.removeLayer(layerGroup)
      layerGroupRef.current = null
    }
  }, [map])

  // 2. Synchronize markers whenever itinerary days or currency change
  useEffect(() => {
    if (!map || !layerGroupRef.current) return

    const layerGroup = layerGroupRef.current
    layerGroup.clearLayers()

    const plottable = getPlottableActivities(days)
    if (plottable.length === 0) return

    plottable.forEach((act) => {
      const icon = L.divIcon({
        className: 'tripmind-custom-pin',
        html: createMarkerSvg(act.category, act.dayNumber),
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -42],
      })

      const marker = L.marker([act.latitude, act.longitude], {
        icon,
        title: act.title || act.name || 'Activity',
        alt: act.title || act.name || 'Activity',
      })

      const popupHtml = buildActivityPopupContent(act, currency)
      marker.bindPopup(popupHtml, {
        maxWidth: 280,
        className: 'tripmind-popup-wrapper',
      })

      marker.on('click', () => {
        if (typeof onMarkerClickRef.current === 'function') {
          onMarkerClickRef.current(act)
        }
      })

      layerGroup.addLayer(marker)
    })

    // 3. Fit bounds to all plotted markers
    if (fitBoundsOnUpdate && plottable.length > 0) {
      if (plottable.length === 1) {
        // Single marker: center comfortably without excessive zoom
        map.setView(plottable[0].latLng, 14, { animate: true })
      } else {
        // Multiple markers: fit bounds with padding, bounded to maxZoom 15
        const bounds = L.latLngBounds(plottable.map((p) => p.latLng))
        if (bounds.isValid()) {
          map.fitBounds(bounds, {
            padding: [48, 48],
            maxZoom: 15,
            animate: true,
          })
        }
      }
    }
  }, [map, days, currency, fitBoundsOnUpdate])

  return null
}
