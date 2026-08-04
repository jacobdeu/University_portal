// Centralized API Base URL
// 1. Dynamic Base URL Configuration (Browser Safe)
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api'
    : 'https://university-portal-mmuf.onrender.com/api';



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
let lastFetchedDataString = ""; // Cache raw data to detect changes

async function renderMessages(isSilent = false) {
    const container = document.getElementById('adminTicketList');
    if (!container) return;

    // Helper function to handle session eviction
    const handleSessionEviction = () => {
        container.innerHTML = `
        <div style="text-align:center; padding:40px; color:var(--danger, #e63946);">
            <p style="font-size: 1.1rem; font-weight: 600;">⚠️ Session expired. Redirecting to login page...</p>
        </div>`;
        sessionStorage.clear();
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    };

    if (typeof savedCode === 'undefined' || !savedCode || !sessionStorage.getItem('token')) {
        handleSessionEviction();
        return; 
    }

    if (!document.getElementById('msg-spin-keyframes')) {
        const style = document.createElement('style');
        style.id = 'msg-spin-keyframes';
        style.textContent = `
            @keyframes msgSpin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    // ONLY show spinner if container is completely empty AND it's an initial explicit load
    if (!isSilent && container.children.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-light, #666);">
                <div style="
                    width: 28px;
                    height: 28px;
                    border: 3px solid rgba(0, 0, 0, 0.1);
                    border-top: 3px solid var(--primary, #007bff);
                    border-radius: 50%;
                    animation: msgSpin 0.8s linear infinite;
                    margin: 0 auto 12px auto;
                "></div>
                <p style="font-size: 0.95rem; font-weight: 500;">Loading messages...</p>
            </div>
        `;
    }

    const params = new URLSearchParams({ school_code: savedCode });

    try {
        const response = await fetch(`${API_BASE_URL}/admin/messages?${params.toString()}`, {
            method: 'GET',
            headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : {} 
        });
        
        if (response.status === 401 || response.status === 403) {
            handleSessionEviction();
            return;
        }

        const data = await response.json();

        if (response.ok) {
            const targetArray = (data.messages && data.messages.data) || data.data || data.messages || data;

            if (!Array.isArray(targetArray) || targetArray.length === 0) {
                lastFetchedDataString = "";
                container.innerHTML = `
                    <div style="text-align:center; padding:40px; color:var(--text-light, #666);">
                        <p style="font-size: 1.1rem;">✨ No pending issues for ${savedCode}</p>
                    </div>`;
                return;
            }

            // 1. Serialize target array to compare data directly
            const currentDataString = JSON.stringify(targetArray);

            // 2. IF DATA IS IDENTICAL, DO NOTHING! (Prevents any redraw/spin)
            if (currentDataString === lastFetchedDataString) {
                return; 
            }

            // Update cache string
            lastFetchedDataString = currentDataString;

            // 3. Render HTML only when data ACTUALLY changes
            let html = "";
            targetArray.forEach(({ student_id, message, created_at, message_id }) => {
                const ticketDate = new Date(created_at);
                const displayDate = ticketDate.toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric'
                });

                html += `
                    <div class="ticket-item" data-id="${message_id}">
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
        }
    } catch (error) {
        console.error("Fetch Error:", error);
    }
}

// Initial paint
renderMessages(false);
window.renderMessages = renderMessages;

// Background polling (every 5 seconds)
setInterval(() => {
    renderMessages(true);
}, 5000);

// 2. DELETE MESSAGE LOGIC (DELETE)
async function deleteMessage(id) {
    if (!confirm("Are you sure you want to remove this student issue?")) return;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/messages/${id}`, {
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
            Tilte: Title ? Title.value : '', 
            Body: Body ? Body.value : ''
        };

        await postAnnouncement(payload);
    });
}

async function postAnnouncement(payload) {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/makePost`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            if (annStatus) {
                annStatus.style.color = "green";
                annStatus.innerHTML = "Success: " + (result.message || "Post submitted!");
            }
            if (announcementForm) announcementForm.reset();

            setTimeout(() => { if (annStatus) annStatus.innerHTML = ""; }, 3000);
        } else {
            if (annStatus) {
                annStatus.style.color = "red";
                annStatus.innerHTML = `Error: ${result.message || result.error || 'Server rejected request'}`;
            }
        }
    } catch (error) {
        console.error("Network error:", error);
        if (annStatus) {
            annStatus.style.color = "red";
            annStatus.innerHTML = "Could not connect to server.";
        }
    }
}