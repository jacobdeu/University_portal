import { getStudentResult, getStudentGPA, saveStudentMessage, getAnnouncements } from '../models/database.js';

export const getResult = async (req, res) => {
    const { id, school, semester } = req.query;

    if (!id || !school || !semester) {
        return res.status(400).json({ message: "Please provide all required parameters." });
    }

    try {
        const dbResult = await getStudentResult(id, school, semester);

        if (!dbResult.success) { 
            if (dbResult.reason === 'BAD_FORMAT') {
                return res.status(400).json({ message: "Invalid ID format. Expected: YY-CODE-NNNN" });
            }
            if (dbResult.reason === 'INVALID_SCHOOL') {
                return res.status(404).json({ message: "The selected school does not exist." });
            }
            if (dbResult.reason === 'MISMATCHED_SCHOOL') {
                return res.status(400).json({ message: "Your index number doesn't match the selected school." });
            }
            if (dbResult.reason === 'STUDENT_NOT_FOUND') {
                return res.status(404).json({ message: "The Student ID does not exist." });
            }
            return res.status(500).json({ message: "Server processing error. Please try again later." });
        }

        if (dbResult.data.length === 0) {
            return res.status(404).json({ message: "No grades have been uploaded for this semester yet." });
        }

        return res.status(200).json(dbResult.data);

    } catch (error) {
        console.error("---------------- CONTROLLER ERROR ----------------");
        console.error("Message:", error.message);
        console.error("--------------------------------------------------");
        return res.status(500).json({ message: "Internal server processing error. Please try again later." });
    }
};

export const getGPA = async (req, res) => {
    const { id, semester } = req.query;
    try {
        const gpaData = await getStudentGPA(id, semester);
        if (!gpaData) return res.status(404).json({ message: "GPA data not found for this semester." });
        res.status(200).json(gpaData);
    } catch (error) {
        console.error("GPA Error:", error);
        res.status(500).json({ message: "Database Error: GPA Calculation failed." });
    }
};
export const submitTicket = async (req, res) => {
    const { studentId, message, schoolName } = req.body;

    if (!studentId || !message || !schoolName) {
        return res.status(400).json({ error: "Missing required fields." });
    }

    const idParts = studentId.split("-");
    if (idParts.length !== 3) {
        return res.status(400).json({ error: "Invalid Student ID format. Expected: YY-CODE-NNNN" });
    }
 
    const schoolCodeFromId = idParts[1]; 

    try {
        const dbResult = await saveStudentMessage(studentId, message, schoolName, schoolCodeFromId);

        if (!dbResult.success) {
            if (dbResult.reason === 'INVALID_SCHOOL_NAME') {
                return res.status(400).json({ error: "The selected school name is invalid." });
            }
            if (dbResult.reason === 'SCHOOL_MISMATCH') {
                return res.status(400).json({ error: "Your index number doesn't match the school you selected." });
            }
            if (dbResult.reason === 'INVALID_STUDENT') {
                return res.status(404).json({ error: "Student ID not found in our records." });
            }
            return res.status(400).json({ error: "Validation failed." });
        }

        return res.status(201).json({ 
            success: true, 
            message: "Ticket submitted successfully!", 
            ticketId: dbResult.ticketId 
        });

    } catch (error) {
        console.error("Error executing submitTicket:", error);
        return res.status(500).json({ error: "Internal server error. Please try again later." });
    }
};

export const getNews = async (req, res) => {
    try {
        const messages = await getAnnouncements();
        res.status(200).json({ success: true, message: messages });
    } catch (error) {
        res.status(500).json({ success: false, error: "Internal server error." });
    }
};