import mysql from 'mysql2'
import 'dotenv/config'
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
export async function getStudentResult(id, schoolNameInput, semester) {
    
    try {
        // 1. Fetch the official school_code from the schoolsName table based on user input
        const schoolQuery = 'SELECT school_code FROM schoolsName WHERE school_name = ?';
        const [schools] = await pool.query(schoolQuery, [schoolNameInput]);

        if (schools.length === 0) {
            return { success: false, reason: 'INVALID_SCHOOL', status: 404 };
        }

        const dbSchoolCode = schools[0].school_code;

        // 2. Extract and validate incoming index parts
        const idParts = id.split("-");
        if (idParts.length !== 3) {
            return { success: false, reason: 'BAD_FORMAT', status: 400 };
        }
        const extractedCode = idParts[1].toUpperCase();

        // 3. Fetch index_format AND department_name rules from schoolDepartments
        const departmentQuery = 'SELECT index_format, department_name FROM schoolDepartments WHERE school_code = ?';
        const [departments] = await pool.query(departmentQuery, [dbSchoolCode]);

        // Find the specific department object that matches the student's ID structure
        const matchedDepartment = departments.find(dept => {
            if (!dept.index_format) return false;

            const formatParts = dept.index_format.split("-");
            if (formatParts.length !== 3) return false;

            const targetCodeFromDb = formatParts[1];
            return targetCodeFromDb.trim().toUpperCase() === extractedCode;
        });

        // Trigger the mismatch error if no layout match is found
        if (!matchedDepartment) {
            return { success: false, reason: 'MISMATCHED_SCHOOL', status: 400 };
        }

        const assignedDepartmentName = matchedDepartment.department_name;

        // 4. Check if the student exists in the database records
        const studentCheckQuery = 'SELECT student_id FROM studentNames WHERE student_id = ?';
        const [studentExists] = await pool.query(studentCheckQuery, [id]);

        if (studentExists.length === 0) {
            return { success: false, reason: 'STUDENT_NOT_FOUND', status: 404 };
        }

        // 5. Fetch the actual marks - REMOVED sm.marks to align with your schema
        const query = `
            SELECT 
                sn.student_name, 
                sc.course_id AS course_code,     
                sc.course_name, 
                sc.credit_hours, 
                sm.grade, 
                sm.grade_point
            FROM schoolMarks sm
            JOIN studentNames sn ON sm.student_id = sn.student_id
            JOIN schoolCourses sc ON sm.course_id = sc.course_id
            JOIN schoolsName s ON sm.school_code = s.school_code
            WHERE sm.student_id = ? 
              AND s.school_name = ? 
              AND sm.semester = ?
        `;
        const [rows] = await pool.query(query, [id, schoolNameInput, semester]);

        // Map over the results to inject school, department, and semester metadata into each row object
        const finalUiData = rows.map(row => ({
            ...row,
            school_name: schoolNameInput,
            department_name: assignedDepartmentName,
            semester: semester
        }));

        return {
            success: true,
            data: finalUiData
        };

    } catch (error) {
        console.error("---------------- DB ERROR ----------------");
        console.error("Message:", error.message);
        console.error("-------------------------------------------");
        return { success: false, reason: 'SERVER_ERROR', status: 500 };
    }
}

