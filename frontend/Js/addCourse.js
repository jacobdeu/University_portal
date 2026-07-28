// Centralized Production API Base URL
import 'dotenv/config';
const API_BASE_URL = process.env.API_BASE_URL;

document.addEventListener('DOMContentLoaded', async () => {
    const schoolSelect = document.getElementById('school_name');
    const codeSelect = document.getElementById('school_code');
    const departmentSelect = document.getElementById('departmentSelect');
    const courseForm = document.getElementById('courseEntryForm');

    const savedName = sessionStorage.getItem('schoolName');
    const savedCode = sessionStorage.getItem('schoolCode');

    // 1. Initialize School Code and Name Fields from Session Data
    if (savedName && savedCode) {
        if (codeSelect) {
            codeSelect.innerHTML = `<option value="${savedCode}">${savedCode}</option>`;
            codeSelect.style.pointerEvents = "none";
            codeSelect.style.backgroundColor = "var(--disabled-bg)";
        }

        if (schoolSelect) {
            schoolSelect.value = savedName;
            schoolSelect.style.pointerEvents = "none";
            schoolSelect.style.backgroundColor = "var(--disabled-bg)";
        }
    } else {
        console.warn("Session data missing. Check login storage keys.");
    }

    // 2. Fetch and Populate Departments
    if (!savedCode) {
        console.warn('No schoolCode found in sessionStorage.');
        if (departmentSelect) {
            departmentSelect.innerHTML = '<option value="" disabled selected>No School Selected</option>';
        }
    } else if (departmentSelect) {
        try {
            departmentSelect.innerHTML = '<option value="" disabled selected>Loading departments...</option>';

            const response = await fetch(`${API_BASE_URL}/api/admin/getDepartments?school_code=${encodeURIComponent(savedCode)}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success && Array.isArray(data.departments) && data.departments.length > 0) {
                departmentSelect.innerHTML = '<option value="" disabled selected>Select Department</option>';

                data.departments.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept.department_name;
                    option.textContent = dept.department_name;
                    departmentSelect.appendChild(option);
                });
            } else {
                departmentSelect.innerHTML = '<option value="" disabled selected>No departments found</option>';
            }
        } catch (error) {
            console.error('Error fetching departments:', error);
            departmentSelect.innerHTML = '<option value="" disabled selected>Failed to load departments</option>';
        }
    }

    // 3. Handle Form Submission
    if (courseForm) {
        courseForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const status = document.getElementById('status');
            const submitBtn = document.getElementById('submitBtn');

            const courseData = {
                school_code: codeSelect ? codeSelect.value : '',
                school_name: schoolSelect ? schoolSelect.value : '',
                department: departmentSelect ? departmentSelect.value : '',
                course_id: document.getElementById('course_id').value.toUpperCase().trim(),
                course_name: document.getElementById('course_name').value.trim(),
                semester: parseInt(document.getElementById('semester').value, 10),
                credit_hours: parseInt(document.getElementById('credit_hours').value, 10)
            };
            
            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerText = "Saving...";
                }
                if (status) status.style.display = "none";

                const token = sessionStorage.getItem('token');

                const response = await fetch(`${API_BASE_URL}/api/admin/add-course`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(courseData)
                });

                const result = await response.json();

                if (response.ok) {
                    if (status) {
                        status.innerText = `✅ Success: ${courseData.course_id} added!`;
                        status.className = "status-msg status-success";
                        status.style.display = "block";
                    }

                    // Reset form fields
                    this.reset();

                    // Re-inject session defaults after form reset
                    if (savedName && savedCode) {
                        if (codeSelect) codeSelect.innerHTML = `<option value="${savedCode}">${savedCode}</option>`;
                        if (schoolSelect) schoolSelect.value = savedName;
                    }

                    setTimeout(() => {
                        if (status) {
                            status.style.display = "none";
                            status.innerText = "";
                        }
                    }, 4000);

                } else {
                    throw new Error(result.message || "Failed to save course.");
                }
            } catch (error) {
                if (status) {
                    status.innerText = "❌ Error: " + error.message;
                    status.className = "status-msg status-error";
                    status.style.display = "block";
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = "Save Course to Database";
                }
            }
        });

        // Hide error banner when typing
        courseForm.addEventListener('input', () => {
            const status = document.getElementById('status');
            if (status && status.style.display === "block") {
                status.style.display = "none";
            }
        });
    }
});

