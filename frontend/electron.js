const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    // icon: path.join(__dirname, 'public/favicon.ico') 
  });

  // Em desenvolvimento, carrega o localhost do Vite
  // Em produção, carrega o arquivo buildado
  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../dist/index.html')}`;
  
  // Se quiser testar rodando junto com o "npm run dev":
  // win.loadURL('http://localhost:5173'); 
  
  win.loadURL(startUrl);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});