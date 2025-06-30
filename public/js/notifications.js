// Event notifications for Council of The Ancients - Dune Awakening Events
// This file adds toast notifications for various user actions

// Function to show bootstrap toast notifications
function showToast(message, type = 'success', title = '') {
    // Define colors for different toast types
    const toastTypes = {
        success: { bgColor: '#335533', textColor: '#ffffff', icon: 'bi-check-circle-fill' },
        error: { bgColor: '#772222', textColor: '#ffffff', icon: 'bi-exclamation-circle-fill' },
        info: { bgColor: '#225577', textColor: '#ffffff', icon: 'bi-info-circle-fill' },
        warning: { bgColor: '#856404', textColor: '#ffffff', icon: 'bi-exclamation-triangle-fill' }
    };
    
    // Default to success if type not found
    const toastType = toastTypes[type] || toastTypes.success;
    
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '11';
        document.body.appendChild(toastContainer);
    }
    
    // Generate unique ID for the toast
    const toastId = 'toast-' + Date.now();
    
    // Create toast element
    const toastElement = document.createElement('div');
    toastElement.className = 'toast';
    toastElement.id = toastId;
    toastElement.setAttribute('role', 'alert');
    toastElement.setAttribute('aria-live', 'assertive');
    toastElement.setAttribute('aria-atomic', 'true');
    
    // Add custom styling
    toastElement.style.background = `linear-gradient(135deg, ${toastType.bgColor}, ${toastType.bgColor}ee)`;
    toastElement.style.color = toastType.textColor;
    toastElement.style.border = '1px solid rgba(255, 140, 0, 0.2)';
    toastElement.style.borderRadius = '10px';
    toastElement.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
    
    // Create toast content
    const titleHtml = title ? `<strong class="me-auto">${title}</strong>` : '';
    const iconHtml = `<i class="bi ${toastType.icon} me-2"></i>`;
    
    toastElement.innerHTML = `
        <div class="toast-header" style="background: transparent; border-bottom: 1px solid rgba(255, 140, 0, 0.2); color: inherit;">
            ${iconHtml}
            ${titleHtml}
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;
    
    // Add to container
    toastContainer.appendChild(toastElement);
    
    // Initialize toast
    const toast = new bootstrap.Toast(toastElement, {
        delay: 5000,
        autohide: true
    });
    
    // Show toast
    toast.show();
    
    // Remove from DOM after hidden
    toastElement.addEventListener('hidden.bs.toast', function () {
        toastElement.remove();
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Add toast notifications for event-related actions
    
    // Event signup
    const signupForms = document.querySelectorAll('form[action*="/events/"][action$="/signup"]');
    signupForms.forEach(form => {
        form.dataset.action = 'Signing up for event';
        form.addEventListener('submit', function() {
            showToast('Processing your signup...', 'info', 'Please Wait');
        });
    });
    
    // Remove signup
    const removeSignupForms = document.querySelectorAll('form[action*="/events/"][action$="/remove-signup"]');
    removeSignupForms.forEach(form => {
        form.dataset.action = 'Removing your signup';
        form.addEventListener('submit', function() {
            showToast('Removing your signup...', 'info', 'Please Wait');
        });
    });
    
    // Create event
    const createEventForm = document.querySelector('form[action="/events/create"]');
    if (createEventForm) {
        createEventForm.dataset.action = 'Creating new event';
        createEventForm.addEventListener('submit', function() {
            const eventTitle = document.querySelector('#title').value;
            showToast(`Creating event: ${eventTitle}`, 'info', 'Processing');
        });
    }
    
    // Edit event
    const editEventForms = document.querySelectorAll('form[action*="/events/"][action$="/edit"]');
    editEventForms.forEach(form => {
        form.dataset.action = 'Updating event';
        form.addEventListener('submit', function() {
            const eventTitle = document.querySelector('#title').value;
            showToast(`Updating event: ${eventTitle}`, 'info', 'Processing');
        });
    });
    
    // Delete event
    const deleteEventForms = document.querySelectorAll('form[action*="/events/"][action$="/delete"]');
    deleteEventForms.forEach(form => {
        form.dataset.action = 'Deleting event';
        form.addEventListener('submit', function(e) {
            // Add confirmation dialog
            if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
                e.preventDefault();
                return false;
            }
            showToast('Deleting event...', 'warning', 'Please Wait');
        });
    });
    
    // Add custom toast notifications for dynamic elements
    document.querySelectorAll('[data-toast]').forEach(el => {
        el.addEventListener('click', function() {
            const message = this.dataset.toastMessage || 'Action performed successfully';
            const type = this.dataset.toastType || 'success';
            const title = this.dataset.toastTitle || '';
            showToast(message, type, title);
        });
    });
});