export async function getStudentGPA(student_id, semester) {
    const query = `
        SELECT 
            s.student_id,
            s.student_name,
            ROUND(SUM(m.grade_point * c.credit_hours) / SUM(c.credit_hours), 2) AS gpa
        FROM studentNames s
        JOIN schoolMarks m ON s.student_id = m.student_id
        JOIN schoolCourses c ON m.course_id = c.course_id
        WHERE s.student_id = ? AND m.semester = ?
        GROUP BY s.student_id, s.student_name;
    `;

    try {
        const [rows] = await pool.query(query, [student_id, semester]);

        if (rows.length === 0) {
            return { gpa: "0.00" }; // Return a default if no marks exist
        }

        return rows[0];
    } catch (error) {
        console.error("GPA Calculation Error:", error);
        throw error;
    }
}
export async function saveStudentMessage(studentId, message, schoolName, schoolCodeFromId) {
    try {
        // 1. Get actualSchoolCode from the schoolsName table
        const schoolQuery = 'SELECT school_code FROM schoolsName WHERE school_name = ? LIMIT 1';
        const [schools] = await pool.execute(schoolQuery, [schoolName]);

        if (schools.length === 0) {
            return { success: false, reason: 'INVALID_SCHOOL_NAME' };
        }

        const actualSchoolCode = schools[0].school_code;

        // 2. Fetch all index formats for this school from schoolDepartments
        const departmentQuery = 'SELECT index_format FROM schoolDepartments WHERE school_code = ?';
        const [departments] = await pool.execute(departmentQuery, [actualSchoolCode]);

        // 3. Split the database index_format and grab [1] to verify the match
        const isValidFormat = departments.some(dept => {
            if (!dept.index_format) return false;

            const formatParts = dept.index_format.split("-");
            if (formatParts.length !== 3) return false;

            const targetCodeFromDb = formatParts[1];
            return targetCodeFromDb.trim().toUpperCase() === schoolCodeFromId.toUpperCase();
        });

        if (!isValidFormat) {
            return { success: false, reason: 'SCHOOL_MISMATCH' };
        }

        // 4. Verify the Student ID exists in your main records
        const studentCheck = 'SELECT student_id FROM studentNames WHERE student_id = ? LIMIT 1';
        const [students] = await pool.execute(studentCheck, [studentId]);

        if (students.length === 0) {
            return { success: false, reason: 'INVALID_STUDENT' };
        }

        // 5. Insert the verified message into schoolMessages
        const insertQuery = `
            INSERT INTO schoolMessages (school_code, student_id, message, created_at) 
            VALUES (?, ?, ?, NOW())
        `;
        const [result] = await pool.execute(insertQuery, [actualSchoolCode, studentId, message]);

        return { success: true, ticketId: result.insertId };

    } catch (error) {
        console.error("Database saveStudentMessage execution failed:", error);
        throw error;
    }
}
export async function getStudentMessages(schoolCode) {
    // A placeholder (?) is used to prevent SQL Injection
    const query = 'SELECT * FROM schoolMessages WHERE school_code = ? ORDER BY created_at DESC';

    try {
        // Pass schoolCode in the second argument array to replace the '?'
        const [rows] = await pool.execute(query, [schoolCode]);

        // Return a successful result object containing the database rows
        return {
            success: true,
            data: rows // This will be your array of messages or an empty array []
        };
    } catch (error) {
        return {
            success: false,
            error: "Database operation failed",
            data: []

        };
    }
}


//get Announcement
export async function getAnnouncements() {
    const query = 'SELECT * FROM Announcement';
    const [rows] = await pool.execute(query);

    return rows;
}

// post Announcement
export async function postAnnouncement(title, message) {
    // Added 'VALUES (?, ?)' to the query
    const query = 'INSERT INTO Announcement (title, message) VALUES (?, ?)';

    // Ensure 'pool' is defined in this scope or imported
    const [result] = await pool.execute(query, [title, message]);

    // For INSERT operations, 'result' usually contains metadata (like insertId) 
    // rather than the rows themselves.
    return result;
}

// Function to delete a specific student message/issue 
export async function deleteStudentMessage(id) {
    // We use a parameterized query (?) to prevent SQL Injection
    const query = 'DELETE FROM schoolMessages WHERE message_id = ?';

    try {
        const [result] = await pool.execute(query, [id]);

        // result.affectedRows will be 1 if something was deleted, 0 if the ID didn't exist
        return result.affectedRows > 0;
    } catch (error) {
        console.error("Database Delete Error:", error);
        throw error; // Pass the error up to the router to handle the 500 status
    }
}
export async function registerSchool({ schoolId, schoolName, role, accessKey }) {

    const saltRounds = 10;

    // Hash the password
    const hashedPassword = await bcrypt.hash(accessKey, saltRounds);

    // Explicitly naming columns prevents order errors
    const query = `
        INSERT INTO schoolsName (school_code, school_name, school_access_code, role) 
        VALUES (?, ?, ?, ?)
    `;

    // Order: [code, name, hashed_pass, role]
    return pool.execute(query, [schoolId, schoolName, hashedPassword, role]);
}

export async function getAllSchools() {
    try {
        // Added 'role' to the SELECT list
        const [rows] = await pool.execute(
            "SELECT school_code, school_name, school_access_code, role FROM schoolsName ORDER BY school_name ASC"
        );
        return rows;
    } catch (error) {
        console.error("Error fetching schools:", error.message);
        throw error;
    }
}

export async function updateSchool(oldSchoolCode, schoolData) {
    // 1. Destructure including the new 'role' key from the frontend
    const { schoolName, newCode, accessKey, role } = schoolData;

    try {
        // 2. Safety/Formatting Checks
        const finalCode = (newCode || oldSchoolCode).toUpperCase();
        const finalName = schoolName || "Unnamed School";
        const finalRole = role || "school_admin"; // Default to small admin if not provided

        // SCENARIO A: Password is being updated
        if (accessKey && accessKey.trim() !== "") {
            const hashedPassword = await bcrypt.hash(accessKey, 10);

            // We explicitly update code, name, password, and role
            const sql = `
                UPDATE schoolsName 
                SET school_code = ?, 
                    school_name = ?, 
                    school_access_code = ?, 
                    role = ? 
                WHERE school_code = ?`;

            const [result] = await pool.execute(sql, [
                finalCode,
                finalName,
                hashedPassword,
                finalRole,
                oldSchoolCode
            ]);
            return result;
        }

        // SCENARIO B: No password change (Update code, name, and role only)
        const sql = `
            UPDATE schoolsName 
            SET school_code = ?, 
                school_name = ?, 
                role = ? 
            WHERE school_code = ?`;

        const [result] = await pool.execute(sql, [
            finalCode,
            finalName,
            finalRole,
            oldSchoolCode
        ]);
        return result;

    } catch (error) {
        console.error("DB Update Error:", error);
        throw error;
    }
}
export async function deleteSchoolFromDB(schoolCode) {
    try {
        // Table: schoolsName | Primary Key: school_code
        const sql = `DELETE FROM schoolsName WHERE school_code = ?`;

        // pool.execute returns an array: [result, fields]
        const [result] = await pool.execute(sql, [schoolCode]);

        return result;
    } catch (error) {
        console.error("Database Delete Error:", error.message);
        throw error;
    }
}


