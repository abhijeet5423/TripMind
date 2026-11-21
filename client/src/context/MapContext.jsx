import { createContext, useContext } from 'react'

/**
 * MapContext provides descendant components (such as ActivityMarkers)
 * direct access to the live Leaflet map instance without prop drilling.
 */
export const MapContext = createContext(null)

/**
 * Custom hook to consume the current Leaflet map instance.
 *
 * @returns {L.Map|null}
 */
export function useMap() {
  return useContext(MapContext)
}
