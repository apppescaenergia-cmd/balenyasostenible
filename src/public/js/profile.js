/**
 * Módulo de gestión del perfil de usuario
 * Autocontenido y reutilizable en cualquier página
 */

class ProfileManager {
    constructor() {
        this.modal = null;
        this.form = null;
        this.isInitialized = false;
        this.callbacks = {
            onProfileUpdate: null
        };
    }

    /**
     * Inicializa el gestor de perfil
     */
    initialize() {
        if (this.isInitialized) return;

        this.modal = document.getElementById('profileModal');
        this.form = document.getElementById('profileForm');

        if (!this.modal || !this.form) {
            console.warn('Profile modal or form not found');
            return;
        }

        this.setupEventListeners();
        this.isInitialized = true;
    }

    /**
     * Configura los event listeners del modal
     */
    setupEventListeners() {
        // Botón de cerrar
        const closeBtn = document.getElementById('closeProfileBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeProfile());
        }

        // Cerrar al hacer clic fuera del modal
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeProfile();
            }
        });

        // Envío del formulario
        this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Escape key para cerrar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.modal.classList.contains('modal-hidden')) {
                this.closeProfile();
            }
        });
    }

    /**
     * Muestra el modal de perfil
     */
    async showProfile() {
        if (!this.isInitialized) {
            this.initialize();
        }

        if (this.modal) {
            this.modal.classList.remove('modal-hidden');
            this.hideMessage();

            // Cargar datos actualizados de participación desde la API
            this.loadProfileData().catch(() => {});

            // Focus en el campo de nombre
            const nameInput = document.getElementById('profileName');
            if (nameInput) {
                setTimeout(() => nameInput.focus(), 100);
            }
        }
    }

    /**
     * Carga los datos del perfil desde la API y actualiza els camps dinàmics
     */
    async loadProfileData() {
        try {
            const { data } = await window.apiClient.get('/api/auth/profile');

            // Actualitzar la llista de plantes
            const generatorSelect = document.getElementById('profileGenerator');
            if (generatorSelect && data.generators) {
                const currentCode = generatorSelect.value;
                generatorSelect.innerHTML = '<option value="">-- Selecciona una planta --</option>';
                data.generators.forEach((gen) => {
                    const option = document.createElement('option');
                    option.value = gen.id;
                    option.textContent = gen.name;
                    generatorSelect.appendChild(option);
                });
                if (currentCode) generatorSelect.value = currentCode;
            }

            // Actualitzar planta i coeficient seleccionats
            const participation = data.participations && data.participations.length > 0
                ? data.participations[0]
                : null;

            if (participation) {
                if (generatorSelect && participation.generator_code) {
                    generatorSelect.value = participation.generator_code;
                }
                const participationInput = document.getElementById('profileParticipation');
                if (participationInput) {
                    participationInput.value = participation.participation_percentage;
                }
            }
        } catch (error) {
            console.warn('Error carregant les dades del perfil:', error);
        }
    }

    /**
     * Oculta el modal de perfil
     */
    closeProfile() {
        if (this.modal) {
            this.modal.classList.add('modal-hidden');
            this.hideMessage();
        }
    }

    /**
     * Maneja el envío del formulario
     */
    async handleFormSubmit(e) {
        e.preventDefault();
        
        const name = document.getElementById('profileName').value.trim();
        
        if (!name) {
            this.showMessage('El nom és obligatori', 'error');
            return;
        }

        this.showLoading();

        try {
            const payload = { name };

            // DNI/NIE
            const dniInput = document.getElementById('profileDni');
            if (dniInput && dniInput.value.trim() !== '') {
                payload.dni = dniInput.value.trim().toUpperCase();
            }

            // Clau de Datadis: només s'envia si el camp està actiu i s'ha escrit alguna cosa
            const datadisKeyInput = document.getElementById('profileDatadisKey');
            if (datadisKeyInput && !datadisKeyInput.disabled && datadisKeyInput.value.trim() !== '') {
                payload.clau_datadis = datadisKeyInput.value.trim();
            }

            const { data } = await window.apiClient.put('/api/auth/profile', payload);
            
            // Actualizar la UI con el nuevo nombre
            this.updateUIWithNewName(data.name);
            const nameField = document.getElementById('profileName');
            if (nameField) nameField.value = data.name;

            // Actualitzar participació / coeficient de repartiment
            const generatorSelect = document.getElementById('profileGenerator');
            const participationInput = document.getElementById('profileParticipation');
            const generatorCode = generatorSelect ? generatorSelect.value : '';
            const participationPct = participationInput ? participationInput.value : '';

            if (generatorCode && participationPct !== '') {
                const pct = parseFloat(participationPct);
                if (isNaN(pct) || pct < 0 || pct > 100) {
                    this.showMessage('El coeficient de repartiment ha d\'estar entre 0 i 100', 'error');
                    return;
                }

                await window.apiClient.put('/api/user-participation/my', {
                    generatorCode,
                    participationPercentage: pct
                });
            }
            
            // Mostrar mensaje de éxito
            this.showMessage('Perfil actualitzat correctament', 'success');
            
            // Ejecutar callback si existe
            if (this.callbacks.onProfileUpdate) {
                this.callbacks.onProfileUpdate(data);
            }
            
            // Cerrar modal después de un delay
            setTimeout(() => {
                this.closeProfile();
            }, 1500);

        } catch (error) {
            console.error('Error updating profile:', error);
            this.showMessage(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Actualiza la UI con el nuevo nombre
     */
    updateUIWithNewName(newName) {
        // Actualizar título del dashboard si existe
        const dashboardTitle = document.querySelector('.dashboard-title');
        if (dashboardTitle && dashboardTitle.textContent.includes('Benvingut')) {
            dashboardTitle.textContent = `Benvingut, ${newName}!`;
        }

        // Actualizar dropdown de usuario en navbar
        const userDropdown = document.querySelector('#userDropdown');
        if (userDropdown) {
            const textNode = userDropdown.childNodes[0];
            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                textNode.textContent = newName;
            }
        }
    }

    /**
     * Muestra el estado de loading
     */
    showLoading() {
        const submitBtn = this.form.querySelector('button[type="submit"]');
        if (submitBtn) {
            window.uiUtils.showLoading(submitBtn.id || 'profileSubmitBtn', 'profileLoading');
        }
    }

    /**
     * Oculta el estado de loading
     */
    hideLoading() {
        const submitBtn = this.form.querySelector('button[type="submit"]');
        if (submitBtn) {
            window.uiUtils.hideLoading(submitBtn.id || 'profileSubmitBtn');
        }
    }

    /**
     * Muestra un mensaje en el modal
     */
    showMessage(message, type = 'error') {
        const messageContainer = document.getElementById('profileMessage');
        const messageText = messageContainer?.querySelector('.message-text');
        const messageIcon = messageContainer?.querySelector('.message-icon');
        
        if (!messageContainer || !messageText || !messageIcon) return;
        
        // Actualizar contenido
        messageText.textContent = message;
        
        // Actualizar clases
        messageContainer.className = `profile-message ${type}`;
        
        // Actualizar icono
        const iconName = window.uiUtils.getIconForMessageType(type);
        messageIcon.setAttribute('data-lucide', iconName);
        
        // Mostrar mensaje
        messageContainer.style.display = 'block';
        
        // Reinicializar iconos
        window.uiUtils.initializeLucideIcons();
        
        // Auto-ocultar mensajes de error después de 5 segundos
        if (type === 'error') {
            setTimeout(() => {
                this.hideMessage();
            }, 5000);
        }
    }

    /**
     * Oculta el mensaje del modal
     */
    hideMessage() {
        const messageContainer = document.getElementById('profileMessage');
        if (messageContainer) {
            messageContainer.style.display = 'none';
        }
    }

    /**
     * Configura un callback para cuando se actualiza el perfil
     */
    onProfileUpdate(callback) {
        this.callbacks.onProfileUpdate = callback;
    }
}

// Crear instancia global
window.profileManager = new ProfileManager();

// Función global para compatibilidad
window.showProfile = function() {
    window.profileManager.showProfile();
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    window.profileManager.initialize();
});

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProfileManager;
}
