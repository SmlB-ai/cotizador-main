// Clase para manejar la configuración de la empresa
export class Config {
  constructor() {
    this.STORAGE_KEY = 'cotizador_config';
    // Configuración por defecto
    this.defaultConfig = {
      nombre: 'StableBuilds',
      direccion: 'Av. Construcción #123, CDMX',
      telefono: '55 1234 5678',
      email: 'contacto@stablebuilds.com',
      web: 'stablebuilds.com',
      logo: '' // Base64 del logo (opcional)
    };
  }

  guardarConfig(config) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
      return true;
    } catch (error) {
      console.error('Error al guardar la configuración:', error);
      return false;
    }
  }

  cargarConfig() {
    try {
      const configData = localStorage.getItem(this.STORAGE_KEY);
      if (configData) {
        return JSON.parse(configData);
      } else {
        return this.defaultConfig;
      }
    } catch (error) {
      console.error('Error al cargar la configuración:', error);
      return this.defaultConfig;
    }
  }

  restablecerConfig() {
    return this.guardarConfig(this.defaultConfig);
  }

  hayConfigGuardada() {
    return localStorage.getItem(this.STORAGE_KEY) !== null;
  }
}

// ---------- Inicializador de la pestaña de configuración ----------
export function initConfigTab() {
  const config = new Config();
  const form = document.getElementById('formConfigEmpresa');
  if (!form) return;

  // Cargar datos en el formulario
  function cargarEnFormulario(datos) {
    document.getElementById('configNombre').value = datos.nombre || '';
    document.getElementById('configDireccion').value = datos.direccion || '';
    document.getElementById('configTelefono').value = datos.telefono || '';
    document.getElementById('configEmail').value = datos.email || '';
    document.getElementById('configWeb').value = datos.web || '';
    // Logo
    if (datos.logo) {
      document.getElementById('configLogoPreview').src = datos.logo;
      document.getElementById('configLogoPreview').style.display = '';
    } else {
      document.getElementById('configLogoPreview').src = '';
      document.getElementById('configLogoPreview').style.display = 'none';
    }
  }

  // Al abrir la pestaña, cargar datos
  cargarEnFormulario(config.cargarConfig());

  // Cuando se selecciona logotipo, mostrar preview
  document.getElementById('configLogo').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (evt) {
        document.getElementById('configLogoPreview').src = evt.target.result;
        document.getElementById('configLogoPreview').style.display = '';
      };
      reader.readAsDataURL(file);
    }
  });

  // Guardar cambios
  form.onsubmit = function (e) {
    e.preventDefault();
    const datos = {
      nombre: document.getElementById('configNombre').value.trim(),
      direccion: document.getElementById('configDireccion').value.trim(),
      telefono: document.getElementById('configTelefono').value.trim(),
      email: document.getElementById('configEmail').value.trim(),
      web: document.getElementById('configWeb').value.trim(),
      logo: document.getElementById('configLogoPreview').src || ''
    };
    config.guardarConfig(datos);
    alert('¡Configuración guardada correctamente!');
  };

  // Restablecer a valores por defecto
  document.getElementById('btnRestablecerConfig').onclick = function () {
    if (confirm('¿Restablecer la configuración a valores por defecto?')) {
      config.restablecerConfig();
      cargarEnFormulario(config.defaultConfig);
    }
  };
}

// Para importación dinámica en app.js
window.initConfigTab = initConfigTab;