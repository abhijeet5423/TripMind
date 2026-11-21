import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  isValidLatLng,
  DEFAULT_MAP_CONFIG,
  OSM_TILE_URL,
  OSM_ATTRIBUTION,
} from '../../utils/mapUtils.js'
import { MapContext } from '../../context/MapContext.jsx'

/**
 * LeafletMapContainer Component
 *
 * Reusable, responsive mapping container using Leaflet and OpenStreetMap raster tiles.
 * Handles React 19 lifecycle patterns, avoids duplicate initializations, observes container
 * resize for size invalidation, and strictly displays OpenStreetMap attribution.
 */
export default function LeafletMapContainer({
  center = DEFAULT_MAP_CONFIG.center,
  zoom = DEFAULT_MAP_CONFIG.zoom,
  minZoom = DEFAULT_MAP_CONFIG.minZoom,
  maxZoom = DEFAULT_MAP_CONFIG.maxZoom,
  scrollWheelZoom = DEFAULT_MAP_CONFIG.scrollWheelZoom,
  tileUrl = OSM_TILE_URL,
  attribution = OSM_ATTRIBUTION,
  height = '420px',
  className = '',
  ariaLabel = 'Interactive trip map',
  onMapReady,
  children,
}) {
  const containerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const initialCenterRef = useRef(center)
  const initialZoomRef = useRef(zoom)
  const onMapReadyRef = useRef(onMapReady)
  const [mapInstance, setMapInstance] = useState(null)

  // Keep latest onMapReady callback without re-initializing map
  useEffect(() => {
    onMapReadyRef.current = onMapReady
  })

  // 1. Initialize Leaflet Map Instance
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Guard against duplicate initialization (e.g., React 19 StrictMode mounting)
    if (mapInstanceRef.current) return

    // Validate center coordinates with safe default fallback
    const initialCenter = isValidLatLng(initialCenterRef.current)
      ? initialCenterRef.current
      : DEFAULT_MAP_CONFIG.center
    const initialZoom =
      typeof initialZoomRef.current === 'number'
        ? initialZoomRef.current
        : DEFAULT_MAP_CONFIG.zoom

    // Instantiate Leaflet map
    const map = L.map(container, {
      center: initialCenter,
      zoom: initialZoom,
      minZoom,
      maxZoom,
      scrollWheelZoom,
      zoomControl: false, // Position standard zoom control deliberately
    })

    // Standard Zoom Control placed on top-right for thumb/cursor ergonomics
    L.control.zoom({ position: 'topright' }).addTo(map)

    // OpenStreetMap Raster Tile Layer with mandatory attribution
    L.tileLayer(tileUrl, {
      attribution,
      maxZoom,
      crossOrigin: true,
    }).addTo(map)

    mapInstanceRef.current = map
    setMapInstance(map)

    if (typeof onMapReadyRef.current === 'function') {
      onMapReadyRef.current(map)
    }

    // Container resize observation for size invalidation
    let resizeObserver = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize()
        }
      })
      resizeObserver.observe(container)
    }

    // Force size invalidation on next frame and after brief delay to eliminate partial gray tiles
    const rafId = requestAnimationFrame(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize()
      }
    })
    const timerId = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize()
      }
    }, 150)

    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(timerId)
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      setMapInstance(null)
    }
  }, [tileUrl, attribution, minZoom, maxZoom, scrollWheelZoom])

  // 2. Smoothly update center and zoom when props change after initialization
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !mapInstance) return

    if (isValidLatLng(center)) {
      const currentCenter = map.getCenter()
      const latDiff = Math.abs(currentCenter.lat - center[0])
      const lngDiff = Math.abs(currentCenter.lng - center[1])
      const zoomDiff = typeof zoom === 'number' && zoom !== map.getZoom()

      if (latDiff > 0.0001 || lngDiff > 0.0001 || zoomDiff) {
        map.setView(center, typeof zoom === 'number' ? zoom : map.getZoom(), {
          animate: true,
        })
      }
    }
  }, [center, zoom, mapInstance])

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className={`relative w-full rounded-2xl overflow-hidden border border-sage bg-sand-ivory shadow-xs select-none ${className}`.trim()}
      style={{ minHeight: height, height }}
    >
      <div
        ref={containerRef}
        data-testid="leaflet-map-element"
        className="w-full h-full z-0"
        tabIndex={0}
      />

      {/* Render children (ActivityMarkers, overlays) with live MapContext */}
      <MapContext.Provider value={mapInstance}>
        {mapInstance && children}
      </MapContext.Provider>
    </div>
  )
}
