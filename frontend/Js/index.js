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
// 1. Dynamic Base URL Configuration (Browser Safe)
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api'
    : 'https://university-portal-mmuf.onrender.com/api';

// 2. Navigation Control
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(pageId);
    
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // If switching back to results, hide the table until searched again
    if (pageId === 'results') {
        const resultsDisplay = document.getElementById('resultsDisplay');
        if (resultsDisplay) resultsDisplay.classList.remove('active');
    }
    window.scrollTo(0, 0);
}
window.showPage = showPage;

// 3. Load Schools in Main Results Dropdown
async function loadSchools() {
    const schoolSelect = document.getElementById('schoolNameSelect');
    if (!schoolSelect) return;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/reload-schools`);
        const result = await response.json();

        if (result.success) {
            schoolSelect.innerHTML = '<option value="" disabled selected>Select School</option>';

            result.data.forEach(school => {
                const option = document.createElement('option');
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

// 4. Results Search Trigger
async function fetchResults() {
    const schoolSelect = document.getElementById('schoolNameSelect');
    const semesterSelect = document.getElementById('studentSemesterSelect');
    const studentIDField = document.getElementById('studentID');

    if (!schoolSelect || !semesterSelect || !studentIDField) return;

    const school = schoolSelect.value;
    const semester = semesterSelect.value;
    const student_id = studentIDField.value.trim();

    await fetchStudentData(student_id, school, semester);

    // Clear the fields after fetch attempt
    schoolSelect.value = '';
    semesterSelect.value = '';
    studentIDField.value = '';
}
window.fetchResults = fetchResults;

let errorTimer;

function showTimedError(element, message) {
    if (!element) return;
    element.innerText = message;
    element.style.color = "#dc3545";
    errorTimer = setTimeout(() => {
        element.innerText = "";
    }, 4000);
}

// 5. Fetch Student Data & GPA
async function fetchStudentData(student_id, school, semester) {
    const resultsDisplay = document.getElementById('resultsDisplay');
    const errorEl = document.getElementById('error-message');

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
            fetch(`${API_BASE_URL}/student/result?${params.toString()}`),
            fetch(`${API_BASE_URL}/student/gpa?${params.toString()}`)
        ]);

        const resultsData = await response.json().catch(() => null);
        const gpaData = await gpaResponse.json().catch(() => null);

        if (!response.ok || !gpaResponse.ok) {
            let message = resultsData?.message || gpaData?.message;

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

        if (!resultsData || resultsData.length === 0) {
            showTimedError(errorEl, "No records found for this semester.");
            return;
        }

        errorEl.innerText = "";
        renderTable(resultsData, student_id, gpaData);

    } catch (err) {
        console.error("Fetch Error:", err);
        showTimedError(errorEl, "Connection failed. Please check your network or server setup.");
    }
}

// 6. Render Table & Mobile Layout
function renderTable(results, idNumber, gpa) {
    const resultsSection = document.getElementById('resultsDisplay');
    const tableBody = document.getElementById('resultsTableBody');
    const mobileCardsContainer = document.getElementById('resultCards');
    
    const nameHeader = document.getElementById('displayName');
    const gpaBox = document.getElementById('gpaDisplay');
    
    const semesterBox = document.getElementById('displaySemester');
    const schoolBox = document.getElementById('displaySchool');
    const departmentBox = document.getElementById('displayDepartment');

    if (tableBody) tableBody.innerHTML = "";
    if (mobileCardsContainer) mobileCardsContainer.innerHTML = "";

    results.forEach((course, index) => {
        const desktopRow = `
            <tr>
                <td>${index + 1}</td>
                <td>${course.course_name}</td>
                <td>${course.credit_hours}</td>
                <td class="grade-badge">${course.grade}</td>
            </tr>
        `;
        if (tableBody) tableBody.insertAdjacentHTML('beforeend', desktopRow);

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

    const firstRow = results[0];
    const studentName = firstRow?.student_name || "Student";
    
    if (nameHeader) nameHeader.innerText = `${studentName} (${idNumber})`;
    if (gpaBox) gpaBox.innerText = gpa?.gpa || "0.00";

    if (semesterBox) semesterBox.innerText = firstRow?.semester || "N/A";
    if (schoolBox) schoolBox.innerText = firstRow?.school_name || "N/A";
    if (departmentBox) departmentBox.innerText = firstRow?.department_name || "N/A";

    if (resultsSection) {
        resultsSection.style.display = "block";
        resultsSection.classList.add('active');
    }
}
async function loadAnnouncements() {
    const container = document.getElementById('announcementList');
    if (!container) return;

    // STEP 1: Render Styled Loading Card
    container.innerHTML = `
        <div class="announcement-loading" style="
            text-align: center; 
            padding: 35px 20px; 
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            border: 1px solid #eef2f5;
        ">
            <div class="loader-spinner" style="
                width: 40px;
                height: 40px;
                border: 4px solid #e0e6ed;
                border-top: 4px solid #1a2a6c;
                border-radius: 50%;
                animation: spin 0.9s linear infinite;
                margin: 0 auto 14px auto;
            "></div>
            <p style="font-size: 1rem; font-weight: 700; margin: 0 0 4px 0; color: #1a2a6c;">Loading announcements...</p>
            <span style="font-size: 0.82rem; color: #666;">Connecting to server...</span>
        </div>
    `;

    try {
        const response = await fetch(`${API_BASE_URL}/student/news?_t=${Date.now()}`, {
            cache: 'no-store'
        });
        
        if (!response.ok) {
            throw new Error(`Server status: ${response.status}`);
        }

        const data = await response.json();
        const newsArray = data.message;

        // STEP 2: Handle Empty State
        if (!Array.isArray(newsArray) || newsArray.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding: 25px; background: white; border-radius: 12px; color:#666;">
                    No active announcements at this time.
                </div>
            `;
            return;
        }

        const displayArray = newsArray.toReversed ? newsArray.toReversed() : [...newsArray].reverse();

        // STEP 3: Render News Cards
        container.innerHTML = displayArray.map(post => `
            <div class="announcement-card" style="
                background: white; 
                padding: 20px; 
                border-radius: 12px; 
                margin-bottom: 15px; 
                border-left: 6px solid #1a2a6c; 
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            ">
                <div class="announcement-title" style="color: #1a2a6c; font-size: 1.25rem; font-weight: 800; margin-bottom: 8px;">
                    ${post.title}
                </div>
                <div class="announcement-body" style="color: #444; line-height: 1.6;">
                    ${post.message}
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error("News Fetch Error:", error);
        container.innerHTML = `
            <div style="text-align:center; padding: 25px; background: white; border-radius: 12px; color:#d63031;">
                <p style="margin-bottom: 10px; font-weight: 600;">Unable to load news updates.</p>
                <button onclick="loadAnnouncements()" style="
                    background: #1a2a6c;
                    color: white;
                    border: none;
                    padding: 8px 18px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.85rem;
                    font-weight: 600;
                ">Retry</button>
            </div>
        `;
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', loadAnnouncements);

// 8. Contact Form School Loader
document.addEventListener('DOMContentLoaded', () => {
    populateSchools();
});

async function populateSchools() {
    const schoolSelect = document.getElementById('contactSchoolSelect');
    if (!schoolSelect) return;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/reload-schools`);
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

// 9. Contact Ticket Submission
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
    if (responseEl) responseEl.innerText = "";

    try {
        const [response] = await Promise.all([
            fetch(`${API_BASE_URL}/student/submit-ticket`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ticketData)
            }),
            delay(2000)
        ]);

        const result = await response.json();

        if (response.ok) {
            if (responseEl) {
                responseEl.innerText = "Ticket submitted successfully!";
                responseEl.style.color = "#28a745";
            }
            this.reset();
        } else {
            if (responseEl) {
                responseEl.innerText = result.error || "Submission failed.";
                responseEl.style.color = "#dc3545";
            }
        }
    } catch (err) {
        if (responseEl) {
            responseEl.innerText = "Server connection failed.";
            responseEl.style.color = "#dc3545";
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Submit Ticket";

        ticketTimer = setTimeout(() => {
            if (responseEl) responseEl.innerText = "";
        }, 4000);
    }
});