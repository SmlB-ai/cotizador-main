import sys
from PyQt6.QtWidgets import (QApplication, QMainWindow, QTabWidget, 
                           QWidget, QVBoxLayout)
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QIcon

from modules.quotations.quotation_view import QuotationView
from modules.clients.client_view import ClientView
from modules.settings.settings_view import SettingView

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Cotizaciones Pro")
        self.setGeometry(100, 100, 1200, 800)
        
        # Crear el widget central y layout
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        layout = QVBoxLayout(central_widget)
        
        # Crear el widget de pestañas
        self.tabs = QTabWidget()
        self.tabs.setTabPosition(QTabWidget.TabPosition.North)
        self.tabs.setMovable(True)
        
        # Agregar las pestañas
        self.tabs.addTab(QuotationView(), "Cotizaciones")
        self.tabs.addTab(ClientView(), "Clientes")
        self.tabs.addTab(SettingView(), "Configuración")
        
        layout.addWidget(self.tabs)
        
        # Cargar estilos
        self.load_styles()

    def load_styles(self):
        # Cargar el archivo de estilos QSS (similar a CSS)
        with open("assets/styles/main.qss", "r") as f:
            self.setStyleSheet(f.read())

def main():
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()