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
    const accessKeyInput = document.getElementById('accessCode');
    const errorMsg = document.getElementById('errorMsg');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Save original button content so we can restore it later
    const originalBtnContent = submitBtn ? submitBtn.innerHTML : '';

    const schoolCode = schoolSelect ? schoolSelect.value : ''; 
    const accessKey = accessKeyInput ? accessKeyInput.value.trim() : '';

    if (errorMsg) errorMsg.style.display = 'none';

    if (!schoolCode || accessKey === "") {
        if (errorMsg) {
            errorMsg.textContent = "All fields are required.";
            errorMsg.style.display = 'block';
        }
        return;
    }

    // Dynamic keyframe injection so spinner rotates regardless of external CSS
    if (!document.getElementById('btn-spin-keyframes')) {
        const style = document.createElement('style');
        style.id = 'btn-spin-keyframes';
        style.innerHTML = `
            @keyframes btnSpin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    try {
        // -------------------------------------------------------------
        // STEP 1: Show Animated Spinner & Disable Button
        // -------------------------------------------------------------
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <span style="display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
                    <span style="
                        width: 16px;
                        height: 16px;
                        border: 2px solid rgba(255, 255, 255, 0.3);
                        border-top: 2px solid #ffffff;
                        border-radius: 50%;
                        animation: btnSpin 0.8s linear infinite;
                        display: inline-block;
                        box-sizing: border-box;
                    "></span>
                    <span>Authenticating...</span>
                </span>
            `;
        }

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
            // Clear bad password input on failure
            if (accessKeyInput) accessKeyInput.value = '';
            
            // Restore button state
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnContent;
            }
        }
    } catch (err) {
        if (errorMsg) {
            errorMsg.textContent = "Unable to connect to the server. Please check your network.";
            errorMsg.style.display = 'block';
        }
        // Restore button state on connection error
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnContent;
        }
    }
});