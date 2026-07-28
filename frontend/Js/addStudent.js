// Centralized Production API Base URL
require('dotenv').config();
const API_BASE_URL = process.env.API_BASE_URL;

document.addEventListener('DOMContentLoaded', async () => {
    const savedName = sessionStorage.getItem('schoolName');
    const savedCode = sessionStorage.getItem('schoolCode');
    const token = sessionStorage.getItem('token');

    // Security Gate: Kick out unauthenticated traffic immediately
    if (!token || !savedCode || !savedName) {
        console.warn("Unauthorized access attempt. Redirecting to login...");
        sessionStorage.clear();
        window.location.href = 'login.html';
        return;
    }

    const collegeSelect = document.getElementById('collegeSelect');
    const collegeLabel = document.getElementById('collegeLabel');
    const studentInput = document.getElementById('student_id');
    const semesterSelect = document.getElementById('semesterSelect');
    const departmentSelect = document.getElementById('departmentSelect');

    // 1. Initialize Form UI Layout Components
    if (collegeSelect && studentInput) {
        collegeSelect.innerHTML = '';
        const newOption = document.createElement('option');
        newOption.value = savedName;
        newOption.textContent = savedName;
        collegeSelect.appendChild(newOption);

        studentInput.placeholder = `e.g. 26-${savedCode}-001`;

        // Visual lock adjustments (read-only state)
        collegeSelect.style.pointerEvents = 'none';
        collegeSelect.style.backgroundColor = '#eef2f7';
        collegeSelect.style.color = '#000';
        collegeSelect.tabIndex = -1;

        if (collegeLabel) {
            collegeLabel.textContent = savedName;
        }
    }

    // 2. Fetch and Populate Departments for this School
    await fetchDepartments(savedCode, token);

    // 3. Dropdown Event Listener Setup
    const handleSelectionChange = () => {
        const selectedDepartment = departmentSelect ? departmentSelect.value : '';
        const selectedSemester = semesterSelect ? semesterSelect.value : '';

        // Dynamically update student ID placeholder based on selected department's index format
        if (departmentSelect && studentInput) {
            const selectedOption = departmentSelect.options[departmentSelect.selectedIndex];
            const indexFormat = selectedOption?.getAttribute('data-index-format');
            if (indexFormat) {
                studentInput.placeholder = `e.g. ${indexFormat}`;
            }
        }

        // Only load courses when both department and semester are selected
        if (selectedDepartment && selectedSemester) {
            loadSchoolCourses(savedName, selectedDepartment, selectedSemester);
        }
    };

    if (semesterSelect) {
        semesterSelect.addEventListener('change', handleSelectionChange);
    }

    if (departmentSelect) {
        departmentSelect.addEventListener('change', handleSelectionChange);
    }
});

// Fetch department list from backend API
async function fetchDepartments(schoolCode, token) {
    const departmentSelect = document.getElementById('departmentSelect');
    if (!departmentSelect) return;

    try {
        departmentSelect.innerHTML = '<option value="" disabled selected>Loading departments...</option>';

        const response = await fetch(`${API_BASE_URL}/api/admin/getDepartments?school_code=${encodeURIComponent(schoolCode)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to load departments (Status ${response.status})`);
        }

        const data = await response.json();

        // Extract array from response payload object
        const departmentsList = data.departments || [];

        departmentSelect.innerHTML = '<option value="" disabled selected>Select Department</option>';

        if (departmentsList.length === 0) {
            departmentSelect.innerHTML = '<option value="" disabled selected>No departments found</option>';
            return;
        }

        departmentsList.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.department_name;
            option.textContent = dept.department_name;

            // Store index_format on option attribute (e.g., YY-CIT-NNN)
            if (dept.index_format) {
                option.setAttribute('data-index-format', dept.index_format);
            }

            departmentSelect.appendChild(option);
        });

    } catch (error) {
        console.error('Error fetching departments:', error);
        departmentSelect.innerHTML = '<option value="" disabled selected>Error loading departments</option>';
    }
}

