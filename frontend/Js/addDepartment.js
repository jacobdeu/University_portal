// 1. Dynamic Base URL Configuration (Browser Safe)
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api'
    : 'https://university-portal-mmuf.onrender.com/api';

// Retrieve persistent admin session data
const savedCode = sessionStorage.getItem('schoolCode');

// Pre-fill and lock school code input field
const schoolCodeInput = document.getElementById('school_code');
if (schoolCodeInput && savedCode) {
    schoolCodeInput.value = savedCode;
    schoolCodeInput.disabled = true;
}

// ─── Validation Helper ────────────────────────────────────────────────────────
function validateForm() {
    let isValid = true;

    const indexFormatElem = document.getElementById('index_format');
    const deptNameElem = document.getElementById('department_name');

    const index_format = indexFormatElem ? indexFormatElem.value.trim() : '';
    const department_name = deptNameElem ? deptNameElem.value.trim() : '';

    const indexHint = document.getElementById('index_format_hint');
    const deptHint = document.getElementById('department_name_hint');

    // Reset error hint messages
    if (indexHint) indexHint.textContent = '';
    if (deptHint) deptHint.textContent = '';

    // Validate index format structure (e.g., YY-CYS-NNN or YY-MED-NNN)
    if (!index_format) {
        if (indexHint) indexHint.textContent = '⚠️ Index format is required.';
        isValid = false;
    } else if (!/^YY-[A-Z]{2,10}-NNN$/.test(index_format)) {
        if (indexHint) indexHint.textContent = '⚠️ Format must follow: YY-CYS-NNN or YY-MED-NNN';
        isValid = false;
    }

    // Validate department length
    if (!department_name) {
        if (deptHint) deptHint.textContent = '⚠️ Department name is required.';
        isValid = false;
    } else if (department_name.length < 3) {
        if (deptHint) deptHint.textContent = '⚠️ Must be at least 3 characters.';
        isValid = false;
    }

    return isValid;
}

// ─── Toast Feedback Notification ──────────────────────────────────────────────
function showToast(message, type = 'success') {
    // Purge existing visible toasts
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 3000);
}

// ─── Department Form Submit Dispatch ──────────────────────────────────────────
document.getElementById('departmentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!savedCode) {
        showToast('Session expired. Please log in again.', 'warning');
        return;
    }

    if (!validateForm()) return;

    const payload = {
        school_code: savedCode,
        index_format: document.getElementById('index_format')?.value.trim(),
        department_name: document.getElementById('department_name')?.value.trim(),
    };

    try {
        const token = sessionStorage.getItem('token');

        // Path cleanly maps to: ${API_BASE_URL}/admin/departments
        // Local: http://localhost:5000/api/admin/departments
        // Production: https://university-portal-backend.onrender.com/api/admin/departments
        const response = await fetch(`${API_BASE_URL}/admin/departments`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (response.ok) {
            showToast(`Department "${payload.department_name}" saved successfully!`, 'success');
            
            const deptForm = document.getElementById('departmentForm');
            if (deptForm) deptForm.reset();

            // Re-apply locked state to disabled school input post-reset
            if (schoolCodeInput) {
                schoolCodeInput.value = savedCode;
                schoolCodeInput.disabled = true;
            }
        } else {
            showToast(data.message || data.error || 'Something went wrong.', 'error');
        }

    } catch (error) {
        console.error('Submit error:', error);
        showToast('Connection Error: Unable to reach the server.', 'error');
    }
});


