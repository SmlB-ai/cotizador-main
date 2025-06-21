from PyQt6.QtWidgets import QWidget, QVBoxLayout, QLabel

class ClientView(QWidget):
    def __init__(self):
        super().__init__()
        layout = QVBoxLayout(self)
        label = QLabel("Módulo de Clientes - Próximamente")
        layout.addWidget(label)