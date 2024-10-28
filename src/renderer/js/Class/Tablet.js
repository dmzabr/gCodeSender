import { getGridCoordsShift } from '../utils/coords.js'

export class Tablet {
  constructor(startPoint, id) {
    this.id = id
    this.startPoint = startPoint
    this.height = 14.3
    this.rows = 8
    this.cols = 12

    // расстояние между центрами лунок
    this.step = 9.0
    this.coords = getGridCoordsShift(this.startPoint, this.rows, this.cols)
    // диаметр лунки 6.6mm
    // глубина лунки 11.2mm
    this.cell = {
      diameter: 6.6,
      depth: 11.2,
    }
  }

  getCellCoord(id) {
    return this.coords.flat().find((el) => el.id === id)
  }
}
