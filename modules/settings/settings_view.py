from PyQt6.QtWidgets import QWidget, QVBoxLayout, QLabel

class SettingView(QWidget):
    def __init__(self):
        super().__init__()
        layout = QVBoxLayout(self)
        label = QLabel("Módulo de Configuración - Próximamente")
        layout.addWidget(label)