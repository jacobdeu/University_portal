// Centralized Production API Base URL
require('dotenv').config();
const API_BASE_URL = process.env.API_BASE_URL;

const savedCode = sessionStorage.getItem('schoolCode');

// Pre-fill and DISABLE school code input (admin can't change it)
const schoolCodeInput = document.getElementById('school_code');
if (schoolCodeInput && savedCode) {
    schoolCodeInput.value = savedCode;
    schoolCodeInput.disabled = true;
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validateForm() {
    let isValid = true;

    const indexFormatElem = document.getElementById('index_format');
    const deptNameElem = document.getElementById('department_name');

    const index_format = indexFormatElem ? indexFormatElem.value.trim() : '';
    const department_name = deptNameElem ? deptNameElem.value.trim() : '';

    const indexHint = document.getElementById('index_format_hint');
    const deptHint = document.getElementById('department_name_hint');

    // Reset hints
    if (indexHint) indexHint.textContent = '';
    if (deptHint) deptHint.textContent = '';

    if (!index_format) {
        if (indexHint) indexHint.textContent = '⚠️ Index format is required.';
        isValid = false;
    } else if (!/^YY-[A-Z]{2,10}-NNN$/.test(index_format)) {
        if (indexHint) indexHint.textContent = '⚠️ Format must be like: YY-CYS-NNN or YY-MED-NNN';
        isValid = false;
    }

    if (!department_name) {
        if (deptHint) deptHint.textContent = '⚠️ Department name is required.';
        isValid = false;
    } else if (department_name.length < 3) {
        if (deptHint) deptHint.textContent = '⚠️ Must be at least 3 characters.';
        isValid = false;
    }

    return isValid;
}

// ─── Toast Notification ───────────────────────────────────────────────────────
function showToast(message, type = 'success') {
    // Remove any existing toast first
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ─── Submit ───────────────────────────────────────────────────────────────────
document.getElementById('departmentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!savedCode) {
        showToast('Session expired. Please log in again.', 'warning');
        return;
    }

    if (!validateForm()) return;

    const payload = {
        school_code:     savedCode,
        index_format:    document.getElementById('index_format').value.trim(),
        department_name: document.getElementById('department_name').value.trim(),
    };

    try {
        // Grab the active session token from sessionStorage
        const token = sessionStorage.getItem('token');

        const response = await fetch(`${API_BASE_URL}/api/admin/departments`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Added Security Header
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (response.ok) {
            showToast(`Department "${payload.department_name}" saved successfully!`, 'success');
            
            const deptForm = document.getElementById('departmentForm');
            if (deptForm) deptForm.reset();

            if (schoolCodeInput) {
                schoolCodeInput.value    = savedCode;
                schoolCodeInput.disabled = true;
            }
        } else {
            // Displays specific backend middleware or controller rejection strings
            showToast(data.message || data.error || 'Something went wrong.', 'error');
        }

    } catch (error) {
        console.error('Submit error:', error);
        showToast('Connection Error: Please check your server.', 'error');
    }
});
