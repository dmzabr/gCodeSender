import { roundNumber } from './format.js'

export const getTabletIdsArr = (rows, cols) => {
  let arr = []
  for (let i = 0; i < rows; i++) {
    arr[i] = new Array(cols)
    let letter = String.fromCharCode('A'.charCodeAt() + i)
    for (let j = 0; j < cols; j++) {
      let id = `${letter}${j + 1}`
      arr[i][j] = { id, checked: false }
    }
  }

  return arr
}

// Получить массив со значениями координат центров лунок планшета (9х12), где элемент массива будет равен {x: xValue, y: yValue, z: zValue, id: A1-H12}
// Параметры:
// centerPoint координаты центральной точки
// row/cols - кол-во строк/столбцов
// step - расстояние между центрами лунок
export const getGridCoordsArr = (startPoint, rows, cols, step) => {
  let arr = []
  for (let i = 0; i < rows; i++) {
    let { x, y, z } = startPoint
    // y += step * i
    y -= step * i

    let letter = String.fromCharCode('A'.charCodeAt() + i)
    for (let j = 0; j < cols; j++) {
      let id = `${letter}${j + 1}`
      arr.push({
        x: roundNumber(x, 1000),
        y: roundNumber(y, 1000),
        z: roundNumber(z, 1000),
        id,
      })
      x += step
    }
  }

  return arr
}

// Расчет координат планшета с учетом смещения координат по оси X,Y,Z
// построить массив данных со значениями координат центров всех лунок планшета, где каждый элемент массива равен {x: any, y: any, z: any, id: string}
// Параментры:
// points - координаты начальных точек А1, А12, H1
export const getGridCoordsShift = (points, rows, cols) => {
  let array = []
  // Точки для расчета
  // let [A1, A12, H1] = points
  let A1 = points[0]
  let A12 = points[1]
  let H1 = points[2]
  console.log(A1, A12, H1)
  // Cмещение по горизонтали (row)
  let xShiftRow = (A12.x - A1.x) / (cols - 1)
  let yShiftRow = (A12.y - A1.y) / (cols - 1)
  let zShiftRow = (A12.z - A1.z) / (cols - 1)
  // Cмещение по вертикали (col)
  let xShiftCol = (H1.x - A1.x) / (rows - 1)
  let yShiftCol = (H1.y - A1.y) / (rows - 1)
  let zShiftCol = (H1.z - A1.z) / (rows - 1)

  for (let i = 0; i < rows; i++) {
    array[i] = new Array(cols)
    let letter = String.fromCharCode('A'.charCodeAt() + i)
    // Начальная точка
    let { x, y, z } = A1
    x += xShiftCol * i
    y += yShiftCol * i
    z += zShiftCol * i
    for (let j = 0; j < cols; j++) {
      let id = `${letter}${j + 1}`
      array[i][j] = {
        x: roundNumber(x, 1000),
        y: roundNumber(y, 1000),
        z: roundNumber(z, 1000),
        id,
      }
      x += xShiftRow
      y += yShiftRow
      z += zShiftRow
    }
  }
  return array
}
