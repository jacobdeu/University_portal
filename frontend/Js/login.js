// 1. Dynamic Base URL Configuration (Browser Safe)
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api'
    : 'https://university-portal-mmuf.onrender.com/api';



// Function to load schools into the dropdown
async function populateSchools() {
    const select = document.getElementById('userSchool');
    if (!select) return;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/reload-schools`);
        const result = await response.json();
        
        if (result.success) {
            select.innerHTML = '<option value="">-- Select Your School --</option>';
            
            result.data.forEach(school => {
                const option = document.createElement('option');
                option.value = school.school_code; 
                option.textContent = school.school_name;
                select.appendChild(option);
            });
        }
    } catch (err) {
        console.log("Failed to load schools:", err);
    }
}

// Run this on load
populateSchools();
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const schoolSelect = document.getElementById('userSchool');
    const errorMsg = document.getElementById('errorMsg');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    const schoolCode = schoolSelect.value; 
    const accessKey = document.getElementById('accessCode').value.trim();

    if (errorMsg) errorMsg.style.display = 'none';

    if (!schoolCode || accessKey === "") {
        if (errorMsg) {
            errorMsg.textContent = "All fields are required.";
            errorMsg.style.display = 'block';
        }
        return;
    }

    try {
        // Optional: UI loading feedback
        if (submitBtn) submitBtn.disabled = true;

        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schoolCode, accessKey })
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
            // 1. Store session data
            sessionStorage.setItem('token', data.token);
            sessionStorage.setItem('schoolName', data.schoolName);
            sessionStorage.setItem('schoolCode', data.schoolCode);
            sessionStorage.setItem('role', data.role);

            // 2. Safe Relative Redirect (strips leading slash if backend provided one)
            const relativePath = data.redirectUrl.replace(/^\/+/, '');
            window.location.href = `./${relativePath}`;
            
        } else {
            
            if (errorMsg) {
                errorMsg.textContent = data.message || "Invalid Access Code for the selected school.";
                errorMsg.style.display = 'block';
            }
        }
    } catch (err) {
        
        if (errorMsg) {
            errorMsg.textContent = "Unable to connect to the server. Please check your network.";
            errorMsg.style.display = 'block';
        }
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
});