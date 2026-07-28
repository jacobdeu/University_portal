// 1. REGISTRATION LOGIC (New School/Admin)
// 1. Dynamic Base URL Configuration (Browser Safe)
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api'
    : 'https://university-portal-mmuf.onrender.com/api';


// 2. Helper to build standard security headers with the JWT token
function getAuthHeaders() {
    const token = sessionStorage.getItem('token'); 
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// 3. CREATE ACCOUNT FORM SUBMISSION
document.getElementById('masterPassForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
        school_code: document.getElementById('newCode').value.trim(),
        school_name: document.getElementById('newName').value.trim(),
        role: document.getElementById('newRole').value,
        password: document.getElementById('newPass').value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/admin/register-school`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (response.ok) {
            showStatus("Account created successfully!", "success");
            e.target.reset();
            loadTable();
        } else {
            showStatus(result.message || "Registration failed", "error");
        }
    } catch (err) {
        showStatus("Server connection failed", "error");
    }
});

// 4. TABLE LOADING (READ)
async function loadTable() {
    const tableBody = document.getElementById('accessTableBody');
    if (!tableBody) return;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/reload-schools`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        const result = await response.json();
        const schools = result.data;

        if (!Array.isArray(schools) || schools.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No schools registered yet.</td></tr>';
            return;
        }
          
        tableBody.innerHTML = schools.map(item => {
            const cleanRole = item.role ? item.role.toLowerCase().trim() : '';
            const isSuper = (cleanRole === 'super_admin');
            const roleLabel = isSuper ? 'Super Admin' : 'School Admin';
            const roleStyle = isSuper ? 'style="color: #d35400; font-weight: bold;"' : '';

            return `
            <tr>
                <td><strong>${item.school_code}</strong></td>
                <td>${item.school_name}</td>
                <td ${roleStyle}>${roleLabel}</td>
                <td><span class="badge-code">Protected</span></td>
                <td>
                    <div class="action-buttons">
                        <button onclick="openEditModal('${item.school_code}', '${item.school_name}', '${cleanRole}')" class="btn-edit">Edit</button>
                        <button onclick="deleteSchool('${item.school_code}')" class="btn-delete">Revoke</button>
                    </div>
                </td>
            </tr>`;
        }).join('');
      
    } catch (err) {
        console.log("Load Table Error:", err);
        tableBody.innerHTML = `<tr><td colspan="5" style="color: red; text-align:center;">Server Offline</td></tr>`;
    }
}

let currentOldCode = "";

window.openEditModal = (code, name, role) => {
    currentOldCode = code;

    const modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'flex';
    
    document.getElementById('editCode').value = code;
    document.getElementById('editName').value = name;
    document.getElementById('editRole').value = role; 
    document.getElementById('editPass').value = ""; 

    const saveBtn = document.getElementById('saveUpdateBtn');
    if (saveBtn) saveBtn.onclick = submitEdit;
};

window.closeModal = () => {
    const modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'none';
};

// 5. SUBMIT UPDATE (UPDATE)
async function submitEdit() {
    const payload = {
        newCode: document.getElementById('editCode').value.trim(),
        schoolName: document.getElementById('editName').value.trim(),
        role: document.getElementById('editRole').value, 
        accessKey: document.getElementById('editPass').value.trim()
    };

    try {
        const response = await fetch(`${API_BASE_URL}/admin/update-school/${currentOldCode}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            closeModal();
            loadTable();
            showStatus("Credentials updated successfully!", "success");
        } else {
            showStatus(result.message || "Update failed", "error");
        }
    } catch (err) {
        showStatus("Connection error to server", "error");
    }
}

// 6. DELETE LOGIC (DELETE)
window.deleteSchool = async (id) => {
    if (!confirm(`Are you sure you want to revoke access for [${id}]?`)) return;
    try {
        const response = await fetch(`${API_BASE_URL}/admin/school/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        const result = await response.json();

        if (response.ok) {
            showStatus("Access revoked successfully", "success");
            loadTable();
        } else {
            showStatus(result.message || "Failed to delete record", "error");
        }
    } catch (err) {
        showStatus("Failed to delete record", "error");
    }
};

// 7. UI Helper
function showStatus(message, type) {
    const statusMsg = document.getElementById('statusMessage');
    if (!statusMsg) return;
    
    statusMsg.className = `toast-message toast-${type}`;
    statusMsg.innerHTML = message;
    statusMsg.style.display = 'block';

    if (window.statusTimeout) clearTimeout(window.statusTimeout);
    window.statusTimeout = setTimeout(() => { statusMsg.style.display = 'none'; }, 5000);
}

// Initial Load
loadTable();
