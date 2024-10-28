import { Robot } from './Class/Robot.js';
import { Tablet } from './Class/Tablet.js';
import { alertError, alertSuccess } from './utils/alerts.js';
import { roundNumber } from './utils/format.js';

let selectedPort = '';

// DOM elements
const portSelect = document.getElementById('port-select');
const statusElement = document.getElementById('status');
const progressElement = document.getElementById('progress');
const progressBar = document.getElementById('progress-bar');

const movementSpeedInput = document.getElementById('movementSpeed');
const safeZInput = document.getElementById('safeZ');
const formGeneralSettings = document.getElementById('form-generalSettings');

const xPosition = document.getElementById('xPosition');
const btnAddX = document.getElementById('btnAddX');
const btnSubstractX = document.getElementById('btnSubstractX');
const btnHomeX = document.getElementById('btnHomeX');

const yPosition = document.getElementById('yPosition');
const btnAddY = document.getElementById('btnAddY');
const btnSubstractY = document.getElementById('btnSubstractY');
const btnHomeY = document.getElementById('btnHomeY');

const zPosition = document.getElementById('zPosition');
const btnAddZ = document.getElementById('btnAddZ');
const btnSubstractZ = document.getElementById('btnSubstractZ');
const btnHomeZ = document.getElementById('btnHomeZ');

const step = document.getElementById('step');
const cellsInputs = document.querySelectorAll('input[type="radio"][name="cell"]');
const loadGCodeButton = document.getElementById('load-gcode-button');
const gcodeFileInput = document.getElementById('gcode-file-input');

loadGCodeButton.addEventListener('click', () => {
  const file = gcodeFileInput.files[0];
  if (file) {
    // Используйте ipcRenderer для отправки файла в main.js
    window.electronAPI.loadGCodeFile(file.path);
  } else {
    alertError('Пожалуйста, выберите файл G-code');
  }
});

window.electronAPI.receiveLoadStatus((status) => {
  if (status.success) {
    alertSuccess('G-code успешно загружен');
    console.log(status.gcodeData);
  } else {
    alertError(`Ошибка загрузки G-code: ${status.error}`);
  }
});

let currentData = {};
export let robot = {};

// Загрузка дефолтной конфигурации
export const loadDefaultConfig = async () => {
  const data = await ipcRenderer.invoke('data:getValues', 'data');
  if (data) {
    console.log(data);
    currentData = data;
    renderConfigData(data);

    const { movementSpeed, safeZ, zDirection } = currentData.generalSettings;
    robot = new Robot(movementSpeed, safeZ, zDirection);
    console.log(`new Robot`, robot);
  }
};

// Обновление дефолтной конфигурации
const updateConfig = async (e) => {
  e.preventDefault();
  const data = getConfigData();
  const tablet = new Tablet(data.tabletStartPoints, 'T1');
  data.tablet = tablet;

  if (data) {
    await ipcRenderer.send('data:saveValue', ['data', { ...data }]);
  }

  loadDefaultConfig();
};

const getConfigData = () => {
  clearGCode();
  currentData.generalSettings = {
    movementSpeed: +movementSpeedInput.value,
    safeZ: +safeZInput.value,
    zDirection: +document.querySelector('input[name="zDirection"]:checked').value,
  };

  currentData.tabletStartPoints = [
    {
      x: +document.getElementById('A1-X').value,
      y: +document.getElementById('A1-Y').value,
      z: +document.getElementById('A1-Z').value,
      id: 'A1',
    },
    {
      x: +document.getElementById('A12-X').value,
      y: +document.getElementById('A12-Y').value,
      z: +document.getElementById('A12-Z').value,
      id: 'A12',
    },
    {
      x: +document.getElementById('H1-X').value,
      y: +document.getElementById('H1-Y').value,
      z: +document.getElementById('H1-Z').value,
      id: 'H1',
    },
  ];
  alertSuccess('Настройки успешно сохранены');
  return currentData;
};

