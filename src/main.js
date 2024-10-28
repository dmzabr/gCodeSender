const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { store, defaultData } = require('./store');
const { SerialPort } = require('serialport');
const fs = require('fs');

let portOpen = false;
let isPaused = false; // Флаг для паузы
let lastResponse = ''; // Переменная для хранения последнего ответа
let currentPositionChecked = false; // Флаг для проверки текущей позиции
let currentPort; // Хранит текущий открытый порт

const isDev = false;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: isDev ? 1440 : 800,
    height: isDev ? 900 : 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, './renderer/index.html'));

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Function to open port
const openPort = (selectedPort) => {
  if (portOpen) return Promise.reject('AAAAA Порт уже открыт.');

  return new Promise((resolve, reject) => {
    currentPort = new SerialPort({ path: selectedPort, baudRate: 115200 });
    currentPort.on('open', () => {
      console.log('Порт открыт');
      portOpen = true;
      resolve();
    });

    currentPort.on('error', (err) => {
      console.error('Ошибка порта:', err.message);
      reject(err.message);
    });

    currentPort.on('close', () => {
      portOpen = false;
      console.log('Порт закрыт');
    });
  });
};

// Upload G-code
ipcMain.on('upload-gcode', async (event, { gcodeData, selectedPort }) => {
  if (!gcodeData || typeof gcodeData !== 'string') {
    console.error('Ошибка: G-code данные не переданы или имеют неверный формат.');
    event.reply('upload-status', { success: false, error: 'Неверные данные G-code.' });
    return;
  }

  try {
    await openPort(selectedPort);
  } catch (err) {
    event.reply('upload-status', { success: false, error: err });
    return;
  }

  let gcodeLines = gcodeData.split('\n');
  let currentLine = 0;

  const sendNextLine = () => {
    if (isPaused || currentLine >= gcodeLines.length) return;

    let line = gcodeLines[currentLine].trim();
    if (line.startsWith(';')) {
      console.log(`Пропускаем строку-комментарий: ${line}`);
      currentLine++;
      sendNextLine();
      return;
    }

    currentPort.write(line + '\n', (err) => {
      if (err) {
        console.error('Ошибка при отправке строки:', err.message);
        event.reply('upload-status', { success: false, error: err.message });
        return;
      }
      console.log(`Отправлено: ${line}`);
    });
  };

  currentPort.on('data', (data) => {
    lastResponse += data.toString().trim();
    console.log('Получены данные:', lastResponse);

    if (lastResponse.includes('ok')) {
      currentLine++;
      event.reply('progress-update', { progress: (currentLine / gcodeLines.length) * 100 });

      if (!currentPositionChecked && currentLine % 10 === 0) {
        currentPort.write('M114\n', (err) => {
          if (err) {
            console.error('Ошибка при отправке M114:', err.message);
          } else {
            currentPositionChecked = true;
          }
        });
      } else {
        currentPositionChecked = false;
      }

      setTimeout(sendNextLine, 100);
    } else if (currentLine === 0) {
      currentLine++;
      event.reply('progress-update', { progress: (currentLine / gcodeLines.length) * 100 });
      setTimeout(sendNextLine, 5000);
    }
  });

  // обработка ошибки порта
  currentPort.on('error', (err) => {
    console.error('Ошибка порта:', err.message);
    event.reply('upload-status', { success: false, error: err.message });
    portOpen = false;
  });

  currentPort.on('close', () => {
    portOpen = false;
    console.log('Порт закрыт');
  });
});

// Запрос доступных портов
ipcMain.on('request-ports', async (event) => {
  try {
    const ports = await SerialPort.list();
    const portList = ports.map((port) => port.path);
    event.reply('port-list', portList);
  } catch (err) {
    console.error('Ошибка получения списка портов:', err.message);
    event.reply('port-list', []);
  }
});


// Обработка запроса на остановку передачи
ipcMain.on('stop-upload', (event) => {
  if (portOpen) {
    isPaused = true;
    currentPort.close((err) => {
      if (err) {
        console.error('Ошибка при закрытии порта:', err.message);
      } else {
        console.log('Порт успешно закрыт');
      }
    });
  } else {
    console.log('Порт уже закрыт или не открыт');
  }
});

// Отправка команды
ipcMain.on('send-command', async (event, { command, selectedPort }) => {
  if (!portOpen) {
    try {
      await openPort(selectedPort);
      currentPort.write(command + '\n', (err) => {
        if (err) {
          console.error('Ошибка при отправке команды:', err.message);
          event.reply('command-status', { success: false, error: err.message });
        }
      });
    } catch (err) {
      event.reply('command-status', { success: false, error: err });
    }
  } else {
    currentPort.write(command + '\n', (err) => {
      if (err) {
        console.error('Ошибка при отправке команды:', err.message);
        event.reply('command-status', { success: false, error: err.message });
      }
    });
  }
});

// Обработка запроса на возобновление передачи
ipcMain.on('resume-upload', (event) => {
  if (!portOpen && isPaused) {
    isPaused = false;
    sendNextLine();
  } else {
    console.log('Передача не может быть возобновлена');
  }
});

// Загрузка файла G-code
ipcMain.on('load-gcode-file', (event, filePath) => {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Ошибка при чтении файла:', err.message);
      event.reply('load-status', { success: false, error: err.message });
      return;
    }
    event.reply('load-status', { success: true, gcodeData: data });
  });
});

