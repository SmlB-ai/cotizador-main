from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QGridLayout,
                           QLabel, QLineEdit, QComboBox, QDateEdit, 
                           QPushButton, QFrame, QSpinBox, QDoubleSpinBox,
                           QTextEdit, QScrollArea)
from PyQt6.QtCore import Qt, QDate
from PyQt6.QtGui import QFont, QIcon

class QuotationView(QWidget):
    def __init__(self):
        super().__init__()
        self.initUI()

    def initUI(self):
        # Layout principal
        main_layout = QHBoxLayout(self)
        
        # Panel izquierdo (formulario)
        left_panel = QFrame()
        left_panel.setObjectName("leftPanel")
        left_layout = QVBoxLayout(left_panel)
        
        # Header de la cotización
        header_frame = QFrame()
        header_layout = QHBoxLayout(header_frame)
        
        # Título y número de cotización
        title_layout = QVBoxLayout()
        title = QLabel("Nueva Cotización")
        title.setFont(QFont("Segoe UI", 14, QFont.Weight.Bold))
        cot_number = QLabel("COT-2025-0001")
        cot_number.setObjectName("cotNumber")
        title_layout.addWidget(title)
        title_layout.addWidget(cot_number)
        
        # Status
        status_layout = QVBoxLayout()
        status_label = QLabel("Borrador")
        status_label.setObjectName("statusBadge")
        status_layout.addWidget(status_label)
        status_layout.setAlignment(Qt.AlignmentFlag.AlignRight)
        
        header_layout.addLayout(title_layout)
        header_layout.addLayout(status_layout)
        
        # Información del cliente y fecha
        client_date_frame = QFrame()
        client_date_layout = QGridLayout(client_date_frame)
        
        # Cliente
        client_label = QLabel("Cliente:")
        client_combo = QComboBox()
        client_combo.addItems(["Seleccionar cliente...", "Juan Pérez", "Constructora ABC"])
        client_combo.setMinimumWidth(250)
        
        # Fecha
        date_label = QLabel("Fecha:")
        date_edit = QDateEdit()
        date_edit.setDate(QDate.currentDate())
        date_edit.setCalendarPopup(True)
        
        client_date_layout.addWidget(client_label, 0, 0)
        client_date_layout.addWidget(client_combo, 0, 1)
        client_date_layout.addWidget(date_label, 0, 2)
        client_date_layout.addWidget(date_edit, 0, 3)
        
        # Sección de items
        items_frame = QFrame()
        items_layout = QVBoxLayout(items_frame)
        
        # Header de items
        items_header = QHBoxLayout()
        items_title = QLabel("Conceptos")
        items_title.setFont(QFont("Segoe UI", 12, QFont.Weight.Bold))
        add_item_btn = QPushButton("Agregar Item")
        add_item_btn.setIcon(QIcon("assets/icons/plus.png"))  # Necesitarás agregar este ícono
        items_header.addWidget(items_title)
        items_header.addStretch()
        items_header.addWidget(add_item_btn)
        
        # Área scrolleable para items
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll_content = QWidget()
        self.items_container = QVBoxLayout(scroll_content)
        scroll.setWidget(scroll_content)
        
        # Agregar un item por defecto
        self.add_item()
        
        items_layout.addLayout(items_header)
        items_layout.addWidget(scroll)
        
        # Opciones adicionales
        options_frame = QFrame()
        options_layout = QGridLayout(options_frame)
        
        # Checkbox IVA
        self.iva_checkbox = QCheckBox("Aplicar IVA (16%)")
        self.iva_checkbox.setChecked(True)
        
        # Checkbox Descuento
        self.discount_checkbox = QCheckBox("Aplicar Descuento")
        
        options_layout.addWidget(self.iva_checkbox, 0, 0)
        options_layout.addWidget(self.discount_checkbox, 0, 1)
        
        # Sección de descuento (inicialmente oculta)
        self.discount_frame = QFrame()
        discount_layout = QGridLayout(self.discount_frame)
        
        discount_type_label = QLabel("Tipo de Descuento:")
        self.discount_type = QComboBox()
        self.discount_type.addItems(["Porcentaje (%)", "Monto Fijo ($)"])
        
        discount_value_label = QLabel("Valor del Descuento:")
        self.discount_value = QDoubleSpinBox()
        self.discount_value.setRange(0, 100000)
        
        discount_layout.addWidget(discount_type_label, 0, 0)
        discount_layout.addWidget(self.discount_type, 0, 1)
        discount_layout.addWidget(discount_value_label, 0, 2)
        discount_layout.addWidget(self.discount_value, 0, 3)
        
        self.discount_frame.hide()
        
        # Notas
        notes_frame = QFrame()
        notes_layout = QVBoxLayout(notes_frame)
        notes_label = QLabel("Notas Adicionales:")
        self.notes_text = QTextEdit()
        self.notes_text.setPlaceholderText("Vigencia, condiciones especiales, etc.")
        notes_layout.addWidget(notes_label)
        notes_layout.addWidget(self.notes_text)
        
        # Botones de acción
        actions_frame = QFrame()
        actions_layout = QHBoxLayout(actions_frame)
        
        save_draft_btn = QPushButton("Guardar Borrador")
        save_draft_btn.setIcon(QIcon("assets/icons/save.png"))
        
        approve_btn = QPushButton("Aprobar")
        approve_btn.setProperty("success", True)
        approve_btn.setIcon(QIcon("assets/icons/check.png"))
        
        generate_pdf_btn = QPushButton("Generar PDF")
        generate_pdf_btn.setIcon(QIcon("assets/icons/pdf.png"))
        
        actions_layout.addWidget(save_draft_btn)
        actions_layout.addStretch()
        actions_layout.addWidget(approve_btn)
        actions_layout.addWidget(generate_pdf_btn)
        
        # Agregar todos los elementos al panel izquierdo
        left_layout.addWidget(header_frame)
        left_layout.addWidget(client_date_frame)
        left_layout.addWidget(items_frame)
        left_layout.addWidget(options_frame)
        left_layout.addWidget(self.discount_frame)
        left_layout.addWidget(notes_frame)
        left_layout.addWidget(actions_frame)
        
        # Panel derecho (vista previa)
        right_panel = QFrame()
        right_panel.setObjectName("rightPanel")
        right_layout = QVBoxLayout(right_panel)
        
        preview_header = QLabel("Vista Previa")
        preview_header.setFont(QFont("Segoe UI", 12, QFont.Weight.Bold))
        
        self.preview_frame = QFrame()
        self.preview_frame.setObjectName("previewFrame")
        preview_content = QVBoxLayout(self.preview_frame)
        
        # Contenido de la vista previa
        company_name = QLabel("Tu Empresa")
        company_name.setAlignment(Qt.AlignmentFlag.AlignCenter)
        company_name.setFont(QFont("Segoe UI", 14, QFont.Weight.Bold))
        
        cot_preview_number = QLabel("Cotización COT-2025-0001")
        cot_preview_number.setAlignment(Qt.AlignmentFlag.AlignCenter)
        
        self.preview_items = QVBoxLayout()
        self.preview_items.addWidget(QLabel("Agrega items para ver la vista previa"))
        
        # Totales
        self.totals_frame = QFrame()
        self.totals_frame.setObjectName("totalsFrame")
        totals_layout = QGridLayout(self.totals_frame)
        
        subtotal_label = QLabel("Subtotal:")
        self.subtotal_value = QLabel("$0.00")
        
        iva_label = QLabel("IVA (16%):")
        self.iva_value = QLabel("$0.00")
        
        total_label = QLabel("Total:")
        total_label.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        self.total_value = QLabel("$0.00")
        self.total_value.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        
        totals_layout.addWidget(subtotal_label, 0, 0)
        totals_layout.addWidget(self.subtotal_value, 0, 1)
        totals_layout.addWidget(iva_label, 1, 0)
        totals_layout.addWidget(self.iva_value, 1, 1)
        totals_layout.addWidget(total_label, 2, 0)
        totals_layout.addWidget(self.total_value, 2, 1)
        
        preview_content.addWidget(company_name)
        preview_content.addWidget(cot_preview_number)
        preview_content.addLayout(self.preview_items)
        preview_content.addWidget(self.totals_frame)
        
        right_layout.addWidget(preview_header)
        right_layout.addWidget(self.preview_frame)
        
        # Agregar paneles al layout principal
        main_layout.addWidget(left_panel, stretch=2)
        main_layout.addWidget(right_panel, stretch=1)
        
        # Conectar señales
        self.discount_checkbox.stateChanged.connect(self.toggle_discount)
        add_item_btn.clicked.connect(self.add_item)

    def add_item(self):
        item_frame = QFrame()
        item_layout = QGridLayout(item_frame)
        
        description = QLineEdit()
        description.setPlaceholderText("Descripción del trabajo")
        
        quantity = QDoubleSpinBox()
        quantity.setRange(0, 10000)
        quantity.setPlaceholderText("Cantidad")
        
        price = QDoubleSpinBox()
        price.setRange(0, 1000000)
        price.setPrefix("$")
        price.setPlaceholderText("Precio")
        
        subtotal = QLineEdit()
        subtotal.setReadOnly(True)
        subtotal.setPlaceholderText("$0.00")
        
        delete_btn = QPushButton()
        delete_btn.setIcon(QIcon("assets/icons/trash.png"))
        delete_btn.setProperty("danger", True)
        
        item_layout.addWidget(description, 0, 0)
        item_layout.addWidget(quantity, 0, 1)
        item_layout.addWidget(price, 0, 2)
        item_layout.addWidget(subtotal, 0, 3)
        item_layout.addWidget(delete_btn, 0, 4)
        
        self.items_container.addWidget(item_frame)
        
        # Conectar señales para cálculos automáticos
        quantity.valueChanged.connect(lambda: self.calculate_item_total(quantity, price, subtotal))
        price.valueChanged.connect(lambda: self.calculate_item_total(quantity, price, subtotal))
        delete_btn.clicked.connect(lambda: self.delete_item(item_frame))

    def calculate_item_total(self, quantity, price, subtotal):
        total = quantity.value() * price.value()
        subtotal.setText(f"${total:.2f}")
        self.update_totals()

    def delete_item(self, item_frame):
        item_frame.deleteLater()
        self.update_totals()

    def toggle_discount(self, state):
        self.discount_frame.setVisible(state)
        self.update_totals()

    def update_totals(self):
        # Implementar cálculo de totales
        pass