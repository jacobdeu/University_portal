import { 
    getStudentMessages, deleteStudentMessage, postAnnouncement, getAllSchools, 
    updateSchool, deleteSchoolFromDB, addCourseToDB, getCoursesBySchool, saveBulkMarks, addNewStudent ,insertDepartment, fetchDepartmentsBySchool 
} from '../models/database.js';

export const getTickets = async (req, res) => {
    const { school_code } = req.query;
    if (!school_code) return res.status(400).json({ success: false, error: "School code is required." });

    try {
        const messages = await getStudentMessages(school_code);
        res.status(200).json({ success: true, count: messages.length, messages });
    } catch (error) {
        res.status(500).json({ success: false, error: "Database connection failed." });
    }
};

export const deleteTicket = async (req, res) => {
    try {
        const isDeleted = await deleteStudentMessage(req.params.id);
        if (!isDeleted) return res.status(404).json({ success: false, message: "Message not found or already deleted." });
        res.status(200).json({ success: true, message: "Issue deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to delete message from database." });
    }
};

export const createPost = async (req, res) => {
    const { Tilte, Body } = req.body; // Keeping exact naming from database configuration schema
    if (!Tilte || !Body) return res.status(400).json({ error: "Missing title or body content." });

    try {
        const post = await postAnnouncement(Tilte, Body);
        res.status(201).json({ success: true, message: "Post submitted successfully!", postId: post.insertId });
    } catch (error) {
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
};

export const reloadSchools = async (req, res) => {
    try {
        const schools = await getAllSchools();
        res.status(200).json({ success: true, data: schools || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error occurred while fetching schools." });
    }
}; 

export const modifySchool = async (req, res) => {
    try {
        const { schoolName, newCode, accessKey, role } = req.body;
        const result = await updateSchool(req.params.id, { schoolName, newCode, accessKey, role });

        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "No changes made or school not found." });
        res.status(200).json({ success: true, message: "School updated successfully!" });
    } catch (error) {
        if (error.errno === 1062) return res.status(409).json({ success: false, message: "Conflict: Code already assigned." });
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const removeSchool = async (req, res) => {
    try {
        const result = await deleteSchoolFromDB(req.params.id);
        if (result.affectedRows > 0) return res.status(200).json({ success: true, message: "School deleted successfully" });
        res.status(404).json({ success: false, message: "School not found" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error during deletion" });
    }
};

export const addCourse = async (req, res) => {
    try {
        if (!req.body.course_id || !req.body.school_code) {
            return res.status(400).json({ error: "Missing required fields." });
        }
        const result = await addCourseToDB(req.body);
        
        res.status(201).json({ message: "Course added successfully!", insertedId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: "Internal server error adding course." });
    }
};

export const loadCourses = async (req, res) => {
    // Destructure with default fallback to null/empty string
    const { schoolName, semester, department = null } = req.query;

    if (!schoolName || !semester) {
        return res.status(400).json({ error: "Required parameters missing." });
    }

    try {
        const courses = await getCoursesBySchool(schoolName, semester, department);
        res.status(200).json(courses);
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const uploadMarks = async (req, res) => {
    try {
        if (!Array.isArray(req.body) || req.body.length === 0) {
            return res.status(400).json({ success: false, message: "No data provided" });
        }
        const result = await saveBulkMarks(req.body);
        res.json({ success: true, message: "Marks uploaded successfully", insertedCount: result.affectedRows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const addStudent = async (req, res) => {
    try {
        const { student_id, student_name, school_code } = req.body;
        if (!student_id || !student_name || !school_code) return res.status(400).json({ success: false, message: "All fields are required." });

        const result = await addNewStudent(student_id, student_name, school_code);
        res.status(201).json({ success: true, message: "Student registered successfully", data: result });
    } catch (error) {
        if (error.errno === 1062) return res.status(409).json({ success: false, message: "Error: This Student ID is already registered." });
        res.status(500).json({ success: false, message: "Internal Server Error: " + error.message });
    }
};


export const addDepartment = async (req, res) => {
    const { school_code, index_format, department_name } = req.body;

    if (!school_code || !index_format || !department_name) {
        return res.status(400).json({ success: false, error: 'All fields are required.' });
    }

    if (!/^YY-[A-Z]{2,10}-NNN$/.test(index_format)) {
        return res.status(400).json({ success: false, error: 'Index format must be like: YY-CYS-NNN or YY-MED-NNN' });
    }

    try {
        const result = await insertDepartment(school_code, index_format, department_name);
        return res.status(201).json({
            success: true,
            message: `Department "${department_name}" added successfully.`,
            department_id: result.insertId,
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, error: 'Department already exists for this school.' });
        }
        console.log('addDepartment error:', error);
        return res.status(500).json({ success: false, error: 'Database connection failed.' });
    }
}; 

export const getDepartments = async (req, res) => {
    const { school_code } = req.query;
 
    if (!school_code) {
        return res.status(400).json({ success: false, error: 'School code is required.' });
    }

    try {
        const departments = await fetchDepartmentsBySchool(school_code);
        
        return res.status(200).json({
            success: true,
            count: departments.length,
            departments,
        });
    } catch (error) {
        
        return res.status(500).json({ success: false, error: 'Database connection failed.' });
    }
};