const renderConfigData = (data) => {
  const { movementSpeed, safeZ, zDirection } = data.generalSettings;

  movementSpeedInput.value = movementSpeed;
  safeZInput.value = safeZ;
  document.getElementById(zDirection === 0 ? 'negative' : 'positive').checked = true;

  const [A1, A12, H1] = data.tabletStartPoints;

  document.getElementById('A1-X').value = A1.x;
  document.getElementById('A1-Y').value = A1.y;
  document.getElementById('A1-Z').value = A1.z;

  document.getElementById('A12-X').value = A12.x;
  document.getElementById('A12-Y').value = A12.y;
  document.getElementById('A12-Z').value = A12.z;

  document.getElementById('H1-X').value = H1.x;
  document.getElementById('H1-Y').value = H1.y;
  document.getElementById('H1-Z').value = H1.z;
};

const clearGCode = () => {
  robot.gcode = '';
};

const home = (axis) => {
  clearGCode();
  robot.home(axis);
  sendGCode(robot.getGcode());
};

const move = (value, axis) => {
  clearGCode();
  robot.move(value, axis);
  sendGCode(robot.getGcode());
};

const moveToCell = (cellId) => {
  clearGCode();
  let cell = currentData.tablet.coords.flat().find((el) => el.id === cellId);
  robot.moveToXY(cell.x, cell.y, `Переместиться в ячейку ${cellId}`);
  sendGCode(robot.getGcode());
};

const sendGCode = (gcodeData) => {
  if (!gcodeData) {
    console.log('Gcode string is empty');
    return;
  }

  if (!selectedPort) {
    alertError('Ошибка: выберите порт');
    return;
  }

  window.electronAPI.uploadGCode({ gcodeData, selectedPort });
  xPosition.value = roundNumber(robot.currentPosition.x, 1000);
  yPosition.value = roundNumber(robot.currentPosition.y, 1000);
  zPosition.value = roundNumber(robot.currentPosition.z, 1000);
};

const selectPort = (e) => {
  selectedPort = portSelect.value;
};

formGeneralSettings.addEventListener('submit', updateConfig);
btnHomeX.addEventListener('click', () => home('X'));
btnHomeY.addEventListener('click', () => home('Y'));
btnHomeZ.addEventListener('click', () => home('Z'));
btnAddX.addEventListener('click', () => move(+step.value, 'X'));
btnAddY.addEventListener('click', () => move(+step.value, 'Y'));
btnAddZ.addEventListener('click', () => move(+step.value, 'Z'));
btnSubstractX.addEventListener('click', () => move(-step.value, 'X'));
btnSubstractY.addEventListener('click', () => move(-step.value, 'Y'));
btnSubstractZ.addEventListener('click', () => move(-step.value, 'Y'));
cellsInputs.forEach((input) => {
  input.addEventListener('input', (e) => moveToCell(e.target.value));
});
portSelect.addEventListener('change', selectPort);

loadDefaultConfig();

// Подключение порта
window.electronAPI.requestPorts();

window.electronAPI.receivePorts((ports) => {
  if (ports.length === 0) {
    const option = document.createElement('option');
    option.text = 'Нет доступных портов';
    option.disabled = true;
    portSelect.add(option);
  } else {
    ports.forEach((port) => {
      const option = document.createElement('option');
      option.value = port;
      option.text = port;
      portSelect.add(option);
    });
  }
});

window.electronAPI.receiveUploadStatus((status) => {
  if (status.success) {
    alertSuccess(status.message || 'G-code успешно отправлен на принтер');
  } else {
    alertError(`Ошибка загрузки G-code: ${status.error}`);
  }
});

window.electronAPI.receiveProgressUpdate((progress) => {
  progressBar.className = 'progress-bar';
  progressElement.style.width = `${progress}%`;
  progressElement.innerText = `${Math.round(progress)}%`;
});
