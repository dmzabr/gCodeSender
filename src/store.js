const Store = require('electron-store')
const store = new Store()

const defaultData = {
  generalSettings: {
    movementSpeed: 1000,
    safeZ: -5,
    zDirection: '1',
  },
  // tablet: {
  //   A1: { x: 0, y: 0, z: 0 },
  //   A12: { x: 99, y: 0, z: 0 },
  //   H1: { x: 0, y: 63, z: 0 },
  // },
  tabletStartPoints: [
    { x: 0, y: 0, z: 0, id: 'A1' },
    { x: 0, y: 0, z: 0, id: 'A12' },
    { x: 0, y: 0, z: 0, id: 'H1' },
  ],
}

if (!store.get('data')) {
  store.set('data', defaultData)
}
module.exports = { store, defaultData }