export async function verifySchoolLogin(code, providedKey) {
    try {

        const query = "SELECT school_code, school_name, school_access_code, role FROM schoolsName WHERE school_code = ?";
        const [rows] = await pool.execute(query, [code.toUpperCase()]);

        if (rows.length === 0) return { authenticated: false };

        const school = rows[0];

        // Compare hashed password
        const isMatch = await bcrypt.compare(providedKey, school.school_access_code);

        if (isMatch) {
            delete school.school_access_code; // Security: remove hash
            return { authenticated: true, school }; // Now contains 'role'
        } else {
            return { authenticated: false };
        }
    } catch (error) {
        console.error("Database Login Error:", error);
        throw error;
    }
}
export async function addCourseToDB(courseData) {
    const {
        course_id,
        school_code,
        school_name,
        department,
        course_name,
        semester,
        credit_hours
    } = courseData;

    // INSERT IGNORE skips duplicates without throwing a database error
    const sql = `
        INSERT IGNORE INTO schoolCourses (course_id, school_code, school_name, department, course_name, semester, credit_hours) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        const [result] = await pool.execute(sql, [
            course_id ? course_id.trim() : course_id, // Trim trailing spaces
            school_code,
            school_name,
            department,
            course_name,
            semester,
            credit_hours
        ]);

        // If affectedRows is 0, MySQL skipped it because it was a duplicate
        if (result.affectedRows === 0) {
            console.warn(`[Skipped Duplicate]: Course ID '${course_id}' already exists.`);
            return { success: false, duplicate: true };
        }

        return { success: true, insertId: result.insertId };
    } catch (error) {
        console.error("Database Insert Error:", error);
        throw error;
    }
}
export async function getCoursesBySchool(schoolName, semester, department = null) {
    try {
        let query = `
            SELECT course_name, course_id
            FROM schoolCourses 
            WHERE school_name = ? AND semester = ?
        `;
        
        // Ensure values are never undefined
        const queryParams = [schoolName || null, semester || null];

        // Only append department filter if a valid department string exists
        if (department && department !== 'undefined' && department !== 'null') {
            query += ` AND department = ?`;
            queryParams.push(department);
        }

        const [rows] = await pool.execute(query, queryParams);
        return rows;
    } catch (error) {
        console.error("SQL Error in getCoursesBySchool:", error);
        throw error;
    }
}
export async function saveBulkMarks(marksArray) {
    
    
    const values = marksArray.map(({
        school_code,
        student_id,
        course_id,
        department,
        grade,
        grade_point,
        semester
    }) => [
        school_code,
        student_id,
        course_id,
        department,
        grade,
        grade_point,
        semester
    ]);

    // 2. Updated SQL Query including the department column
    const sql = `
        INSERT INTO schoolMarks 
        (school_code, student_id, course_id, department, grade, grade_point, semester) 
        VALUES ?
    `;

    try {
        const [result] = await pool.query(sql, [values]);
        return result;
    } catch (error) {
        console.error("Database Bulk Insert Error:", error);
        throw error;
    }
}

export async function addNewStudent(id, name, school) {

    const sql = `
        INSERT INTO studentNames (student_id, student_name, school_code) 
        VALUES (?, ?, ?)
    `;

    try {

        const [result] = await pool.execute(sql, [id, name, school]);
        return result;
    } catch (error) {

        throw error;
    }
}



export const insertDepartment = async (school_code, index_format, department_name) => {
    const [result] = await pool.query(
        `INSERT INTO schoolDepartments (school_code, index_format, department_name) 
         VALUES (?, ?, ?)`,
        [school_code, index_format, department_name]
    );
    return result;
};

export const fetchDepartmentsBySchool = async (school_code) => {
    const [rows] = await pool.query(
        `SELECT department_id, school_code, department_name, index_format, created_at
         FROM schoolDepartments
         WHERE school_code = ?
         ORDER BY created_at DESC`,
        [school_code]
    );
    return rows;
};