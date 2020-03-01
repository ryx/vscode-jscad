import { readFileSync } from 'fs';
import { parse, RootNode, ElementNode } from 'svg-parser';

function deepSearch(object:any, key:string, predicate:(key:string, value:any)=>boolean): Object | null {
  if (object.hasOwnProperty(key) && predicate(key, object[key]) === true) 
    return object;

  for (let i = 0; i < Object.keys(object).length; i++) {
    if (typeof object[Object.keys(object)[i]] === "object") {
      let o = deepSearch(object[Object.keys(object)[i]], key, predicate);
      if (o !== null)
        return o;
    }
  }
  return null;
}

export default class ImportPathFromSVGAction {
  private svgRootNode: RootNode | undefined;

  constructor(fileName:string) {
    this.svgRootNode = this.parseSVGFileAsHAST(fileName);
  }

  public parseSVGFileAsHAST(fileName:string) : RootNode | undefined {
    const fileData = readFileSync(fileName);
    // parse data
    if (fileData) {
      const svgString = fileData.toString();
      if (svgString) {
        const svgJSON = parse(svgString);
        // console.log(svgJSON);
        return svgJSON;
      }
    }
  }

  /**
   * Find and return all <polygon> elements inside the given RootNode.
   */
  public getPolygonsFromSVG() : ElementNode | null {
    const node = <ElementNode|null>deepSearch(this.svgRootNode, 'tagName', (k, v) => v === 'polygon');
    console.log(node);
    return node;
  }

  /**
   * Converts a points list from a <polygon> element to a Javascript array to be used
   * in an JSCAD script.
   * @param points a string with points as taken from a <polygon> element in SVG
   */
  private convertPointsToPolygon(points:string) : number[][] {
    const polygon = [];
    const pointsArray = points.split(' ');
    for (let i = 0; i < pointsArray.length; i += 2) {
      polygon.push([parseFloat(pointsArray[i]), parseFloat(pointsArray[i + 1])]);
    }
    return polygon;
  }

  /**
   * Converts a points list from a <polygon> element to a Javascript array to be used
   * in an JSCAD script.
   * @param points a string with points as taken from a <polygon> element in SVG
   */
  public convertSVGPolygonToJSCADString(polygonNode:ElementNode) : string {
    if (!polygonNode.properties || typeof polygonNode.properties.points !== 'string') {
      throw new Error('convertSVGPolygonToJSCADString expects ElementNode with "points" property as argument');
    }

    const polygons = this.convertPointsToPolygon(polygonNode.properties.points);
    if (!polygons || polygons.length === 0 || polygons.length % 2 !== 0) {
      throw new Error('convertSVGPolygonToJSCADString encountered invalid "points" property on <polygon>');
    }

    const jscadPoints:string[] = [];
    polygons.forEach(polygon => jscadPoints.push(`\t[${polygon[0]}, ${polygon[1]}]`));
    
    return `let \${name:poly} = polygon([\n${jscadPoints.join(',\n')}\n]);$0`;
  }
}
