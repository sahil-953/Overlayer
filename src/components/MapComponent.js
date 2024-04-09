import React, { useEffect, useRef } from 'react';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import Overlay from 'ol/Overlay.js';
import { OSM, Vector as VectorSource } from 'ol/source.js';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer.js';
import Draw from 'ol/interaction/Draw.js';
import {LineString, Polygon} from 'ol/geom.js';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style.js';
import {getArea, getLength} from 'ol/sphere.js';

const MapComponent = () => {
  const mapRef = useRef(null);
  const drawRef = useRef(null); 

  useEffect(() => {
    const raster = new TileLayer({
      source: new OSM(),
    });

    const source = new VectorSource({ wrapX: false });

    const vector = new VectorLayer({
      source: source,
    });

    let sketch;
    let helpTooltip;
    let measureTooltipElement;
    let measureTooltip;
    const continuePolygonMsg = 'Click to continue drawing the polygon';
    const continueLineMsg = 'Click to continue drawing the line';

    let helpTooltipElement;
    const pointerMoveHandler = function (evt) {
        if (evt.dragging) {
          return;
        }
        let helpMsg = 'Click to start drawing';
      
        if (sketch) {
          const geom = sketch.getGeometry();
          if (geom instanceof Polygon) {
            helpMsg = continuePolygonMsg;
          } else if (geom instanceof LineString) {
            helpMsg = continueLineMsg;
          }
        }
      
        if (helpTooltipElement) {
          helpTooltipElement.innerHTML = helpMsg;
          helpTooltip.setPosition(evt.coordinate);
      
          if (!helpTooltipElement.classList.contains('hidden')) {
            helpTooltipElement.classList.add('hidden');
          }
        }
      };
      
    const map = new Map({
      layers: [raster, vector],
      target: mapRef.current,
      view: new View({
        center: [-11000000, 4600000],
        zoom: 4,
      }),
    });
    map.on('pointermove', pointerMoveHandler);

    map.getViewport().addEventListener('mouseout', function () {
      if (helpTooltipElement) {
        helpTooltipElement.classList.add('hidden');
      }
    });

    const typeSelect = document.getElementById('type');
    let draw;   
    const formatLength = function (line) {
        const length = getLength(line);
        let output;
        if (length > 100) {
          output = Math.round((length / 1000) * 100) / 100 + ' ' + 'km';
        } else {
          output = Math.round(length * 100) / 100 + ' ' + 'm';
        }
        return output;
      };
      const formatArea = function (polygon) {
        const area = getArea(polygon);
        let output;
        if (area > 10000) {
          output = Math.round((area / 1000000) * 100) / 100 + ' ' + 'km<sup>2</sup>';
        } else {
          output = Math.round(area * 100) / 100 + ' ' + 'm<sup>2</sup>';
        }
        return output;
      };
      const style = new Style({
        fill: new Fill({
          color: 'rgba(255, 255, 255, 0.2)',
        }),
        stroke: new Stroke({
          color: 'rgba(0, 0, 0, 0.5)',
          lineDash: [10, 10],
          width: 2,
        }),
        image: new CircleStyle({
          radius: 5,
          stroke: new Stroke({
            color: 'rgba(0, 0, 0, 0.7)',
          }),
          fill: new Fill({
            color: 'rgba(255, 255, 255, 0.2)',
          }),
        }),
      });
      
    function addInteraction() {
      const value = typeSelect.value;
      if (value !== 'None') {
        drawRef.current = new Draw({
          source: source,
          type: typeSelect.value,
          style: function (feature) {
            const geometryType = feature.getGeometry().getType();
            if (geometryType === value || geometryType === 'Point') {
              return style;
            }
          },
        });
        map.addInteraction(drawRef.current);
        
        createMeasureTooltip();
        createHelpTooltip();
        let listener;
        drawRef.current.on('drawstart', function (evt) {
          sketch = evt.feature;
        
          let tooltipCoord = evt.coordinate;
        
          listener = sketch.getGeometry().on('change', function (evt) {
            const geom = evt.target;
            let output;
            if (geom instanceof Polygon) {
              output = formatArea(geom);
              tooltipCoord = geom.getInteriorPoint().getCoordinates();
            } else if (geom instanceof LineString) {
              output = formatLength(geom);
              tooltipCoord = geom.getLastCoordinate();
            }
            if (measureTooltipElement) {
              measureTooltipElement.innerHTML = output;
              measureTooltip.setPosition(tooltipCoord);
            }
          });
        });
      }
    }

    typeSelect.onchange = function () {
      map.removeInteraction(drawRef.current);
      addInteraction();
    };

    
    addInteraction();
    function createHelpTooltip() {
        helpTooltipElement = document.createElement('div');
        helpTooltipElement.className = 'ol-tooltip hidden';
        helpTooltip = new Overlay({
          element: helpTooltipElement,
          offset: [15, 0],
          positioning: 'center-left',
        });
        map.addOverlay(helpTooltip);
      }
      function createMeasureTooltip() {
        measureTooltipElement = document.createElement('div');
        measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure';
        measureTooltip = new Overlay({
          element: measureTooltipElement,
          offset: [0, -15],
          positioning: 'bottom-center',
          stopEvent: false,
          insertFirst: false,
        });
        map.addOverlay(measureTooltip);
      }
    return () => {
      map.dispose();
    };
  }, []);

  
  return (
    <div>
      <div ref={mapRef} style={{ width: '100%', height: '70vh' }} />
      <div>
        <label htmlFor="type">Geometry type:</label>
        <select id="type">
          <option value="None">None</option>
          <option value="Point">Point</option>
          <option value="LineString">LineString</option>
          <option value="Polygon">Polygon</option>
        </select>
      </div>
    
    </div>
  );
};

export default MapComponent;