// Loads courses filtered by School, Department, and Semester
async function loadSchoolCourses(schoolName, department, semester) {
    const marksBody = document.getElementById('marksBody');
    const token = sessionStorage.getItem('token');

    const params = new URLSearchParams({
        schoolName: schoolName,
        department: department,
        semester: semester
    });

    try {
        marksBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading subjects...</td></tr>';

        const response = await fetch(`${API_BASE_URL}/api/admin/loadCourses?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error('Session validation failed or expired.');
            }
            throw new Error('Network response was not ok');
        }

        const courses = await response.json();
        marksBody.innerHTML = '';

        if (!courses || courses.length === 0) {
            marksBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No subjects found for this department and semester.</td></tr>';
            return;
        }

        courses.forEach(course => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${course.course_name}</td>
                <td>
                    <input type="text" class="course-id" value="${course.course_id}" readonly 
                           style="border:none; background:transparent; outline:none; width:100%;">
                </td>
                <td><input type="text" class="grade-input" maxlength="2" placeholder="A+"></td>
                <td><input type="number" class="gp-input" step="0.1" min="0" max="4" placeholder="0.0"></td>
            `;
            marksBody.appendChild(row);
        });

    } catch (error) {
        console.error('Error fetching courses:', error);
        marksBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">Failed to load subjects: ${error.message}</td></tr>`;
    }
}

document.getElementById('bulkMarksForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const schoolCode = sessionStorage.getItem('schoolCode');
    const studentId = document.getElementById('student_id').value.trim();
    const semester = document.getElementById('semesterSelect').value;

    // 1. Grab the department value from the dropdown select
    const departmentSelect = document.getElementById('departmentSelect');
    const department = departmentSelect ? departmentSelect.value : "";

    // 2. Validate required fields
    if (!schoolCode || !studentId || !semester || !department) {
        alert("Please ensure School, Student ID, Department, and Semester are all selected.");
        return;
    }

    const marksData = [];
    const rows = document.querySelectorAll('#marksBody tr');
    let isValid = true;

    rows.forEach((row, index) => {
        if (row.querySelector('td[colspan]')) return;

        const courseIdInput = row.querySelector('.course-id');
        const gradeInput = row.querySelector('.grade-input');
        const gpInput = row.querySelector('.gp-input');

        const courseId = courseIdInput ? courseIdInput.value.trim() : "";
        const grade = gradeInput ? gradeInput.value.trim().toUpperCase() : "";
        const gpValue = gpInput ? gpInput.value : "";
        const gp = parseFloat(gpValue);

        if (!courseId || !grade || isNaN(gp)) {
            alert(`Error in row ${index + 1}: Please enter both Grade and Grade Point.`);
            row.style.backgroundColor = "#fff0f0";
            isValid = false;
            return;
        }

        row.style.backgroundColor = "";

        // 3. Attach department to payload
        marksData.push({
            school_code: schoolCode,
            student_id: studentId,
            department: department,
            course_id: courseId,
            grade: grade,
            grade_point: gp.toFixed(2),
            semester: semester
        });
    });

    if (isValid && marksData.length > 0) {
        await sendToServer(marksData);
    }
});

async function sendToServer(marksData) {
    const submitBtn = document.getElementById('submitBtn');
    const originalBtnText = submitBtn.innerText;

    submitBtn.disabled = true;
    submitBtn.innerText = "Uploading...";

    try {
        const token = sessionStorage.getItem('token');

        const response = await fetch(`${API_BASE_URL}/api/admin/upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(marksData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            submitBtn.innerText = "✔ Success!";
            setTimeout(() => location.reload(), 2000);
        } else {
            submitBtn.innerText = "✖ " + (result.message || "Error");
        }
    } catch (err) {
        console.error("Network error:", err);
        submitBtn.innerText = "✖ Server Connection Failed";
    } finally {
        setTimeout(() => {
            if (submitBtn.innerText.includes("✖")) {
                submitBtn.disabled = false;
                submitBtn.innerText = originalBtnText;
            }
        }, 3000);
    }
}
