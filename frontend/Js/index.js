/**
 * ============================================================
 * Project: University of Juba Result Portal
 * Module: Student Registrar Ticket System
 * Author: Jacob Deu Bior
 * Role: Junior Full-Stack Developer (South Sudan)
 * Date: April 2026
 * Description: Secure SQL integration and frontend-backend 
 * synchronization for real-time student inquiries.
 * ============================================================
 */

//insight.uoj.edu.ss
import 'dotenv/config';
const API_BASE_URL = process.env.API_BASE_URL;


function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    // If switching back to results, hide the table until searched again
    if (pageId === 'results') document.getElementById('resultsDisplay').classList.remove('active');
    window.scrollTo(0, 0);
}
window.showPage = showPage;

async function loadSchools() {
    const schoolSelect = document.getElementById('schoolNameSelect');

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/reload-schools`);
        const result = await response.json();

        if (result.success) {
            // Clear current options
            schoolSelect.innerHTML = '<option value="" disabled selected>Select School</option>';

            // Fill with database data
            result.data.forEach(school => {
                const option = document.createElement('option');

                // Use school_name for both the hidden value and the visible text
                option.value = school.school_name;
                option.textContent = school.school_name;

                schoolSelect.appendChild(option);
            });
        } else {
            console.error("Server reported failure:", result.message);
        }
    } catch (err) {
        console.error("Network error:", err);
    }
}

window.onload = loadSchools;

async function fetchResults() {
    const schoolSelect = document.getElementById('schoolNameSelect');
    const semesterSelect = document.getElementById('studentSemesterSelect');
    const studentIDField = document.getElementById('studentID');

    const school = schoolSelect.value;
    const semester = semesterSelect.value;
    const student_id = studentIDField.value.trim();

    // Call your data fetching function
    await fetchStudentData(student_id, school, semester);

    // Clear the fields after the fetch is successful
    schoolSelect.value = '';
    semesterSelect.value = '';
    studentIDField.value = '';
}

let errorTimer;

// Helper function to manage timed messages cleanly
function showTimedError(element, message) {
    element.innerText = message;
    element.style.color = "#dc3545";
    errorTimer = setTimeout(() => {
        element.innerText = "";
    }, 4000);
}

async function fetchStudentData(student_id, school, semester) {
    const resultsDisplay = document.getElementById('resultsDisplay');
    const errorEl = document.getElementById('error-message');

    // 1. Reset UI State
    if (errorTimer) clearTimeout(errorTimer);
    if (resultsDisplay) resultsDisplay.style.display = 'none';
    if (errorEl) errorEl.innerText = "";

    if (!student_id || !school || !semester) {
        showTimedError(errorEl, "Please provide Student ID, School, and Semester.");
        return;
    }

    const params = new URLSearchParams({ id: student_id, school, semester });

    try {
        const [response, gpaResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/api/student/result?${params.toString()}`),
            fetch(`${API_BASE_URL}/api/student/gpa?${params.toString()}`)
        ]);

        // 2. Parse JSON payloads safely
        const resultsData = await response.json().catch(() => null);
        const gpaData = await gpaResponse.json().catch(() => null);

        // 3. Handle Errors (Non-200 responses)
        if (!response.ok || !gpaResponse.ok) {
            // Priority 1: Extract backend custom message directly
            let message = resultsData?.message || gpaData?.message;

            // Priority 2: Precise status fallbacks if payload parsing failed
            if (!message) {
                if (response.status === 400 || gpaResponse.status === 400) {
                    message = "Input verification failed. Check your ID format.";
                } else if (response.status === 404 || gpaResponse.status === 404) {
                    message = "Records not found for the provided details.";
                } else if (response.status === 500) {
                    message = "Server error. Please try again later.";
                } else {
                    message = "An unexpected error occurred.";
                }
            }

            showTimedError(errorEl, message);
            return;
        }

        // 4. Data Safety Interceptor
        if (!resultsData || resultsData.length === 0) {
            showTimedError(errorEl, "No records found for this semester.");
            return;
        }

        // 5. Success Flow
        errorEl.innerText = "";
        renderTable(resultsData, student_id, gpaData);

    } catch (err) {
        console.error("Fetch Error:", err);
        showTimedError(errorEl, "Connection failed. Please check your network or server setup.");
    }
}

// Make sure this matches your HTML button's onclick name!
window.fetchResults = fetchResults;

