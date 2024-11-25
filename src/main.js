const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const { store, defaultData } = require('./store')
const { SerialPort } = require('serialport')
const fs = require('fs')

let portOpen = false; // Флаг, указывающий открыт ли порт
const isDev = false;
let port; // Объявляем переменную port заранее
let isSended = false


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit()
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: isDev ? 1440 : 8000,
    height: isDev ? 900 : 600,

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
    console.error(
      'Ошибка: G-code данные не переданы или имеют неверный формат.'
    );
    event.reply('upload-status', {
      success: false,
      error: 'Неверные данные G-code.',
    });
    return;
  }

  let gcodeLines = gcodeData.split('\n');
  let currentLine = 0;

  const sendNextLine = () => {
    if (!port) {
      console.error('Ошибка: порт не инициализирован');
      event.reply('upload-status', { success: false, error: 'Порт не инициализирован' });
      return;
    }
  
    if (currentLine < gcodeLines.length) {
      let line = gcodeLines[currentLine];
      port.write(line + '\n', (err) => {
        if (err) {
          console.error('Ошибка при отправке строки:', err.message);
          event.reply('upload-status', { success: false, error: err.message });
        } else if (isSended == true) {
          currentLine++;
          event.reply('progress-update', {
            progress: (currentLine / gcodeLines.length) * 100,
          });
          setTimeout(sendNextLine, 1); // Пауза в 3 секунды между строками
        } else {
          currentLine++;
          event.reply('progress-update', {
            progress: (currentLine / gcodeLines.length) * 100,
          });
          isSended = true;
          setTimeout(sendNextLine, 3000); // Пауза в 3 секунды при включении
        }
      });
    } else {
      return
    }
  };
  

  if (portOpen) {
    console.log('Порт уже открыт, продолжаем выполнение.');
    sendNextLine(); // Продолжаем отправку, если порт уже открыт
    return;
  }

  // Инициализируем порт только сейчас
  port = new SerialPort({ path: selectedPort, baudRate: 115200 });

  port.on('open', () => {
    console.log('Порт открыт');
    portOpen = true;
    sendNextLine(); // Начинаем отправку первой строки
  });

  port.on('data', (data) => {
    if (data.includes('ok')) {
      // Пропускаем строку, если принтер вернул 'ok'
    }
  });

  port.on('error', (err) => {
    console.error('Ошибка порта:', err.message);
    event.reply('upload-status', { success: false, error: err.message });
    portOpen = false;
  });

  // port.on('close', () => {
  //   portOpen = false;
  //   console.log('Порт закрыт');
  // });
});