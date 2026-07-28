// Centralized API Base URL
import 'dotenv/config';
const API_BASE_URL = process.env.API_BASE_URL;


const announcementForm = document.getElementById('announcementForm');
const Title = document.getElementById('annTitle');
const Body = document.getElementById("annBody");
const annStatus = document.getElementById("annStatus");
const schoolName = document.getElementById('schoolName');

// Retrieve dynamic parameters saved during authentication
const savedName = sessionStorage.getItem('schoolName');
const savedCode = sessionStorage.getItem('schoolCode');
if (schoolName) schoolName.innerHTML = savedName;

// REUSABLE HELPER: Builds standard security headers with the JWT token
function getAuthHeaders() {
    const token = sessionStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

async function renderMessages() {
    const container = document.getElementById('adminTicketList');

    // Helper function to handle session eviction and clean redirection UI
    const handleSessionEviction = () => {
        container.innerHTML = `
        <div style="text-align:center; padding:40px; color:var(--danger);">
            <p style="font-size: 1.1rem; font-weight: 600;">⚠️ Session expired. Redirecting to login page...</p>
        </div>`;
        sessionStorage.clear();
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    };

    // 1. Initial local guard check on load
    if (!savedCode || !sessionStorage.getItem('token')) {
        handleSessionEviction();
        return; 
    }

    const params = new URLSearchParams({ school_code: savedCode });

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/messages?${params.toString()}`, {
            method: 'GET',
            headers: getAuthHeaders() 
        });
        
        // 2. Intercept a backend token expiration (401 Unauthorized / 403 Forbidden)
        if (response.status === 401 || response.status === 403) {
            handleSessionEviction();
            return;
        }

        const data = await response.json();

        if (response.ok) {
            const targetArray = (data.messages && data.messages.data) || data.data || data.messages || data;

            if (!Array.isArray(targetArray) || targetArray.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center; padding:40px; color:var(--text-light);">
                        <p style="font-size: 1.1rem;">✨ No pending issues for ${savedCode}</p>
                    </div>`;
                return;
            }

            let html = "";
            targetArray.forEach(({ student_id, message, created_at, message_id }) => {
                const ticketDate = new Date(created_at);
                const displayDate = ticketDate.toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric'
                });

                html += `
                    <div class="ticket-item">
                        <div class="ticket-meta">
                            <span class="student-id">${student_id}</span>
                            <div class="ticket-actions">
                                <span class="date">${displayDate}</span>
                                <button class="delete-btn" onclick="deleteMessage(${message_id})">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <p class="ticket-message">${message}</p>
                    </div>`;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = `<p style="text-align:center; padding:20px;">${data.message || data.error || 'Server Error'}</p>`;
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        container.innerHTML = `<p style="text-align:center; padding:20px; color:red;">Connection Error: Unable to connect to server.</p>`;
    }
}

// Execute on initial layout paint
renderMessages();
window.renderMessages = renderMessages;

// 2. DELETE MESSAGE LOGIC (DELETE)
async function deleteMessage(id) {
    if (!confirm("Are you sure you want to remove this student issue?")) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/messages/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        const result = await response.json();

        if (response.ok) {
            renderMessages(); // Refresh UI instantly
        } else {
            alert(result.message || "Could not delete. Check access permissions.");
        }
    } catch (error) {
        console.error("Delete error:", error);
        alert("Server is offline. Cannot delete.");
    }
}
window.deleteMessage = deleteMessage;

// 3. POST ANNOUNCEMENT FORM SUBMISSION (CREATE)
if (announcementForm) {
    announcementForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const payload = {
            Tilte: Title.value, // Retained your spelling key layout 'Tilte' to match your controller expectations
            Body: Body.value
        };

        await postAnnouncement(payload);
    });
}

async function postAnnouncement(payload) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/makePost`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            annStatus.style.color = "green";
            annStatus.innerHTML = "Success: " + (result.message || "Post submitted!");
            announcementForm.reset();

            setTimeout(() => { annStatus.innerHTML = ""; }, 3000);
        } else {
            annStatus.style.color = "red";
            annStatus.innerHTML = `Error: ${result.message || result.error || 'Server rejected request'}`;
        }
    } catch (error) {
        console.error("Network error:", error);
        annStatus.style.color = "red";
        annStatus.innerHTML = "Could not connect to server.";
    }
}
