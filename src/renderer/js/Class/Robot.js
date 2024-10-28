import { roundNumber } from '../utils/format.js'

export class Robot {
  constructor(movementSpeed = 200, safeZ = -10, zDirection = 0) {
    this.movementSpeed = movementSpeed
    this.safeZ = safeZ
    this.zDirection = zDirection
    this.currentPosition = { x: 0, y: 0, z: 0 }
    this.gcode = ''
  }
  // Add code
  addGcodeLine(gcode, speed) {
    this.gcode += `${gcode} F${speed}\n`
  }
  // Comment code
  addComment(comment) {
    this.gcode += `;${comment}\n`
  }
  // Set units to mm and absolute positioning
  start() {
    this.gcode += `G21\nG90\n`
  }
  //  Home the robot.
  homeXYZ() {
    this.addComment(`Базироваться в нулевые координаты`)
    this.gcode += `G28\n`
    this.currentPosition = { x: 0, y: 0, z: 0 }
  }
  home(axis) {
    this.addComment(`Базировать ${axis}`)
    this.gcode += `G28 ${axis}0\n`
    this.currentPosition[axis.toLowerCase()] = 0
  }

  // move to a safe position in the Z in ABSOLUTE positioning (G90)
  moveToSafeZ() {
    this.addComment(`Переместиться на безопасную высоту`)
    this.addGcodeLine(
      `G90\nG01 Z${
        this.zDirection === 0 ? -Math.abs(this.safeZ) : Math.abs(this.safeZ)
      }`,
      this.movementSpeed
    )
    this.currentPosition.z = this.safeZ
  }
  // Move to a position in the X, Y in ABSOLUTE positioning (G90)
  moveToXY(x, y, text, speed = this.movementSpeed) {
    this.addComment(`${text ? text : 'Переместиться'}`)
    this.addGcodeLine(
      // `G90 G01 X${roundNumber(x, 1000)} Y${roundNumber(y, 1000)}`,
      `G90\nG01 X${roundNumber(x, 1000)} Y${roundNumber(y, 1000)}`,
      speed
    )
    this.currentPosition.x = x
    this.currentPosition.y = y
  }
  // Move to a position in the Z in ABSOLUTE positioning (G90)
  moveToZ(z, text, speed = this.movementSpeed) {
    this.addComment(`${text ? text : 'Опуститься'}`)
    this.addGcodeLine(
      `G90\nG01 Z${this.zDirection === 0 ? -Math.abs(z) : Math.abs(z)}`,
      speed
    )
    this.currentPosition.z = z
  }

  move(distance, axis, speed = this.movementSpeed) {
    this.addGcodeLine(`G91\nG01 ${axis}${distance}`, speed)
    this.currentPosition[axis.toLowerCase()] += distance
  }

  reset() {
    this.gcode = ''
    this.currentPosition = { x: 0, y: 0, z: 0 }
  }
  // Get the accumulated G-code instructions.
  getGcode() {
    console.log(this.gcode)
    console.log(this.currentPosition)
    return this.gcode
  }
}

// Move in the X, Y, and optionally Z directions.
// move(x, y, z, speed = this.movementSpeed) {
//   if (z) {
//     this.addGcodeLine(`G91 G01 X${x} Y${y} Z${z}`, speed)
//     // this.addGcodeLine(`G1 X${x} Y${y} Z${z}`, speed)
//     this.currentPosition.z += z
//   } else {
//     this.addGcodeLine(`G91 G01 X${x} Y${y}`, speed)
//     // this.addGcodeLine(`G1 X${x} Y${y}`, speed)
//   }

//   this.currentPosition.x += x
//   this.currentPosition.y += y
// }

// Move to a position in the X, Y, and optionally Z directions  in RELATIVE positioning
// moveTo(x, y, z, speed = this.movementSpeed) {
//   const distanceX = x - this.currentPosition.x
//   const distanceY = y - this.currentPosition.y
//   // TODO: Проверить distanceZ
//   if (z) {
//     const distanceZ = z - this.currentPosition.z
//     this.addGcodeLine(`G91\nX${distanceX} Y${distanceY} Z${distanceZ}`, speed)
//     this.currentPosition.z += distanceZ
//   } else {
//     this.addGcodeLine(`G91\nX${distanceX} Y${distanceY}`, speed)
//   }
//   this.currentPosition.x += distanceX
//   this.currentPosition.y += distanceY
// }

// Move in the Z direction.
// moveZ(z, text, speed = this.movementSpeed) {
//   this.addComment(`${text ? text : `Переместиться на ${z}мм по Z`}`)
//   this.addGcodeLine(`G91 G01 Z${roundNumber(z, 1000)}`, speed)

//   this.currentPosition.z += z
//   // ???
//   this.currentPosition.z = parseFloat(
//     this.currentPosition.z.toFixed(this.eRoundFactor)
//   )
// }
