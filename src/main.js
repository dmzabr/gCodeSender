const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const { store, defaultData } = require('./store')
const { SerialPort } = require('serialport')
const fs = require('fs')
const { ReadlineParser } = require('@serialport/parser-readline');


let portOpen = false; // Флаг, указывающий открыт ли порт
const isDev = false;
let port = null; // Объявляем переменную port заранее
let gcodeLines = [];
let isFirstCommand = true;
let isOk = null;
let endedToSend = false;


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit()
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: isDev ? 600 : 800,
    height: isDev ? 600 : 600,

    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true, // to allow require
      contextIsolation: true, // allow use with Electron 12+
    },
  })

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, './renderer/index.html'))

  // Open the DevTools.
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Загрузка файла
const { dialog } = require('electron');

ipcMain.handle('showOpenDialog', async () => {
  return await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'G-code Files', extensions: ['gcode', 'txt'] }]
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

// READ
ipcMain.handle('data:getValues', (event, key) => {
  return store.get(key)
})

// Save an object
ipcMain.on('data:save', (e, data) => {
  Object.entries(data).forEach(([key, value]) => {
    store.set(`${key}`, value)
  })
})

// Update value
ipcMain.on('data:saveValue', (e, data) => {
  const [name, object] = data

  Object.entries(object).forEach(([key, value]) => {
    store.set(`${name}.${key}`, value)
  })
})

// RESET to default config
ipcMain.on('data:reset', (e) => {
  console.log(defaultData)
  store.set('data', defaultData)
})
// DELETE
ipcMain.on('data:delete', (e) => {
  store.delete('data')
})

ipcMain.on('request-ports', async (event) => {
  try {
    const ports = await SerialPort.list()
    const portList = ports.map((port) => port.path)
    event.reply('port-list', portList)
  } catch (err) {
    console.error('Ошибка получения списка портов:', err.message)
    event.reply('port-list', [])
  }
})

ipcMain.on('upload-gcode', (event, { gcodeData, selectedPort }) => {
  if (!gcodeData || typeof gcodeData !== 'string') {
    console.error('Ошибка: G-code данные не переданы или имеют неверный формат.');
    event.reply('upload-status', {
      success: false,
      error: 'Неверные данные G-code.',
    });
    return;
  }

  // Инициализируем массив команд
  gcodeLines.push(...gcodeData.split('\n'));
  console.log('G-code команды ожидающие передачи:', gcodeLines);

  if (!port) {
    port = new SerialPort({ path: selectedPort, baudRate: 115200 });

    port.on('open', () => {
      console.log('Порт ' + selectedPort + ' открыт.');
      portOpen = true;

      if (isFirstCommand) {
        setTimeout(sendNextLine, 3000);
        isFirstCommand = false;
      } else if (endedToSend) {
        console.log("ОПАСНАЯ ОТПРАВКА АААААААА!!!")
        sendNextLine();
      }
       // Начинаем отправку при открытии порта
    });

    const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
    parser.on('data', (data) => {
      const trimmedData = data.trim();
      console.log('Получено с порта: ' + trimmedData);

      if (trimmedData.includes('ok')) {
        sendNextLine(); // Продолжаем отправку при получении "ok"
      }
    });

    port.on('error', (err) => {
      console.error('Ошибка порта: ' + err.message);
    });
  }

  // Функция отправки следующей строки
  const sendNextLine = () => {
    if (!port || !portOpen) {
      console.error('Ошибка: порт не инициализирован или закрыт');
      return;
    }

    gcodeLines = gcodeLines.filter(str => str !== "" && !str.startsWith(";"));

    if (gcodeLines.length > 0) {
      endedToSend = false;
      const command = gcodeLines.shift();
      console.log('Отправка команды:', command);
      port.write(command + '\n', (err) => {
        if (err) {
          console.error('Ошибка отправки команды:', err.message);
        }
      });
    } else {
      console.log('Все команды отправлены.');
      endedToSend = true;
      //event.reply('upload-status', { success: true });
    }
  };

  // Если порт уже открыт, начинаем отправку сразу
  if (portOpen) {
    console.log('Порт уже открыт. Начинаем отправку.');
    if (endedToSend) {
      console.log("ОПАСНАЯ ОТПРАВКА АААААААА!!!")
      sendNextLine();
    }
  }
});
