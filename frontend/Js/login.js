

import 'dotenv/config';
const API_BASE_URL = process.env.API_BASE_URL;


// Function to load schools into the dropdown
async function populateSchools() {
    const select = document.getElementById('userSchool');
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/reload-schools`);
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

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const schoolSelect = document.getElementById('userSchool');
    const errorMsg = document.getElementById('errorMsg');
    
    const schoolCode = schoolSelect.value; 
    const accessKey = document.getElementById('accessCode').value.trim();

    errorMsg.style.display = 'none';

    if (!schoolCode || accessKey === "") {
        errorMsg.textContent = "All fields are required.";
        errorMsg.style.display = 'block';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schoolCode, accessKey })
        });

        const data = await response.json();
        
        if (data.success) {
            // 1. Store session data
            sessionStorage.setItem('token', data.token);
            sessionStorage.setItem('schoolName', data.schoolName);
            sessionStorage.setItem('schoolCode', data.schoolCode);
            sessionStorage.setItem('role', data.role); // Save role for dashboard checks 

            // 2. Dynamic Redirect
            window.location.href = data.redirectUrl;
            
        } else {
            // 401 Unauthenticated or 400 Bad Request
            errorMsg.textContent = data.message || "Invalid credentials.";
            errorMsg.style.display = 'block';
        }
    } catch (err) {
        errorMsg.textContent = "Unable to connect to the server.";
        errorMsg.style.display = 'block';
    }
});