function renderTable(results, idNumber, gpa) {
    // 1. Target the elements specifically
    const resultsSection = document.getElementById('resultsDisplay');
    const tableBody = document.getElementById('resultsTableBody'); // Target by explicit ID
    const mobileCardsContainer = document.getElementById('resultCards'); // Mobile container
    
    const nameHeader = document.getElementById('displayName');
    const gpaBox = document.getElementById('gpaDisplay');
    
    const semesterBox = document.getElementById('displaySemester');
    const schoolBox = document.getElementById('displaySchool');
    const departmentBox = document.getElementById('displayDepartment');

    console.log(results);

    // 2. Clear existing items to avoid layout duplication
    if (tableBody) tableBody.innerHTML = "";
    if (mobileCardsContainer) mobileCardsContainer.innerHTML = "";

    // 3. Loop through your courses and build BOTH layouts
    results.forEach((course, index) => {
        // --- Desktop Row String Layout ---
        const desktopRow = `
            <tr>
                <td>${index + 1}</td>
                <td>${course.course_name}</td>
                <td>${course.credit_hours}</td>
                <td class="grade-badge">${course.grade}</td>
            </tr>
        `;
        if (tableBody) tableBody.insertAdjacentHTML('beforeend', desktopRow);

        // --- Mobile Card String Layout (Matches your CSS definitions) ---
        const mobileCard = `
            <div class="result-card">
                <div class="subject-info">
                    <div class="subject-name">${course.course_name}</div>
                    <div class="subject-meta">Credits: ${course.credit_hours}</div>
                </div>
                <div class="grade-pill">${course.grade}</div>
            </div>
        `;
        if (mobileCardsContainer) mobileCardsContainer.insertAdjacentHTML('beforeend', mobileCard);
    });

    // 4. Fill in the Metadata headers cleanly
    const firstRow = results[0];
    const studentName = firstRow?.student_name || "Student";
    
    nameHeader.innerText = `${studentName} (${idNumber})`;
    gpaBox.innerText = gpa?.gpa || "0.00";

    if (semesterBox) semesterBox.innerText = firstRow?.semester || "N/A";
    if (schoolBox) schoolBox.innerText = firstRow?.school_name || "N/A";
    if (departmentBox) departmentBox.innerText = firstRow?.department_name || "N/A";

    // 5. Override initial visibility rules
    resultsSection.style.display = "block";
    resultsSection.classList.add('active');
}

async function loadAnnouncements() {
    const container = document.getElementById('announcementList');

    try {
        const response = await fetch(`${API_BASE_URL}/api/student/news`);
        const data = await response.json();

        const newsArray = data.message;

        if (!Array.isArray(newsArray) || newsArray.length === 0) {
            container.innerHTML = `<p style="text-align:center; color:#888; padding: 20px;">No active announcements at this time.</p>`;
            return;
        }

        const displayArray = newsArray.toReversed ? newsArray.toReversed() : [...newsArray].reverse();

        container.innerHTML = displayArray.map(post => `
            <div class="announcement-card" style="
                background: white; 
                padding: 20px; 
                border-radius: 12px; 
                margin-bottom: 15px; 
                border-left: 6px solid #1a2a6c; 
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            ">
                <div class="announcement-title" style="color: #1a2a6c; font-size: 1.3rem; font-weight: 800; margin-bottom: 10px;">
                    ${post.title}
                </div>
                <div class="announcement-body" style="color: #444; line-height: 1.6;">
                    ${post.message}
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.log("News Fetch Error:", error);
        container.innerHTML = `<p style="color:#d63031; text-align:center;">Unable to load news updates.</p>`;
    }
}

loadAnnouncements();

document.addEventListener('DOMContentLoaded', () => {
    populateSchools();
});

// Student contact form school loader
async function populateSchools() {
    const schoolSelect = document.getElementById('contactSchoolSelect');

    // Safety check: if the select doesn't exist on this specific page, stop.
    if (!schoolSelect) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/reload-schools`);
        const result = await response.json();

        if (result.success && Array.isArray(result.data)) {
            schoolSelect.innerHTML = '<option value="" disabled selected>Select Your School</option>';

            result.data.forEach(school => {
                const option = document.createElement('option');
                option.value = school.school_name;
                option.textContent = school.school_name;
                schoolSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error populating schools:', error);
    }
}

let ticketTimer;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

document.getElementById('ticketForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    
    if (ticketTimer) clearTimeout(ticketTimer);

    const idInput = document.getElementById('contactId');
    const schoolSelect = document.getElementById('contactSchoolSelect');
    const messageInput = document.getElementById('message');
    const responseEl = document.getElementById('responseMessage');
    const submitBtn = this.querySelector('button[type="submit"]');

    const ticketData = {
        studentId: idInput.value.trim(),
        schoolName: schoolSelect.value,
        message: messageInput.value.trim()
    };

    submitBtn.disabled = true;
    submitBtn.innerText = "Submitting...";
    responseEl.innerText = "";

    try {
        const [response] = await Promise.all([
            fetch(`${API_BASE_URL}/api/student/submit-ticket`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ticketData)
            }),
            delay(2000)
        ]);

        const result = await response.json();

        if (response.ok) {
            responseEl.innerText = "Ticket submitted successfully!";
            responseEl.style.color = "#28a745";
            this.reset();
        } else {
            responseEl.innerText = result.error || "Submission failed.";
            responseEl.style.color = "#dc3545";
        }
    } catch (err) {
        responseEl.innerText = "Server connection failed.";
        responseEl.style.color = "#dc3545";
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Submit Ticket";

        ticketTimer = setTimeout(() => {
            responseEl.innerText = "";
        }, 4000);
    }
});