// Configuración automática para ngrok
const ngrokConfig = {
    // Detectar si estamos usando ngrok
    isNgrok: () => {
        return window.location.hostname.includes('ngrok.io') || 
               window.location.hostname.includes('ngrok-free.app') ||
               window.location.hostname.includes('ngrok.app') ||
               window.location.hostname.includes('ngrok.dev');
    },
    
    // Obtener la URL base automáticamente
    getBaseURL: () => {
        if (ngrokConfig.isNgrok()) {
            // Si estamos en ngrok, usar la URL actual
            return `${window.location.protocol}//${window.location.hostname}`;
        } else {
            // Si estamos en localhost, usar puerto 8080
            return 'http://localhost:8080';
        }
    },
    
    // Función para obtener URL completa de API
    getAPIUrl: (route) => {
        return `${ngrokConfig.getBaseURL()}${route}`;
    },
    

};

// Exportar para uso global
window.ngrokConfig = ngrokConfig; 

 